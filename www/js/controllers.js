angular.module('app.controllers', [])

.controller('BarsCtrl', function($scope, Bars) {
  Bars.all().then(function(bars){
    $scope.bars = bars;
  });
})

.controller('BarDetailCtrl', function($scope, $stateParams, Bars, bar) {
  $scope.Bars = Bars;
  $scope.bar = bar; //in state.resolve, required for view title
})

.controller('FriendsCtrl', function($scope, Friends) {
  $scope.friends = Friends.all();
})

.controller('FriendDetailCtrl', function($scope, $stateParams, Friends) {
  $scope.friend = Friends.get($stateParams.friendId);
})

.controller('AccountCtrl', function($scope, Auth) {
  $scope.Auth = Auth;
});
