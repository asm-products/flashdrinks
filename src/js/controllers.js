angular.module('app.controllers', [])

.controller('AppCtrl', function($scope, $rootScope, Auth, Friends, $ionicModal, Analytics){
  $scope.android = ionic.Platform.platform() == 'android';
  $scope.Friends = Friends;
  $scope.Auth = Auth;

  $rootScope.user = Auth.getUser();
  $rootScope.$on('fd:auth', function(evt, user){
    $rootScope.user = user;
    $scope.authModal && $scope.authModal.hide();
  })

  // ---- Authentication Modal ----
  $ionicModal.fromTemplateUrl('templates/account/modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.authModal = modal;
    $rootScope.$on('fd:auth:error', function(){modal.show()});
    Firebase.onError(function(err){
    //FIXME code below not catching errors (goo.gl/EpskTM), so I installed "firebase-on-error". Get below code working and remove firebase-on-error
    //ref.root.on("value", function(){}, function(err) {
      if (err.code=='PERMISSION_DENIED') {
        modal.show();
      }
    })
  })
  $scope.$on('$destroy', function() {
    $scope.authModal.remove();
  });
})

.controller('BarListCtrl', function($scope, Bars, $ionicLoading) {
  $scope.data = {
    searching:false
  };
  $scope.loadMore = function(refresh){
    Bars.loadMore(refresh).then(function(bars){
      $scope.bars = bars;
      $scope.$broadcast('scroll.infiniteScrollComplete');
      $scope.$broadcast('scroll.refreshComplete');
    })
  }
})

.controller('BarShowCtrl', function($scope, $stateParams, Bars, bar, ref, Auth) {
  $scope.Bars = Bars;
  $scope.bar = bar; //in state.resolve, required for view title
  $scope.data = {
    text: '',
    show_rsvps: false
  }
  // clear notifications when they click into a bar
  if (Auth.loggedIn()) {
    var notifs = ref.users.child($scope.user.$id + '/notifs');
    notifs.child('/chats/bars/'+bar.id).remove();
    notifs.child('/rsvps/'+bar.id).remove();
  }
})

.controller('InviteFriendsCtrl', function($scope, ContactsService, $ionicModal, ref, Friends, Auth, $rootScope){
  $scope.data = {
    //FIXME this isn't available if you start from bar-show for some reason
    selectedContacts : _.map($scope.user.friends, function(v,k){
      return Friends.get(k);
    })
  };
  $scope.pickContact = function() {
    if (!Auth.loggedIn()) return $rootScope.$broadcast('fd:auth:error');
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
    if (!Auth.loggedIn()) return $rootScope.$broadcast('fd:auth:error');
    var phoneContacts = [];
    _.each(contacts, function(c){
      if (c.phones) {
        phoneContacts.push(c);
      } else {
        ref.users.child(c.$id+'/notifs/invites/'+bar.id).set(true);
      }
    })
    ContactsService.sendSMS(phoneContacts, bar);
    $scope.modal.close();
  }

  // ---- MODAL ----
  $ionicModal.fromTemplateUrl('templates/friends/invite.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.modal = modal;
  });
  $scope.openModal = function(){
    if (!Auth.loggedIn()) return $rootScope.$broadcast('fd:auth:error');
    $scope.modal.show()
  }
  //Cleanup the modal when we're done with it!
  $scope.$on('$destroy', function() {
    $scope.modal.remove();
  });
})

.controller('FriendListCtrl', function($scope, Friends, ref, Auth) {
  //$scope.friends = Friends.all();
  $scope.chatId = Friends.chatId;
  $scope.approve = Friends.approve;
  if (Auth.loggedIn())
    ref.users.child($scope.user.$id+'/notifs/friends').remove(); // remove any new friend notfis on visiting friends
})

.controller('FriendShowCtrl', function($scope, $stateParams, Friends, $firebase, ref, Auth) {
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
  if (Auth.loggedIn())
    ref.users.child($scope.user.$id + '/notifs/chats/friends/' + chatId).remove();
})