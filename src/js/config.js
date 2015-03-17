'use strict';

// Declare app level module which depends on filters, and services
angular.module('app.config', [])

  // Your Firebase data URL goes here, no trailing slash
  .constant('FBURL', 'https://flashdrink.firebaseio.com')

  // See https://github.com/lefnire/server-misc
  .constant('SERVER', 'https://flashdrinks-server.herokuapp.com')