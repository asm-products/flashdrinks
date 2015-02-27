angular.module('starter.controllers', [])

.controller('BarsCtrl', function($scope, Bars) {
  Bars.all().then(function(bars){
    $scope.bars = bars;
  });
})

.controller('CreateCtrl', function($scope) {
})

.controller('BarDetailCtrl', function($scope, $stateParams, Bars) {
  $scope.bar = Bars.get($stateParams.barId);
})

.controller('FriendsCtrl', function($scope, Friends) {
  $scope.friends = Friends.all();
})

.controller('FriendDetailCtrl', function($scope, $stateParams, Friends) {
  $scope.friend = Friends.get($stateParams.friendId);
})

.controller('AccountCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };
});
