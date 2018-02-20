var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');
var settings=require('./settings');
var flash=require('connect-flash');
 var multer=require('multer');

var app = express();
var passport = require('passport');
var GithubStrategy = require('passport-github').Strategy;

const session=require('express-session');
const MongoStore=require('connect-mongo')(session);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(flash());

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(multer({
  dest:'./public/images',
  rename:function (fieldname,filename) {
    return filename;
  }
}))

// app.use('/', routes);
// app.use('/users', users);

app.use(session({
  resave:false,//添加这行
  saveUninitialized: true,//添加这行
  secret:settings.cookieSecret,
  key:settings.db,//cookie name
  cookie:{maxAge:1000*60*60*24*30},//30 days
  store:new MongoStore({
    // db:settings.db,
    // host:settings.host,
    // port:settings.port
    url: 'mongodb://localhost/blog'
  })
}));

app.use(passport.initialize());

routes(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
passport.use(new GithubStrategy({
  clientID:"dc1423d2bb15f6a422e6",
  clientSecret:"52df32e55cc9c801594c60c2badc6949ded9cc8f",
  callbackURL:"http://localhost:3000/login/github/callback",
},function (accessToken,refreshToken,profile,done) {
  done(null,profile);
}));


if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
