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

var paths = {
  sass: [
    './src/scss/**/*.scss',
    './www/lib/css-social-buttons/css/zocial.css'
  ],
  templates: ['./src/index.html', './src/templates/**/*.html'],
  img: ['./src/img/**/*'],
  scripts: [
    "./www/lib/ionic/js/ionic.bundle.js",
    "./www/lib/lodash/lodash.js",
    "./www/lib/firebase/firebase.js",
    "./www/lib/angularfire/dist/angularfire.js",
    "./www/lib/angular-lodash/angular-lodash.js",
    "./www/lib/crypto-js/build/rollups/md5.js",
    "./www/lib/moment/moment.js",
    "./src/js/**/*.js",
  ]
};

gulp.task('default', ['sass', 'templates', 'img', 'scripts']);

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
  gulp.src('src/index.html')
    .pipe(gulp.dest('www'));
  gulp.src('src/templates/**/*.html')
    .pipe(templateCache({
      root: 'templates/',
      module: 'app'
    }))
    .pipe(gulp.dest('www/js'));
});

gulp.task('img', function(){
  gulp.src(paths.img)
    .pipe(gulp.dest('www/img'))
});

gulp.task('scripts', function(){
  return gulp.src(paths.scripts)
    //.pipe(uglify())
    .pipe(concat('scripts.js'))
    .pipe(gulp.dest('www/js'));
});

gulp.task('install', ['git-check'], function() {
  return bower.commands.install()
    .on('log', function(data) {
      gutil.log('bower', gutil.colors.cyan(data.id), data.message);
    });
});

gulp.task('test', function (done) {
  karma.start({
    configFile: __dirname + '/test/karma.conf.js',
    singleRun: true
  }, done);
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
