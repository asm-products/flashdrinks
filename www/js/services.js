angular.module('app.services', [])

.factory('ref', function($window){
  var root = new $window.Firebase("https://flashdrink.firebaseio.com")
  var ref = {
    root: root,
    users: root.child('users'),
    bars: root.child('bars'),
    chats: root.child('chats'),
  }
  return ref;

})

.factory('Bars', function($q, ref, $firebase, Auth, $http) {
  var deferred;
  var refreshBars = function(){
    deferred = $q.defer();
    //navigator.geolocation.getCurrentPosition = function(cb) {return cb({coords:{latitude:40.7788490, longitude:-111.8939440}})};
    navigator.geolocation.getCurrentPosition(function (position) {
      var params = {
        category_filter: 'nightlife', //https://www.yelp.com/developers/documentation/v2/all_category_list
        ll: position.coords.latitude + ',' + position.coords.longitude
      };
      // move yelp to custom server, due to oauth security creds requirement (see 6bb76dd)
      $http.get('https://lefnire-server-misc.herokuapp.com/yelp-search', {params: params}).success(function(results){
        results = results.businesses;
        deferred.resolve(results);
        _.each(results, function (bar) {
          bar.sync = $firebase(ref.bars.child(bar.id)).$asObject();
          bar.chats = $firebase(ref.chats.child(bar.id)).$asArray();
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
    opt: function(bar){
      // TODO (1) use txns instead https://www.firebase.com/docs/web/guide/saving-data.html#section-transactions
      // TODO (2) denormalize https://www.firebase.com/docs/web/guide/structuring-data.html
      _.defaults(bar.sync, {members:{}, count:0});
      var user = Auth.getUser();
      bar.sync.members[user.$id] = !bar.sync.members[user.$id];
      bar.sync.count += (bar.sync.members[user.$id] ? 1 : -1);
      if (!bar.sync.count) delete bar.sync.count;
      bar.sync.$save();
      _.each(bar.sync.members, function(v,k){
        ref.users.child(k+'/notifs/members/'+bar.id).set(true);
      })
    }
  }
})

.factory('Auth', function($q, ref, $firebase, $firebaseAuth){
  var authObj = $firebaseAuth(ref.root);

  // When we register a new user, save it to /users collection too. We need users
  authObj.$onAuth(function(authData) {
    if (authData) {

      // Save the auth object to user, but only secure/needed fields
      var authFields = _.pick(authData, ['uid', 'provider', 'facebook']);
      authFields.facebook = _.pick(authData.facebook, ['cachedUserProfile', 'displayName', 'email', 'id']);

      $firebase(ref.users.child(authData.uid)).$update({
        picture: authData.facebook && authData.facebook.cachedUserProfile.picture.data.url || 'img/anon.png',
        name: authData.facebook && authData.facebook.displayName || authData.uid,
        auth: authFields
      })

      // Track users on auth, see https://assembly.com/flashdrinks/metrics/snippet
      ;(function(p,l,o,w,i){if(!p[i]){p.__asml=p.__asml||[];
        p.__asml.push(i);p[i]=function(){(p[i].q=p[i].q||[]).push(arguments)
        };p[i].q=p[i].q||[];n=l.createElement(o);g=l.getElementsByTagName(o)[0];n.async=1;
        n.src=w;g.parentNode.insertBefore(n,g)}}(window,document,"script","https://d1uxm17u44dmmr.cloudfront.net/1.0.0/asml.js","asml"));
      asml('create', '48247aa736075991c0a88e67e7fc9257175ebc77');
      if (authData.facebook) {
        asml('track', CryptoJS.MD5(authData.uid).toString());
      } else {
        asml('track');
      }
    }
  });

  var Auth = {
    _user: null,
    getUser: function(){
      if (Auth._user) return Auth._user;
      var authData = authObj.$getAuth();
      if (!authData) authData = authObj.$authAnonymously();
      Auth._user = $firebase(ref.users.child(authData.uid)).$asObject();
      return Auth._user;
    },
    facebook: function(){
      if (Auth._user.facebook) return Auth._user;
      var authData = authObj.$authWithOAuthPopup("facebook").then(function(){
        Auth._user = $firebase(ref.users.child(authData.uid)).$asObject();
      });
    }
  }
  return Auth;
})

.factory('Friends', function($firebase, ref, Auth){
  var friends = {
    all: function(){
      var u = Auth.getUser();
      if (!u.friends) {
        u.friends = {};
        u.$save()
      }
      return u.friends;
    },
    get: function(friendId){
      return $firebase(ref.users.child(friendId)).$asObject();
    },
    favorite: function(friend) {
      var fid = friend.$id,
        uid = Auth.getUser().$id;
      if (friends.all()[fid]){
        ref.users.child(uid).child('friends').child(fid).remove();
      } else {
        ref.users.child(uid).child('friends').child(fid).set(true);
      }
    },
    chatId: function(userId, friendId) {
      // the chatroom b/w these two users will be userId+friendId. To ensure it always comes out the same, sort the strings firsts
      var chatId = [userId, friendId].sort();
      return chatId[0]+chatId[1];
    },
    chat: function(user, friend, text){
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
      var message = "Come to the bar with me tonight! Deets at https://flashdrink.firebaseapp.com/#/tab/bars/"+bar.id;
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