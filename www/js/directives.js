angular.module('app.directives', [])

.directive('chatList', function (ref, Auth, $firebase, $compile) {

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
      chatId: '='
    },
    link: function(scope, element, attrs) {

      // What's going on here: <ion-footer-bar> *has* to be in the HTML at run-time. I've tried using prelink functions with
      // negative priorities, no cigar (a bit of that here http://forum.ionicframework.com/t/ionic-list-gets-overlapped-for-ion-footer-bar/12666/2).
      // So, I'm using and empty <ion-footer-bar> in the html, then decorating it here
      // (template ideas: https://github.com/mhartington/Ionic-Chat/blob/master/www/index.html, http://codepen.io/rossmartin/pen/XJmpQr)
      var tpl =
        '<label class="item-input-wrapper">'+
        '<input type="text" placeholder="Type your message" ng-model="data.text" />'+
        '</label>'+
        '<button ng-click="send()" class="button button-icon icon ion-android-send footer-btn" ng-disabled="!data.text" />';
      element.parent().parent().parent().parent().parent().find('ion-footer-bar').addClass('bar-stable item-input-inset').append($compile(tpl)(scope));

      var user = Auth.getUser();
      scope.chats = $firebase(ref.chat.child( chatId(scope.chatId) )).$asArray();
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
      }
    }
  }
})