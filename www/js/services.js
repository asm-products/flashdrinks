angular.module('app.services', [])

.factory('ref', function($window){
  var root = new $window.Firebase("https://flashdrink.firebaseio.com")
  var ref = {
    root: root,
    users: root.child('users'),
    bars: root.child('bars'),
    chat: root.child('chat')
  }
  return ref;

})

.factory('Cache', function(DSCacheFactory){
  return DSCacheFactory('flash', {storageMode: 'localStorage'});
})

.factory('Position', function($q, Cache){
  //TODO cached deferred up here
  var position = {
    _coords: null,
    getCoords: function(){
      var deferred = $q.defer();
      if (position._coords) {
        deferred.resolve(position._coords);
      } else {
        navigator.geolocation.getCurrentPosition(function(position) {
          deferred.resolve(position.coords);
          Cache.put('position',position.coords);
        }, function(err){
          deferred.reject(err);
        }, {maximumAge:300000});
      }
      return deferred.promise;
    },
    hasChanged: function(){
      var cached = Cache.get('position');
      var deferred = $q.defer();
      position.getCoords().then(function(coords){
        var decimalPlace = 4; // 4th decimal place, see http://gis.stackexchange.com/a/8674
        deferred.resolve(
          cached.latitude.toFixed(decimalPlace) != coords.latitude.toFixed(decimalPlace) ||
          cached.longitude.toFixed(decimalPlace) != coords.longitude.toFixed(decimalPlace)
        );
      });
      return deferred.promise;
    }
  }
  return position;
})

.factory('Bars', function($q, ref, $firebase, Auth, Cache, Position) {
  var deferred = $q.defer();
  var bars = Cache.get('bars');
  //var sync = $firebase(ref);

  Position.hasChanged().then(function(hasChanged){
    if (hasChanged || !bars) {
      Position.getCoords().then(function (coords) {
        var pyrmont = new google.maps.LatLng(coords.latitude, coords.longitude);
        var request = {
          location: pyrmont,
          radius: '2500',
          types: ['bar']
        };
        var service = new google.maps.places.PlacesService(document.getElementById("map"));
        service.nearbySearch(request, function (results, status) {
          if (status == google.maps.places.PlacesServiceStatus.OK) {
            deferred.resolve(results);
            Cache.put('bars', results);
            _.each(results, function (bar) {
              bar.sync = $firebase(ref.bars.child(bar.id)).$asObject();
            })
          }
        });
      })
    } else {
      deferred.resolve(bars);
      //TODO DRY:
      _.each(bars, function (bar) {
        bar.sync = $firebase(ref.bars.child(bar.id)).$asObject();
      })
    }
  });

  return {
    all: function() {
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
    },
    chat: function(user, bar, text){
      $firebase(ref.bars.child(bar.id).child('chat')).$asArray().$add({
        timestamp: Firebase.ServerValue.TIMESTAMP,
        text: text,
        uid: user.$id
      });
    }
  }
})

.factory('Auth', function($q, ref, $firebase, $firebaseAuth){
  var authObj = $firebaseAuth(ref.root);

  // When we register a new user, save it to /users collection too. We need users
  authObj.$onAuth(function(authData) {
    if (authData) {
      $firebase(ref.users.child(authData.uid)).$update({
        picture: authData.facebook && authData.facebook.cachedUserProfile.picture.data.url || 'img/anon.png',
        name: authData.facebook && authData.facebook.displayName || authData.uid,
        auth: authData
      })
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
    }
  }
  return friends;
})