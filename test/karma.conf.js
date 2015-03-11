module.exports = function(config){
  config.set({

    basePath : '../',

    files : [
      'www/lib/ionic/js/ionic.bundle.js',
      'www/lib/lodash/lodash.js',
      'www/lib/firebase/firebase.js',
      'www/lib/angularfire/dist/angularfire.js',
      'www/lib/angular-filter/dist/angular-filter.js',
      'www/lib/crypto-js/build/rollups/md5.js',

      'www/lib/angular-mocks/angular-mocks.js',
      'www/lib/mockfirebase/browser/mockfirebase.js',

      'test/lib/**/*.js',
      'www/js/**/*.js',
      'test/unit/**/*.spec.js'
    ],

    autoWatch : true,

    frameworks: ['jasmine'],

    browsers : ['Chrome'],

    plugins : [
            'karma-chrome-launcher',
            //'karma-firefox-launcher',
            'karma-jasmine',
            //'karma-junit-reporter'
            ],

    //junitReporter : {
    //  outputFile: 'test_out/unit.xml',
    //  suite: 'unit'
    //}

  });
};
