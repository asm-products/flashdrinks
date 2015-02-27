angular.module('starter.services', [])

.factory('Bars', function($q, $firebase) {
  var deferred = $q.defer();

  var ref = new Firebase("https://flashdrink.firebaseio.com/events");
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
          bar.sync = $firebase(ref.child(bar.id)).$asObject();
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
      bar.sync.members["lefnire"] = !bar.sync.members["lefnire"];
      bar.sync.count += (bar.sync.members["lefnire"] ? 1 : -1);
      if (!bar.sync.count) delete bar.sync.count;
      bar.sync.$save();
    },
    chat: function(bar, text){
      $firebase(ref.child(bar.id).child('chat')).$asArray().$add({
        timestamp: Firebase.ServerValue.TIMESTAMP,
        text: text,
        user: "lefnire"
      });
    }
  }
})