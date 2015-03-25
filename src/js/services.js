angular.module('app.services', [])

.factory('ref', function($window, FBURL){
  var root = new $window.Firebase(FBURL)
  var ref = {
    root: root,
    users: root.child('users'),
    bars: root.child('bars'),
    chats: root.child('chats')
  }
  return ref;

})

.factory('Bars', function($q, ref, $firebase, Auth, $http, SERVER, Friends, $rootScope) {
  var deferred;
  var refreshBars = function(){
    deferred = $q.defer();
    //navigator.geolocation.getCurrentPosition = function(cb) {return cb({coords:{latitude:40.7788490, longitude:-111.8939440}})};
    navigator.geolocation.getCurrentPosition(function (position) {
      var params = {
        // See https://www.yelp.com/developers/documentation/v2/all_category_list. Parent category `nightlife` includes
        // too much, we exclude adultentertainment,coffeeshops,comedyclubs,countrydancehalls,dancerestaurants,fasil
        category_filter: 'bars,beergardens,danceclubs,jazzandblues,karaoke,musicvenues,pianobars,poolhalls',
        ll: position.coords.latitude + ',' + position.coords.longitude
      };
      // move yelp to custom server, due to oauth security creds requirement (see 6bb76dd)
      $http.get(SERVER+'/yelp-search', {params: params}).success(function(results){
        results = results.businesses;
        deferred.resolve(results);
        _.each(results, function (bar) {
          bar.chats = $firebase(ref.chats.child(bar.id)).$asArray();
          bar.sync = $firebase(ref.bars.child(bar.id)).$asObject();
          // If the last person to RSVP was before 4am, reset the RSVPs
          var lastIn = moment(bar.sync.lastIn);
          if (!lastIn.isSame(new Date, 'day') || lastIn.hour()<4)
            bar.sync.$remove('rsvps');
        })
      }).error(deferred.reject);

    }, deferred.reject, {maximumAge:300000, timeout:5000});
  }
  refreshBars();

  return {
    all: function(refresh) {
      if (refresh) refreshBars();
      return deferred.promise;
    },
    get: function(barId) {
      return deferred.promise.then(function(bars){
        return _.find(bars, {id:barId});
      });
    },
    rsvp: function(bar){
      if (!Auth.loggedIn()) return $rootScope.$broadcast('fd:auth:error');
      // TODO use txns instead https://www.firebase.com/docs/web/guide/saving-data.html#section-transactions
      // TODO extend service for defaults https://www.firebase.com/docs/web/libraries/angular/guide/extending-services.html#section-firebaseobject
      _.defaults(bar.sync, {rsvps:{}, count:0});
      var user = Auth.getUser();
      bar.sync.rsvps[user.$id] = !bar.sync.rsvps[user.$id];
      bar.sync.count += (bar.sync.rsvps[user.$id] ? 1 : -1);
      if (!bar.sync.count) delete bar.sync.count;
      // Used to later reset on the next day. Not using Firebase.ServerValue.TIMESTAMP since we want local time.
      bar.sync.lastIn = +new Date;
      bar.sync.$save().then(function(){
        _.each(bar.sync.rsvps, function(v,k){
          if (k==user.$id) return;
          ref.users.child(k+'/notifs/rsvps/'+bar.id).set(true);
        })
        _.each(user.friends, function(v,k){
          if (v==Friends.APPROVED)
            ref.users.child(k+'/notifs/rsvps/'+bar.id).set(true);
        })
      });
    }
  }
})

.factory('Analytics' ,function($firebaseAuth, ASM_METRICS, ref){
  ;(function(p,l,o,w,i){if(!p[i]){p.__asml=p.__asml||[];
    p.__asml.push(i);p[i]=function(){(p[i].q=p[i].q||[]).push(arguments)
    };p[i].q=p[i].q||[];n=l.createElement(o);g=l.getElementsByTagName(o)[0];n.async=1;
    n.src=w;g.parentNode.insertBefore(n,g)}}(window,document,"script","https://d1uxm17u44dmmr.cloudfront.net/1.0.0/asml.js","asml"));
  asml('create', ASM_METRICS);

  var authObj = $firebaseAuth(ref.root);
  var uid = authObj.$getAuth() && authObj.$getAuth().uid;
  if (uid)
    asml('track', CryptoJS.MD5(uid).toString());
  else
    asml('track');

  return {};
})

