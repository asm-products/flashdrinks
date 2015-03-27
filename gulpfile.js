var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('bower');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var sh = require('shelljs');
var karma = require('karma').server;
var templateCache = require('gulp-angular-templatecache');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var ngAnnotate = require('gulp-ng-annotate');
var gulpProtractor = require("gulp-protractor");
var protractor = gulpProtractor.protractor;
var gulpif = require('gulp-if');
var del = require('del');
var jade = require('gulp-jade');
var nconf = require('nconf');
nconf.argv();

var paths = {
  sass: [
    './src/scss/**/*.scss',
    './bower_components/css-social-buttons/css/zocial.css'
  ],
  templates: [
    './src/index.jade',
    './src/privacy.jade',
    './src/templates/**/*.jade'],
  img: ['./src/img/**/*'],
  scripts: [
    "./bower_components/ionic/js/ionic.bundle.js",
    "./bower_components/lodash/lodash.js",
    "./bower_components/firebase/firebase.js",
    "./bower_components/angularfire/dist/angularfire.js",
    "./bower_components/angular-lodash/angular-lodash.js",
    "./bower_components/crypto-js/build/rollups/md5.js",
    "./bower_components/moment/moment.js",
    "./bower_components/firebase-on-error/src/onerror.js",
    "./bower_components/angular-cache/dist/angular-cache.js",
    "./src/js/**/*.js"
  ],
  bower_components: [
    "./bower_components/css-social-buttons/**/*",
    "./bower_components/ionic/fonts/**/*",
    "./bower_components/ngCordova/dist/ng-cordova.min.js",
  ]
};

gulp.task('default', ['sass', 'templates', 'copy', 'scripts']);

gulp.task('watch', function() {
  gulp.watch(paths.sass, ['sass']);
  gulp.watch(paths.templates, ['templates']);
  gulp.watch(paths.img, ['img']);
  gulp.watch(paths.scripts, ['scripts']);
});

gulp.task('sass', function(done) {
  gulp.src(paths.sass)
    .pipe(concat('styles.css'))
    .pipe(sass())
    .pipe(gulp.dest('./www/css/'))
    .pipe(minifyCss({
      keepSpecialComments: 0
    }))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest('./www/css/'))
    .on('end', done);
});

gulp.task('templates', function () {
  gulp.src(['src/index.jade', 'src/privacy.jade'])
    .pipe(jade())
    .pipe(gulp.dest('www'));
  gulp.src('src/templates/**/*.jade')
    .pipe(jade())
    .pipe(templateCache({
      root: 'templates/',
      module: 'app'
    }))
    .pipe(gulp.dest('www/js'));
});

gulp.task('clean', function(){
  del(['./www/bower_components', './www/img']);
})

gulp.task('copy', function(){
  gulp.src(paths.img)
    .pipe(gulp.dest('www/img'));
  gulp.src(paths.bower_components, {base: '.' })
    .pipe(gulp.dest('www'))
});

gulp.task('scripts', function(){
  return gulp.src(paths.scripts)
    .pipe(ngAnnotate())
    .pipe(gulpif(nconf.get('release'), uglify()))
    .pipe(concat('scripts.js'))
    .pipe(gulp.dest('www/js'));
});

gulp.task('install', ['git-check'], function() {
  return bower.commands.install()
    .on('log', function(data) {
      gutil.log('bower', gutil.colors.cyan(data.id), data.message);
    });
});

gulp.task('test:unit', function (done) {
  karma.start({
    configFile: __dirname + '/test/karma.conf.js',
    singleRun: true
  }, done);
});

gulp.task('test:e2e:setup', gulpProtractor.webdriver_update);

gulp.task('test:e2e:server', function(done){
  //server.listen(9001, done);
  done();
});

gulp.task('test:e2e', [/*'default', 'test:e2e:setup', */'test:e2e:server'], function(done){
  gulp.src(["./test/e2e/*.js"])
    .pipe(protractor({
      configFile : "./test/protractor.conf.js",
      args       : ['--baseUrl', 'http://127.0.0.1:8100'],
      debug: true
    }))
    .on('error', function(e) { throw e })
    .on('end', function(){
      //server.close();
      done();
    });
});

gulp.task('git-check', function(done) {
  if (!sh.which('git')) {
    console.log(
      '  ' + gutil.colors.red('Git is not installed.'),
      '\n  Git, the version control system, is required to download Ionic.',
      '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
      '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
    );
    process.exit(1);
  }
  done();
});
