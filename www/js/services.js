angular.module('starter.services', [])

.factory('ref', function($window){
  return new $window.Firebase("https://flashdrink.firebaseio.com");
})

.factory('Bars', function($q, ref, $firebase, Auth) {
  var deferred = $q.defer();

  //var sync = $firebase(ref);

  navigator.geolocation.getCurrentPosition(function(position) {
    var pyrmont = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    var request = {
      location: pyrmont,
      radius: '2500',
      types: ['bar']
    };
    var service = new google.maps.places.PlacesService(document.getElementById("map"));
    service.nearbySearch(request, function(results, status) {
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        deferred.resolve(results);
        _.each(results, function(bar){
          bar.sync = $firebase(ref.child('events').child(bar.id)).$asObject();
        })
      }
    });
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
    }
  }
})