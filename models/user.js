var mongodb=require('./db');
var crypto = require('crypto');

function User(user) {
  this.name = user.name;
  this.password = user.password;
  this.email = user.email;
};

module.exports=User;

//存儲用戶信息
User.prototype.save=function(callback) {
  var md5=crypto.createHash('md5'),
      email_MD5 = md5.update(this.email.toLowerCase()).digest('hex'),
      head="http://www.gravatar.com/avatar/"+email_MD5+"?s=48"
  var user={
    name: this.name,
    password: this.password,
    email: this.email,
    head: head
  };

  //打開數據庫
  mongodb.open(function (err,db) {
    if(err){
      return callback(err);
    }
    //讀取users集合
    db.collection('users',function (err,collection) {
      if(err){
        mongodb.close();
        return callback(err);
      }
      //將用戶數據插入users集合
      collection.insert(user, {
        safe: true
      },function (err,user) {
        mongodb.close();
        if(err){
          return callback(err);
        }
        console.log('usercontent.............................'+JSON.stringify(user));
        console.log('user["ops"][0].name...............'+user["ops"][0].name);
        callback(null,user["ops"][0]);
      });
    });
  });
};

//讀取用戶信息
User.get=function (name,callback) {
  //打開數據庫
  mongodb.open(function (err,db) {
    if(err){
      return callback(err);
    }
    //讀取users集合
    db.collection('users',function (err,collection) {
      if(err){
        mongodb.close();
        return callback(err);
      }
      //查找用戶名(name鍵)值為name 一個文檔
      collection.findOne({name:name},function (err,user) {
        mongodb.close();
        if(err){
          return callback(err);
        }
        callback(null,user);
      });
    });
  });
}
