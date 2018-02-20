var mongodb=require('./db');
var markdown=require('markdown').markdown;

function Post(name,head,title,tags,post) {
  this.name=name;
  this.head=head;
  this.title=title;
  this.tags=tags;
  this.post=post;
}

module.exports=Post;

//存儲一篇文章極其相關信息
Post.prototype.save=function (callback) {
  var date=new Date();
  //存儲各種時間格式，方便以後擴展
  var time={
    date:date,
    year:date.getFullYear(),
    month:date.getFullYear()+'-'+(date.getMonth()+1),
    day:date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate(),
    minute:date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()+" "+date.getHours()+":"+(date.getMinutes()<10? '0'+date.getMinutes():date.getMinutes())
  }

  //要存入數據庫的文檔
  var post={
    name:this.name,
    head:this.head,
    time:time,
    title:this.title,
    tags:this.tags,
    post:this.post,
    comments:[],
    reprint_info: {},
    pv:0
  };

  //打開數據庫
  mongodb.open(function (err,db) {
    if(err){
      return callback(err);
    }
    //讀取post集合
    db.collection('posts',function (err,collection) {
      if(err){
        mongodb.close();
        return callback(err);
      }
      //將文檔插入Post集合
      collection.insert(post,{safe:true},function (err) {
        mongodb.close();
        if(err){
          return callback(err);
        }
        callback(null);
      });
    });
  });
};

//讀取文章及其相關信息
//一次獲取十篇文章
Post.getTen=function (name,page,callback) {
  //打開數據庫
  mongodb.open(function (err,db) {
    if(err){
      return callback(err);
    }
    //讀取post集合
    db.collection('posts',function (err,collection) {
      if(err){
        mongodb.close();
        return callback(err);
      }
      var query={};
      if(name){
        query.name=name;
      }
      //根據query對像查詢文章
      //根據count返回特定查詢的文檔數total
      collection.count(query,function (err,total) {
        //根據query對像查詢，並跳過前(page-1)*10個結果，返回之後的10個結果
        collection.find(query,{
          skip:(page - 1)*10,
          limit:10
        }).sort({time: -1}).toArray(function (err,docs) {
          mongodb.close();
          if(err){
            return callback(err);
          }
          //解析markdown為html
          docs.forEach(function (doc) {
            doc.post=markdown.toHTML(doc.post);
          });
          callback(null,docs,total);
        });
      });
    });
  });
}

//獲取一篇文章
Post.getOne=function (name,day,title,callback) {
  //打開數據庫
  mongodb.open(function (err,db) {
    if(err){
      return callback(err);
    }
    //讀取posts集合
    db.collection('posts',function (err,collection) {
        if(err){
          mongodb.close();
          return callback(err);
        }
        //根據用戶名，發表日期及文章名進行查詢
        collection.findOne({
          'name':name,
          'time.day':day,
          'title':title
        },function (err,doc) {
          if(err){
            mongodb.close();
            return callback(err);
          }
          //解析markdown為html
          // doc.post=markdown.toHTML(doc.post);
          if(doc){
            //每訪問一次,pv值增加1
            collection.update({
              'name':name,
              'time.day':day,
              'title':title
            },{
              $inc: {'pv':1}
            },function (err) {
              mongodb.close();
              if(err){
                return callback(err);
              }
            });
            doc.post=markdown.toHTML(doc.post);
            doc.comments.forEach(function (comment) {
              comment.content=markdown.toHTML(comment.content);
            });
            callback(null,doc);
          }
        })
      })
    })
}

//返回原始發表的內容(markdown格式)
Post.edit=function (name,day,title,callback) {
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
      //根據用戶名，發表日期及文章名進行查詢
      collection.findOne({
        'name':name,
        'time.day':day,
        'title':title
      },function (err,doc) {
        mongodb.close();
        if(err){
          return callback(err);
        }
        callback(null,doc);
      });
    });
  });
}

