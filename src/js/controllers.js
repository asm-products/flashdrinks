angular.module('app.controllers', [])

.controller('BarListCtrl', function($scope, Bars, $ionicLoading) {
  $scope.data = {
    searching:false
  };
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

.controller('BarShowCtrl', function($scope, $stateParams, Bars, bar, ref) {
  $scope.Bars = Bars;
  $scope.bar = bar; //in state.resolve, required for view title
  $scope.data = {
    text: '',
    show_rsvps: false
  }
  // clear notifications when they click into a bar
  var notifs = ref.users.child($scope.user.$id + '/notifs');
  notifs.child('/chats/bars/'+bar.id).remove();
  notifs.child('/rsvps/'+bar.id).remove();
})

.controller('InviteFriendsCtrl', function($scope, ContactsService, $ionicModal, ref, Friends){
  $scope.data = {
    //FIXME this isn't available if you start from bar-show for some reason
    selectedContacts : _.map($scope.user.friends, function(v,k){
      return Friends.get(k);
    })
  };
  $scope.pickContact = function() {
    ContactsService.pickContact().then(
      function(contact) {
        contact.selected = true;
        $scope.data.selectedContacts.push(contact);
      },
      function(failure) {
        //$scope.data.selectedContacts.push({phones:[{type:'work', value:'805-975-5236'}], displayName: "Contacts not available (sample user)", emails:[{type:'sample',value:'sample@user.com'}]});
        console.log("Bummer.  Failed to pick a contact");
      }
    );
  }

  $scope.sendInvites = function(contacts, bar){
    var phoneContacts = [];
    _.each(contacts, function(c){
      if (c.phones) {
        phoneContacts.push(c);
      } else {
        ref.users.child(c.$id+'/notifs/invites/'+bar.id).set(true);
      }
    })
    ContactsService.sendSMS(phoneContacts, bar);
    $scope.closeModal();
  }

  // ---- MODAL ----
  // TODO refactor this out somewhere, this is ugly. Boilerplate from Ionic samples, is all this really necessary?
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

.controller('FriendListCtrl', function($scope, Friends, ref) {
  //$scope.friends = Friends.all();
  $scope.chatId = Friends.chatId;
  $scope.approve = Friends.approve;
  ref.users.child($scope.user.$id+'/notifs/friends').remove(); // remove any new friend notfis on visiting friends
})

.controller('FriendShowCtrl', function($scope, $stateParams, Friends, $firebase, ref) {
  $scope.friend = Friends.get($stateParams.friendId);
  $scope.favorite = Friends.favorite;
  var chatId = Friends.chatId($scope.user.$id, $scope.friend.$id);
  $scope.data = {
    chats: $firebase(ref.chats.child(chatId)).$asArray()
  };
  $scope.chat = function(){
    Friends.chat($scope.user, $scope.friend, $scope.data.text);
    $scope.data.text = '';
  }
  ref.users.child($scope.user.$id + '/notifs/chats/friends/' + chatId).remove();
})

.controller('AccountCtrl', function($scope, Auth) {
  //$scope.user.$bindTo($scope, "fbUser");
  $scope.Auth = Auth;
})