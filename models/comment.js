var mongodb = require('./db');

function Comment(name,day,title,comment) {
  this.name=name;
  this.day=day;
  this.title=title;
  this.comment=comment;
}

module.exports=Comment;

//存儲一條留言信息
Comment.prototype.save=function (callback) {
  var name=this.name,
      day=this.day,
      title=this.title,
      comment=this.comment;

  //打開數據庫
  mongodb.open(function (err,db) {
    if(err){
      return callback(err);
    }
    //讀取Posts集合
    db.collection('posts',function (err,collection) {
      if(err){
        mongodb.close();
        return callback(err);
      }
      //通過用戶名，時間及標題查找文檔，並把一條留言對像添加到該文檔的comments數組裡
      collection.update({
        'name':name,
        'this.day':day,
        'title':title
      },{
        $push: {'comments':comment}
      },function (err) {
        mongodb.close();
        if(err){
          return callback(err);
        }
        callback(null);
      })
    })
  })
}