//更新一篇文章及其相關信息
Post.update=function (name,day,title,post,callback) {
  //打開數據庫
  mongodb.open(function (err,db) {
    if(err){
      return callback(err);
    }
    //讀取posts集合
    db.collection('posts',function (err,collection) {
      if(err){
        mongodb.close();
        return callback(err);
      }
      //更新文章內容
      collection.update({
        'name':name,
        'time.day':day,
        'title':title
      },{
        $set: {post: post}
      },function (err) {
        mongodb.close();
        if(err){
          return callback(err);
        }
        callback(null);
      });
    });
  });
}
  //刪除一篇文章
  Post.remove=function (name,day,title,callback) {
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
        //查詢要刪除的文檔
        collection.findOne({
          'name':name,
          'time.day':day,
          'title':title
        },function (err,doc) {
          if(err){
            mongodb.close();
            return callback(err);
          }
          //如果有reprint_from,先保存下來
          var reprint_from=" ";
          if(doc.reprint_info.reprint_from){
            reprint_from=doc.reprint_info.reprint_from;
          }
          if(reprint_from!=''){
            //更新原文章所在文檔的reprint_to
            collection.update({
              'name':reprint_from.name,
              'time.day':reprint_from.day,
              'title':reprint_from.title
            },{
              $pull:{
                "reprint_info.reprint_to":{
                  'name':name,
                  'day':day,
                  'title':title
                }
              }
            },function (err) {
              if(err){
                mongodb.close();
                return callback(err);
              }
            });
          }
          //根據用戶名，日期和標題查找並刪除一篇文章
          collection.remove({
            'name':name,
            'time.day':day,
            'title':title
          },{w:1},function (err) {
            mongodb.close();
            if(err){
              return callback(err);
            }
            callback(null);
          });
        });
      });
    });
  };

  //返回所有文章存檔信息
  Post.getArchive = function (callback) {
    //打開數據庫
    mongodb.open(function (err,db) {
      if(err){
        return callback(err);
      }
      //讀取posts集合
      db.collection('posts',function (err,collection) {
        if(err){
          mongodb.close();
          return callback(err);
        }
        //返回只包含name,title,time屬性的文檔組成的存檔數組
        collection.find({},{
          'name':1,
          'time':1,
          'title':1
        }).sort({time:-1}).toArray(function (err,docs) {
          mongodb.close();
          if(err){
            return callback(err);
          }
          callback(null,docs);
        });
      });
    });
  }

  //返回所有標籤
  Post.getTags=function (callback) {
    mongodb.open(function (err,db) {
      if(err){
        return callback(err);
      }
      db.collection('posts',function (err,collection) {
        if(err){
          mongodb.close();
          return callback(err);
        }
        //distinct 用來找出給定鍵的所有不同值
        collection.distinct("tags",function (err,docs) {
          mongodb.close();
          if(err){
            return callback(err);
          }
          callback(null,docs);
        });
      });
    });
  };

  //返回含有特定標籤的所有文章
  Post.getTag=function (tag,callback) {
    mongodb.open(function (err,db) {
      if(err){
        return callback(err);
      }
      db.collection('posts',function (err,collection) {
        if(err){
          mongodb.close();
          return callback(err);
        }
        //查詢所有tags數組內包含tag的文檔
        //並返回只含有name,time,title組成的數組
        collection.find({
          'tags':tag
        },{
          'name':1,
          'time':1,
          "title":1
        }).sort({time:-1}).toArray(function (err,docs) {
          mongodb.close();
          if(err){
            return callback(err);
          }
          callback(null,docs);
        })
      })
    })
  }

  //返回通過標題關鍵字查詢的所有文章信息
  Post.search = function (keyword,callback) {
    mongodb.open(function (err,db) {
      if(err){
        return callback(err);
      }
      db.collection('posts',function (err,collection) {
        if(err){
          mongodb.close();
          return callback(err);
        }
        var pattern = new RegExp(keyword,'i');
        collection.find({
          "title":pattern
        },{
          'name':1,
          'time':1,
          'title':1
        }).sort({
          time: -1
        }).toArray(function (err,docs) {
          mongodb.close();
          if(err){
            return callback(err);
          }
          callback(null,docs);
        });
      });
    });
  }

  //轉載一篇文章
Post.reprint = function(reprint_from, reprint_to, callback) {
  console.log('reprint_to.name........'+reprint_to.name);
  mongodb.open(function (err, db) {
    if (err) {
      return callback(err);
    }
    db.collection('posts', function (err, collection) {
      if (err) {
        mongodb.close();
        return callback(err);
      }
      //找到被轉載的文章的原文檔
      collection.findOne({
        "name": reprint_from.name,
        "time.day": reprint_from.day,
        "title": reprint_from.title
      }, function (err, doc) {
        if (err) {
          mongodb.close();
          return callback(err);
        }
        var date = new Date();
        var time = {
            date: date,
            year : date.getFullYear(),
            month : date.getFullYear() + "-" + (date.getMonth() + 1),
            day : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
            minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
            date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
        }

        delete doc._id;//注意要刪掉原來的 _id

        doc.name = reprint_to.name;
        console.log("doc.name......."+doc.name);
        doc.head = reprint_to.head;
        doc.time = time;
        doc.title = (doc.title.search(/[轉載]/) > -1) ? doc.title : "[轉載]" + doc.title;
        doc.comments = [];
        doc.reprint_info = {"reprint_from": reprint_from};
        doc.pv = 0;

        //更新被轉載的原文檔的 reprint_info 內的 reprint_to
        collection.update({
          "name": reprint_from.name,
          "time.day": reprint_from.day,
          "title": reprint_from.title
        }, {
          $push: {
            "reprint_info.reprint_to": {
              "name": doc.name,
              "day": time.day,
              "title": doc.title
          }}
        }, function (err) {
          if (err) {
            mongodb.close();
            return callback(err);
          }
        });

        //將轉載生成的副本修改後存入數據庫，並返回存儲後的文檔
        collection.insert(doc, {
          safe: true
        }, function (err, post) {
          mongodb.close();
          if (err) {
            return callback(err);
          }
          callback(err, post['ops'][0]);
        });
      });
    });
  });
};