.factory('Auth', function($q, ref, $firebase, $firebaseAuth, $rootScope){
  var authObj = $firebaseAuth(ref.root);

  var user = {$id:'anon'};
  $rootScope.$on('fd:auth', function(evt, _user){
    user = _user;
  });

  // When we register a new user, save it to /users collection too. We need users
  authObj.$onAuth(function(authData) {
    if (authData) {
      console.log(authData);
      $rootScope.$broadcast('fd:auth', $firebase(ref.users.child(authData.uid)).$asObject());

      var authFields = _.pick(authData, ['uid', 'provider', 'facebook']);
      authFields.facebook = _.pick(authData.facebook, ['cachedUserProfile', 'displayName', 'email', 'id']);

      // FIXME https://www.firebase.com/docs/web/guide/user-auth.html#section-storing
      ref.users.child(authData.uid).update({
        picture: authData.facebook && authData.facebook.cachedUserProfile.picture.data.url || 'img/anon.png',
        name: authData.facebook && authData.facebook.displayName || authData.uid,
        provider: authData.provider
      })
      // store authData in auths collection. Don't need now, but may in case of "find friends" feature, listserve, etc.
      ref.root.child('auths/'+authData.uid).set(authFields);
    }
  });

  var Auth = {
    getUser: function(){
      return user;
    },
    loggedIn: function(){
      return user.$id !== 'anon';
    },
    logout: function(){
      authObj.$unauth();
      $rootScope.$broadcast('fd:auth', {$id:'anon'});

    },
    facebook: function(){
      // App
      if (window.facebookConnectPlugin) {
        window.facebookConnectPlugin.login(['email', 'public_profile', 'user_friends'], function(status) {
          window.facebookConnectPlugin.getAccessToken(function(token) {
            // Authenticate with Facebook using an existing OAuth 2.0 access token
            ref.root.authWithOAuthToken("facebook", token, function(error) {
              if (error) {
                alert('Firebase login failed!'+error);
                console.log('Firebase login failed!', error);
              }
            });
          }, function(error) {
            alert('Could not get access token'+error);
          });
        }, function(error) {
          alert('An error occurred logging the user in'+error)
        });
      // Website
      } else {
        authObj.$authWithOAuthPopup("facebook");
      }

    }
  }
  return Auth;
})

.factory('Friends', function($firebase, ref, Auth, $rootScope){
  var friends = {
    PENDING: 1,
    APPROVED: 0,
    DENIED: -1,

    all: function(){
      var u = Auth.getUser();
      return u.friends || {};
    },
    get: function(friendId){
      return $firebase(ref.users.child(friendId)).$asObject();
    },
    favorite: function(friend) {
      if (!Auth.loggedIn()) return $rootScope.$broadcast('fd:auth:error');
      var fid = friend.$id,
        uid = Auth.getUser().$id,
        request = friend.friends && friend.friends[uid];
      if (request === friends.DENIED || request === friends.PENDING)
        return alert("You already sent a friend request");
      if (angular.isDefined(friends.all()[fid])){
        if (!confirm('Remove friend?')) return;
        ref.users.child(uid+'/friends/'+fid).remove();
        ref.users.child(fid+'/friends/'+uid).remove();
      } else {
        ref.users.child(fid+'/friends/'+uid).set(friends.PENDING);
        ref.users.child(fid+'/notifs/friends').set(true);
      }
    },
    approve: function(friend, approval){
      if (!Auth.loggedIn()) return $rootScope.$broadcast('fd:auth:error');
      var fid = friend.$id,
        uid = Auth.getUser().$id;
      switch (approval) {
        case friends.APPROVED:
          ref.users.child(uid+'/friends/'+fid).set(friends.APPROVED);
          ref.users.child(fid+'/friends/'+uid).set(friends.APPROVED);
          break;
        case friends.DENIED:
          ref.users.child(uid+'/friends/'+fid).set(friends.DENIED);
          break;
      }
    },
    chatId: function(userId, friendId) {
      // the chatroom b/w these two users will be userId+friendId. To ensure it always comes out the same, sort the strings firsts
      var chatId = [userId, friendId].sort();
      return chatId[0]+chatId[1];
    },
    chat: function(user, friend, text){
      if (!Auth.loggedIn()) return $rootScope.$broadcast('fd:auth:error');
      $firebase(ref.chats.child( friends.chatId(user.$id, friend.$id) )).$asArray().$add({
        timestamp: Firebase.ServerValue.TIMESTAMP,
        text: text,
        uid: user.$id
      });
    }
  }
  return friends;
})

.service("ContactsService", ['$q', function($q, $window) {
    var formatContact = function(contact) {
      return {
        "displayName"   : contact.name.formatted || contact.name.givenName + " " + contact.name.familyName || "Mystery Person",
        "emails"        : contact.emails || [],
        "phones"        : contact.phoneNumbers || [],
        "photos"        : contact.photos || []
      };
    };

    var pickContact = function() {
      var deferred = $q.defer();
      if(navigator && navigator.contacts) {
        navigator.contacts.pickContact(function(contact){
          deferred.resolve( formatContact(contact) );
        });
      } else {
        deferred.reject("Bummer.  No contacts in desktop browser");
      }
      return deferred.promise;
    };

    var sendSMS = function(contacts, bar){
      if (_.size(contacts)<1) return;
      var nums = _.transform(contacts, function(m,v){
        if (v.phones[0]) m.push(v.phones[0].value);
      }, []);
      var options = {
        replaceLineBreaks: false, // true to replace \n by a new line, false by default
        android: {
          intent: 'INTENT'  // send SMS with the native android SMS messaging
          //intent: '' // send SMS without open any other app
        }
      };
      var message = "Come to the bar with me tonight! Deets at "+FBURL+"/#/tab/bars/"+bar.id;
      $window.sms.send(nums, message, options, function(){
        console.log('message sent successfully');
        $scope.data.selectedContacts = [];
        $scope.modal.hide();
      }, function(err){
        console.log(err);
      });
    }

    return {
      pickContact : pickContact,
      sendSMS: sendSMS
    };
  }])