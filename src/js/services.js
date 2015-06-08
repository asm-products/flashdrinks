angular.module('app.services', [])

.factory('ref', function($window){
  var root = new $window.Firebase('<nconf:firebase:data>')
  var ref = {
    root: root,
    users: root.child('users'),
    bars: root.child('bars'),
    chats: root.child('chats')
  }
  return ref;

})

.factory('GMaps', function($q){
  var map;
  var service;
  var infowindow;

  return {
    search: function(lat, lng) {
      var deferred = $q.defer();
      var pyrmont = new google.maps.LatLng(lat, lng);
      map = new google.maps.Map(document.getElementById('map'), {
        center: pyrmont,
        zoom: 15
      });
      var request = {
        location: pyrmont,
        radius: '500',
        types: ['bar']
      };
      service = new google.maps.places.PlacesService(map);
      service.nearbySearch(request, function(results, status){
        if (status == google.maps.places.PlacesServiceStatus.OK) {
          deferred.resolve(results);
          //createMarker(results[i]);
        } else {
          deferred.reject(status);
        }
      });
      return deferred.promise;
    }
  }
})

.factory('Bars', function(GMaps, $q, ref, $firebase, Auth, $http, Friends, $rootScope, $cordovaGeolocation, CacheFactory, $ionicPlatform, Push) {
  var deferred, bars;

  CacheFactory('barsCache', {
    maxAge: 1 * 60 * 1000, // Items added to this cache expire after 1m
    cacheFlushInterval: 10 * 60 * 1000, // This cache will clear itself every 10m
    deleteOnExpire: 'aggressive' // Items will be deleted from this cache when they expire
  });

  var search = function(opts){
    if (opts.refresh) bars = [];
    if (opts.refresh || opts.offset) deferred = $q.defer();

    // TODO implement geo watcher http://ngcordova.com/docs/plugins/geolocation/
    //navigator.geolocation.getCurrentPosition = function(cb) {return cb({coords:{latitude:40.7788490, longitude:-111.8939440}})};
    $ionicPlatform.ready(function() {
      $cordovaGeolocation.getCurrentPosition({maximumAge: 300000, timeout: 10000}).then(function (position) {

        //cache: CacheFactory.get('barsCache')
        //offset:0
        GMaps.search(position.coords.latitude, position.coords.longitude).then(function (results) {
          bars = _.uniq(bars.concat(results), 'id');
          deferred.resolve(bars);
          _.each(results, function (bar) {
            bar.img_url = bar.photos && bar.photos[0].getUrl({maxWidth:100, maxHeight:100}); // fixme ????
            bar.chats = $firebase(ref.chats.child(bar.id)).$asArray();
            bar.sync = $firebase(ref.bars.child(bar.id)).$asObject();
            // If the last person to RSVP was before 4am, reset the RSVPs
            var lastIn = moment(bar.sync.lastIn);
            if (!lastIn.isSame(new Date, 'day') || lastIn.hour() < 4) {
              delete bar.sync.rsvps;
              bar.sync.count = 0;
              bar.sync.$save();
              Push.deleteTopic(bar.id);
            }
          })
        }).catch(deferred.reject);

      }, deferred.reject)
    })
  }

  return {
    all: function(refresh) {
      search({refresh:refresh});
      return deferred.promise;
    },
    get: function(barId) {
      return deferred.promise.then(function(bars){
        return _.find(bars, {id:barId});
      });
    },
    loadMore: function(refresh){
      search((refresh || !bars)? {refresh:true} : {offset:bars.length});
      return deferred.promise;
    },
    rsvp: function(bar){
      if (!Auth.loggedIn()) return $rootScope.$broadcast('fd:auth:error');
      // TODO use txns instead https://www.firebase.com/docs/web/guide/saving-data.html#section-transactions
      // TODO extend service for defaults https://www.firebase.com/docs/web/libraries/angular/guide/extending-services.html#section-firebaseobject
      _.defaults(bar.sync, {rsvps:{}, count:0});
      var user = Auth.getUser();
      bar.sync.rsvps[user.$id] ? delete bar.sync.rsvps[user.$id] : bar.sync.rsvps[user.$id] = true;
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
      Push.publish(bar.id);
    }
  }
})

.factory('Analytics' ,function($firebaseAuth, ref){
  ;(function(p,l,o,w,i){if(!p[i]){p.__asml=p.__asml||[];
    p.__asml.push(i);p[i]=function(){(p[i].q=p[i].q||[]).push(arguments)
    };p[i].q=p[i].q||[];n=l.createElement(o);g=l.getElementsByTagName(o)[0];n.async=1;
    n.src=w;g.parentNode.insertBefore(n,g)}}(window,document,"script","https://d1uxm17u44dmmr.cloudfront.net/1.0.0/asml.js","asml"));
  asml('create', '<nconf:asm_metrics>');

  var authObj = $firebaseAuth(ref.root);
  var uid = authObj.$getAuth() && authObj.$getAuth().uid;
  if (uid)
    asml('track', CryptoJS.MD5(uid).toString());
  else
    asml('track');

  return {};
})

