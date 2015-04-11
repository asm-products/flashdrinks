angular.module('app', [
  'ionic',
  'ngCordova',
  'firebase',
  'angular-cache',
  'angular-lodash',
  'app.config',
  'app.controllers',
  'app.services',
  'app.directives',
  'ngStorage' // TODO remove this and use existing angular-cache instead
])

.run(function($ionicPlatform, PushService) {
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
    window.setTimeout(function(){PushService.registerApp()}, 100); // FIXME very expensive op, push to webworker?
  });
})

.config(function($compileProvider) {
  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|file|geo):/);
})

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  // setup an abstract state for the tabs directive
  .state('app', {
    url: "/app",
    abstract: true,
    templateUrl: "templates/app.html",
    controller: 'AppCtrl'
  })

  // Each tab has its own nav history stack:

  .state('app.bars', {
      url: '/bars',
      views: {
        'menuContent': {
          templateUrl: 'templates/bars/list.html',
          controller: 'BarListCtrl'
        }
      }
    })
    .state('app.bar-show', {
      url: '/bars/:barId',
      resolve: {
        bar: function($stateParams, Bars){
          return Bars.get($stateParams.barId);
        }
      },
      views: {
        'menuContent': {
          templateUrl: 'templates/bars/show.html',
          controller: 'BarShowCtrl'
        }
      }
    })

  .state('app.friends', {
      url: '/friends',
      views: {
        'menuContent': {
          templateUrl: 'templates/friends/list.html',
          controller: 'FriendListCtrl'
        }
      }
    })
    .state('app.friend-show', {
      url: '/friends/:friendId',
      views: {
        'menuContent': {
          templateUrl: 'templates/friends/show.html',
          controller: 'FriendShowCtrl'
        }
      }
    })

  .state('app.account', {
    url: '/account',
    views: {
      'menuContent': {
        templateUrl: 'templates/account/page.html',
        controller: function(){}
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/bars');

});
