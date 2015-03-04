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
  //$scope.friends = Friends.all();
})

.controller('FriendDetailCtrl', function($scope, $stateParams, Friends) {
  $scope.friend = Friends.get($stateParams.friendId);
  $scope.favorite = Friends.favorite;

})

.controller('AccountCtrl', function($scope, Auth) {
  $scope.user.$bindTo($scope, "fbUser");
  $scope.Auth = Auth;
})


.controller("AppCtrl", ['$scope', 'ContactsService', function($scope, ContactsService) {

    $scope.data = {
      selectedContacts : []
    };

    $scope.pickContact = function() {

      ContactsService.pickContact().then(
        function(contact) {
          $scope.data.selectedContacts.push(contact);
          console.log("Selected contacts=");
          console.log($scope.data.selectedContacts);

        },
        function(failure) {
          console.log("Bummer.  Failed to pick a contact");
        }
      );

    }


  }])
