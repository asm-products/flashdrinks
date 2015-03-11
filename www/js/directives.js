angular.module('app.directives', [])

.directive('chatList', function (ref, Auth, $firebase) {

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
      var user, cid, fid;
      user = Auth.getUser();
      cid = chatId(scope.chatId);
      scope.chats = $firebase(ref.chats.child(cid)).$asArray();
      scope.getProfile = function (uid) {
        return $firebase(ref.users.child(uid)).$asObject();
      }

      scope.data = {
        text: ''
      };

      scope.send = function () {
        scope.chats.$add({
          timestamp: Firebase.ServerValue.TIMESTAMP,
          text: scope.data.text,
          uid: user.$id
        });
        scope.data.text = '';

        if (scope.type=='bar') {
          ref.bars.child(cid+'/members').once('value', function(members){
            _.each(_.unique(_.pluck(scope.chats, 'uid')).concat(_.keys(members.val())), function(uid){
              ref.users.child(uid + '/notifs/chats/' + cid).set(true);
            });
          })
        } else { // user
          fid = scope.chatId[1];
          ref.users.child(fid + '/notifs/chats/'+cid).set(true);
        }
      }
    }
  }
})