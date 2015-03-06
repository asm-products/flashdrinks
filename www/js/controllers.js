angular.module('app.controllers', [])

.controller('BarListCtrl', function($scope, Bars, $ionicLoading) {
  $ionicLoading.show({template: 'Loading...'});
  $scope.refresh = function(force){
    Bars.all(force).then(function(bars){
      $scope.bars = bars;
      $scope.$broadcast('scroll.refreshComplete');
      $ionicLoading.hide();
    }, function(){
      debugger;
    });
  }
  $scope.refresh(false);
})

.controller('BarShowCtrl', function($scope, $stateParams, Bars, bar) {
  $scope.Bars = Bars;
  $scope.bar = bar; //in state.resolve, required for view title
  $scope.data = {
    text: ''
  }
  $scope.chat = function(){
    Bars.chat($scope.user, $scope.bar, $scope.data.text);
    $scope.data.text = '';
  }
})

.controller('InviteFriendsCtrl', function($scope, ContactsService, $ionicModal, $window){
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
        //$scope.data.selectedContacts.push({phones:[{type:'work', value:'805-975-5236'}], displayName: "Contacts not available (sample user)", emails:[{type:'sample',value:'sample@user.com'}]});
        console.log("Bummer.  Failed to pick a contact");
      }
    );
  }

  $scope.sendSMS = function(contacts, bar){
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
    console.log(message);
    $window.sms.send(nums, message, options, function(){
      console.log('message sent successfully');
      $scope.data.selectedContacts = [];
      $scope.modal.hide();
    }, function(err){
      console.log(err);
    });
  }

  // ---- MODAL ----
  $ionicModal.fromTemplateUrl('templates/friends/invite.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.modal = modal;
  });
  $scope.openModal = function() {
    $scope.modal.show();
  };
  $scope.closeModal = function() {
    $scope.modal.hide();
  };
  //Cleanup the modal when we're done with it!
  $scope.$on('$destroy', function() {
    $scope.modal.remove();
  });
  // Execute action on hide modal
  $scope.$on('modal.hidden', function() {
    // Execute action
  });
  // Execute action on remove modal
  $scope.$on('modal.removed', function() {
    // Execute action
  });
})

.controller('FriendListCtrl', function($scope, Friends) {
  //$scope.friends = Friends.all();
})

.controller('FriendShowCtrl', function($scope, $stateParams, Friends, $firebase, ref) {
  $scope.friend = Friends.get($stateParams.friendId);
  $scope.favorite = Friends.favorite;
  var chatId = Friends.chatId($scope.user.$id, $scope.friend.$id);
  $scope.data = {
    chats: $firebase(ref.chat.child(chatId)).$asArray()
  };
  $scope.chat = function(){
    Friends.chat($scope.user, $scope.friend, $scope.data.text);
    $scope.data.text = '';
  }

})

.controller('AccountCtrl', function($scope, Auth) {
  $scope.user.$bindTo($scope, "fbUser");
  $scope.Auth = Auth;
})