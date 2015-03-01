angular.module('app', ['ionic', 'app.controllers', 'app.services', 'firebase', 'angular.filter', 'angular-data.DSCacheFactory'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });
})

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  // setup an abstract state for the tabs directive
  .state('tab', {
    url: "/tab",
    abstract: true,
    templateUrl: "templates/tabs.html",
    controller: function($scope, Auth){
      Auth.getUser().then(function(user){
        $scope.user = user;
      })
    }
  })

  // Each tab has its own nav history stack:

  .state('tab.bars', {
      url: '/bars',
      views: {
        'tab-bars': {
          templateUrl: 'templates/tab-bars.html',
          controller: 'BarsCtrl'
        }
      }
    })
    .state('tab.bar-detail', {
      url: '/bars/:barId',
      resolve: {
        bar: function($stateParams, Bars){
          return Bars.get($stateParams.barId);
        }
      },
      views: {
        'tab-bars': {
          templateUrl: 'templates/bar-detail.html',
          controller: 'BarDetailCtrl'
        }
      }
    })

    .state('tab.create', {
      url: '/create',
      views: {
        'tab-chats': {
          templateUrl: 'templates/tab-create.html',
          controller: 'CreateCtrl'
        }
      }
    })

  .state('tab.friends', {
      url: '/friends',
      views: {
        'tab-friends': {
          templateUrl: 'templates/tab-friends.html',
          controller: 'FriendsCtrl'
        }
      }
    })
    .state('tab.friend-detail', {
      url: '/friend/:friendId',
      views: {
        'tab-friends': {
          templateUrl: 'templates/friend-detail.html',
          controller: 'FriendDetailCtrl'
        }
      }
    })

  .state('tab.account', {
    url: '/account',
    views: {
      'tab-account': {
        templateUrl: 'templates/tab-account.html',
        controller: 'AccountCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/tab/bars');

});