.factory('Auth', function($q, ref, $firebase, $firebaseAuth, $rootScope, $ionicLoading){
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
      $ionicLoading.show({template: 'Authenticating...'});

      // App
      if (window.facebookConnectPlugin) {
        window.facebookConnectPlugin.login(['email', 'public_profile', 'user_friends'], function(status) {
          window.facebookConnectPlugin.getAccessToken(function(token) {
            // Authenticate with Facebook using an existing OAuth 2.0 access token
            ref.root.authWithOAuthToken("facebook", token, function(error) {
              $ionicLoading.hide();
              if (error) {
                alert('Firebase login failed!'+error);
                console.dir(error);
              }
            });
          }, function(error) {
            alert('Could not get access token'+error);
            console.dir(error);
          });
        }, function(error) {
          alert('An error occurred logging the user in'+error)
          console.dir(error);
        });

      // Website
      } else {
        $ionicLoading.hide();
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
      if (fid == uid) return alert("Cannot friend self.");
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
      var cid = friends.chatId(user.$id, friend.$id);
      $firebase(ref.chats.child(cid)).$asArray().$add({
        timestamp: Firebase.ServerValue.TIMESTAMP,
        text: text,
        uid: user.$id
      });
      Push.publish(cid);
    }
  }
  return friends;
})

.service("ContactsService", function($q, $window) {
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
      var message = "Come to the bar with me tonight! Deets at <nconf:firebase:site>/#/app/bars/"+bar.id;
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
  })

// SNS PushPlugin, see http://t.yc.sg/post/102663623041/amazon-sns-with-ionic-framework-part-1-android & http://ngcordova.com/docs/plugins/pushNotifications/
.service("Push", function($localStorage, $cordovaPush, $rootScope, $http, $ionicPopup, $state, Auth, $ionicPlatform) {
  var appVersion;

  $rootScope.$on('$cordovaPush:notificationReceived', function(event, notification) {
    switch( notification.event ) {
      case 'registered':
        if (notification.regid.length > 0) {
          console.info("Android Registration ID: " + notification.regid);

          //Your GCM push server needs to know the regID before it can push to this device here is where you might want to send it the regID for later use.
          var postData = {
            token: notification.regid,
            platform: "GCM"
          };

          $http.post("<nconf:server>/push/register", postData)
            .success(function(data, status, headers, config) {
              console.dir(data);
              $localStorage.endpointArn = data.EndpointArn;
              $localStorage.pushNotificationId = notification.regid;
              $localStorage.registeredAppVersion = appVersion;

              // TODO
              // 1) is this secure? storing arn publicly so we can send push to individual users
              // 2) store multiple arns: GCM, APNS: {arn: GCM:"", APNS:""}
              Auth.getUser().set({arn:data.EndpointArn});
            })
            .error(function(data, status, headers, config) {
              console.log(JSON.stringify(data));
            });
        }
        break;

      case 'message':
        if (notification.foreground) {
          $ionicPopup.confirm({
            title: notification.payload.title,
            template: notification.payload.message
          }).then(function(res) {
            if(res) $state.go(notification.payload.action);
          });
        } else {
          $state.go(notification.payload.action);
        }
        break;

      case 'error':
        console.dir(error);
        break;

      default:
        break;
    }
  });

  // Register app
  $ionicPlatform.ready(function() {
    // But register it later, it's expensive. Use webworker?
    window.setTimeout(function () {
      if (typeof cordova == 'undefined'|| !cordova.getAppVersion) return; // web
      cordova.getAppVersion(function (version) {
        appVersion = version;
        console.info("Version: " + version);
        var config = {
          android: {senderID: "<nconf:push:GCM>"}
        };
        var shouldRegister = !$localStorage.pushNotificationId || $localStorage.registeredAppVersion != version;
        if (shouldRegister) {
          if (device.platform == "Android") {
            $cordovaPush.register(config.android).then(function (result) {
              console.info('$cordovaPush.register succeeded. Result: ' + result);
            }, function (err) {
              console.info('$cordovaPush.register failed. Error: ' + err);
            });
          }
        }
      });
    }, 1000);
  });

  var snsBody = function(topic){
    return {
      token: $localStorage.pushNotificationId,
      EndpointArn: $localStorage.endpointArn,
      platform: 'GCM',
      topic: topic
    }
  }

  return {
    publish: function(topic){
      $http.post('<nconf:server>/push/publish', snsBody(topic));
    },
    //TODO unsubscribe

    deleteTopic: function(topic){
      $http.post('<nconf:server>/push/delete-topic', snsBody(topic));
    }
  }
})