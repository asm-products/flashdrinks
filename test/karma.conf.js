module.exports = function(config){
  config.set({

    basePath : '../',

    files : [
      'www/js/scripts.js',
      'www/js/templates.js',

      'www/lib/angular-mocks/angular-mocks.js',
      'www/lib/mockfirebase/browser/mockfirebase.js',
      'test/lib/**/*.js',
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
