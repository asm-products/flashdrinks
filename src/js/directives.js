angular.module('app.directives', [])

.directive('chatList', function (ref, Auth, $firebase, Friends, $rootScope) {

  // For basic cases of /firebase/chats/bar-1, chatId will be a string (bar-1). For cases of two or more users chatting,
  // we want a unique id combining the two users into a chatroom - so we concat their userIds. To ensure it turns out the
  // same each time, we sort() the ids first
  var chatId = function(id){
    if (_.isArray(id))
      return id.sort().join('');
    return id;
  };

  return {
    templateUrl: "templates/chat.html",
    restrict: "E",
    scope: {
      chatId: '=',
      type: '@'
    },
    link: function(scope, element, attrs) {
      var cid = chatId(scope.chatId);
      scope.chats = $firebase(ref.chats.child(cid)).$asArray();
      scope.Friends = Friends;

      scope.data = {
        text: ''
      };

      scope.send = function () {
        if (!Auth.loggedIn()) return $rootScope.$broadcast('fd:auth:error');
        var user = Auth.getUser();
        scope.chats.$add({
          timestamp: Firebase.ServerValue.TIMESTAMP,
          text: scope.data.text,
          user: user.$id
        });
        scope.data.text = '';

        if (scope.type=='bar') {
          ref.bars.child(cid+'/rsvps').once('value', function(rsvps){
            _.each(_.unique(_.pluck(scope.chats, 'uid')).concat(_.keys(rsvps.val())), function(k){
              if (k==user.$id) return;
              ref.users.child(k + '/notifs/chats/bars/' + cid).set(true);
            });
          })
        } else { // user
          var fid = scope.chatId[1];
          ref.users.child(fid + '/notifs/chats/friends/'+cid).set(true);
        }
      }
    }
  }
})

.directive('systemLink', function($cordovaInAppBrowser){
  return {
    restrict: 'A',
    scope: {systemLink:'='},
    link: function(scope, element, attrs){
      element.attr('style', 'cursor:pointer;');
      element.on('click', function(evt){
        evt.preventDefault();
        window.cordova ?
          $cordovaInAppBrowser.open(scope.systemLink, '_system') :
          window.open(scope.systemLink, '_blank'/*, 'location=yes'*/);
        return false;
      })
    }
  }
})

.directive('mobileOnly', function($ionicPopup){
  return {
    restrict: 'A',
    priority: 1,
    link: function(scope, element, attrs) {
      element.on('click', function (evt) {
        if (window.cordova) return;
        evt.stopPropagation();
        $ionicPopup.show({
          //template: 'This feature is only available via the mobile app.',
          title: 'This feature only available via the mobile app.',
          buttons: [
            {text: 'Cancel'},
            {
              text: 'Download',
              type: 'button-positive',
              onTap: function (e) {
                window.open('https://play.google.com/store/apps/details?id=com.ocdevel.flashdrinks', '_blank');
              }
            }
          ]
        })
      })
    }
  }
})