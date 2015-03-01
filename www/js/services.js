angular.module('app.services', [])

.factory('ref', function($window){
  return new $window.Firebase("https://flashdrink.firebaseio.com");
})

.factory('Cache', function(DSCacheFactory){
  return DSCacheFactory('flash', {storageMode: 'localStorage'});
})

.factory('Position', function($q, Cache){
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
              bar.sync = $firebase(ref.child('events').child(bar.id)).$asObject();
            })
          }
        });
      })
    } else {
      deferred.resolve(bars);
      //TODO DRY:
      _.each(bars, function (bar) {
        bar.sync = $firebase(ref.child('events').child(bar.id)).$asObject();
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
      _.defaults(bar.sync, {members:{}, count:0});
      Auth.getUser().then(function(user){
        bar.sync.members[user.uid] = !bar.sync.members[user.uid];
        bar.sync.count += (bar.sync.members[user.uid] ? 1 : -1);
        if (!bar.sync.count) delete bar.sync.count;
        bar.sync.$save();
      })
    },
    chat: function(user, bar, text){
      $firebase(ref.child('events').child(bar.id).child('chat')).$asArray().$add({
        timestamp: Firebase.ServerValue.TIMESTAMP,
        text: text,
        user: user.uid
      });
    }
  }
})

.factory('Auth', function($q, ref, $firebaseAuth){
  var authObj = $firebaseAuth(ref);
  return {
    getUser: function(){
      var deferred = $q.defer();
      var authData = authObj.$getAuth();
      if (authData) {
        deferred.resolve(authData);
      } else {
        return authObj.$authAnonymously();
      }
      return deferred.promise;
    },
    facebook: function(){
      //if (authData.hasFacebook) resolve //TODO see above
      return authObj.$authWithOAuthPopup("facebook");
    }
  }
})

.factory('Friends', function(){
  var friends = {
    all: function(){
      return [
        {id: "1", name:"Lisa", picture:'img/anon.png'},
        {id: "2", name:"Ryan", picture:'img/anon.png'},
        {id: "3", name:"Lara", picture:'img/anon.png'},
        {id: "4", name:"Tyler", picture:'img/anon.png'},
      ];
    },
    get: function(friendId){
      return _.find(friends.all(), {id:friendId});
    }
  }
  return friends;
})