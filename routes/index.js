var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var User=require('../models/user.js');
var Post=require('../models/post.js');
var Comment=require('../models/comment.js');
var passport = require('passport');

/* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'Express' });
// });

module.exports = function (app) {
  app.get('/',function (req,res) {
    var name;
    if(!req.session.user){
        name = null;
    }else {
        name = req.session.user.name;
    }

    //判斷是否是第一頁，並把請求的頁數轉化為number類型
    var page=req.query.p?parseInt(req.query.p) : 1;
    //查詢並返回第page頁的10篇文章
    Post.getTen(null,page,function (err,posts,total) {
      if(err){
        posts=[];
      }
      res.render('index',{
        title:'主頁',
        posts:posts,
        page:page,
        isFirstPage:(page - 1) == 0,
        isLastPage:((page - 1)* 10 + posts.length) == total,
        user: req.session.user,
        success : req.flash('success').toString(),
        error : req.flash('error').toString()
      });
    });
  });

  app.get('/reg',checkNotLogin);
  app.get('/reg',function (req,res) {
    res.render('reg',{
      title:'註冊',
      user:req.session.user,
      success : req.flash('success').toString(),
      error : req.flash('error').toString()
    });
  });

  app.post('/reg',checkNotLogin);
  app.post('/reg',function (req,res) {
    var name=req.body.name,
        password=req.body.password,
        password_re=req.body['password_repeat'];
    //檢驗用戶兩次輸入的密碼是否一致
    if(password_re!=password){
      req.flash('error','兩次輸入的密碼不一致');
      return res.redirect('/reg');
    }
    //生成密碼的md5值
    var md5=crypto.createHash('md5'),
        password=md5.update(req.body.password).digest('hex');
    var newUser=new User({
          name:name,
          password:password,
          email:req.body.email
    });

    //檢查用戶名是否已經存在
    User.get(newUser.name,function (err,user) {
      if(user){
        req.flash('error','用戶已經存在');
        return res.redirect('/reg');
      }
      //如果不存在則新增用戶
      newUser.save(function (err,user) {
        if(err){
          req.flash('error',err);
          return res.redirect('/reg');
        }
        req.session.user=user;
        req.flash('success','註冊成功');
        res.redirect('/');
      })
    })
  });

  app.get('/login',checkNotLogin);
  app.get('/login',function (req,res) {
    res.render('login',{
      title:'登錄',
      user:req.session.user,
      success : req.flash('success').toString(),
      error : req.flash('error').toString()
    });
  });

  // app.get('/login/github',passport.authenticate('github',{session:false}));
  // app.get('/login/github/callback',passport.authenticate('github',{
  //   session:false,
  //   failureRedirect:'/login',
  //   successFlash:'登錄成功?'
  // }),function (req,res) {
  //   req.session.user={name:req.user.username,head: 'https://gravatar.com/avatar/'+req.user._json.gravatar_id+'?s=48'};
  //   res.redirect('/');
  // })

  app.post('/login',checkNotLogin);
  app.post('/login',function (req,res) {
    //生成密碼的md5值
    var md5=crypto.createHash('md5');
    var password=md5.update(req.body.password).digest('hex');
    //檢查用戶是否存在
    User.get(req.body.name,function (err,user) {
      if(!user){
        req.flash('error','用戶不存在！');
        return res.redirect('/login');
      }
      //檢查密碼是否一致
      if(user.password!=password){
        req.flash('error','密碼錯誤！');
        return res.redirect('/login');
      }
      //用戶名密碼匹配，將用戶信息存入session
      req.session.user=user;
      req.flash('success','登錄成功！');
      res.redirect('/');
    });
  });

  app.get('/post',checkLogin);
  app.get('/post',function (req,res) {
    res.render('post',{
      title:'發表',
      user: req.session.user,
      success : req.flash('success').toString(),
      error : req.flash('error').toString()
    });
  });

  app.post('/post',checkLogin);
  app.post('/post',function (req,res) {
    var currentUser=req.session.user,
        tags=[req.body.tag1, req.body.tag2, req.body.tag3],
        post=new Post(currentUser.name, currentUser.head, req.body.title, tags, req.body.post);
    post.save(function (err) {
      if(err){
        req.flash('error',err);
        return res.redirect('/');
      }
      req.flash('success','發佈成功!');
      res.redirect('/');
    });
  });

  app.get('/logout',checkLogin);
  app.get('/logout',function (req,res) {
    req.session.user=null;
    req.flash('success','登出成功!');
    res.redirect('/')
  });

  app.get('/upload',checkLogin);
  app.get('/upload',function (req,res) {
    res.render('upload',{
      title:'文件上傳',
      user: req.session.user,
      success:req.flash('success').toString(),
      error:req.flash('error').toString()
    });
  });

  app.post('/upload',checkLogin);
  app.post('/upload',function (req,res) {
    req.flash('success','文件上傳成功');
    res.redirect('/upload');
  });

  app.get('/archive',function (req,res) {
    Post.getArchive(function (err,posts) {
      if(err){
        req.flash('error',err);
        return res.redirect('/');
      }
      res.render('archive',{
        title:'存檔',
        posts:posts,
        user:req.session.user,
        success:req.flash('success').toString(),
        error:req.flash('error').toString()
      });
    });
  });

  app.get('/tags',function (req,res) {
    Post.getTags(function (err,posts) {
      if(err){
        req.flash('error',err);
        return res.redirect('/');
      }
      res.render('tags',{
        title:'標籤',
        posts:posts,
        user:req.session.user,
        success:req.flash('success').toString(),
        error:req.flash('error').toString()
      });
    });
  });

  //添加特定標籤的頁面
  app.get('/tags/:tag',function (req,res) {
    Post.getTag(req.params.tag,function (err,posts) {
      if(err){
        req.flash('error',err);
        return res.redirect('/');
      }
      res.render('tag',{
        title:'TAG:'+ req.params.tag,
        posts:posts,
        user:req.session.user,
        success:req.flash('success').toString(),
        error:req.flash('error').toString()
      });
    });
  });

  app.get('/links',function (req,res) {
    res.render('links',{
      title:'友情鏈接',
      user:req.session.user,
      success:req.flash('success').toString(),
      error:req.flash('error').toString()
    })
  })

  app.get('/search',function (req,res) {
    Post.search(req.query.keyword,function (err,posts) {
      if(err){
        req.flash('error',err);
        return res.redirect('/');
      }
      res.render('search',{
        title:"SEARCH" + req.query.keyword,
        posts:posts,
        user:req.session.user,
        success:req.flash('success').toString(),
        error:req.flash('error').toString()
      });
    });
  });

  //處理用戶頁的請求
  app.get('/u/:name',function (req,res) {
    var page=req.query.p ? parseInt(req.query.p) : 1;
    //檢查用戶是否存在
    User.get(req.params.name,function(err,user) {
      if(err){
        req.flash('error',err);
        return res.redirect('/');
      }
      if(!user){
        req.flash('error',"用戶不存在");
        return res.redirect('/');
      }
      //查詢並返回該用戶第page頁的10篇文章
      Post.getTen(user.name,page,function (err,posts,total) {
        if(err){
          req.flash('error',err);
          return res.redirect('/');
        }
        res.render('user',{
          title:user.name,
          posts:posts,
          page:page,
          isFirstPage:(page - 1) ==0,
          isLastPage:((page-1)* 10+posts.length) == total,
          user:req.session.user,
          success:req.flash('success').toString(),
          error:req.flash('error').toString()
        });
      });
    });
  })

  //處理文章頁面的請求
app.get('/u/:name/:day/:title',function (req,res) {
    Post.getOne(req.params.name, req.params.day, req.params.title, function (err,post) {
      if(err){
        req.flash('error',err);
        return res.redirect('/');
      }
      res.render('article',{
        title:req.params.title,
        post:post,
        user:req.session.user,
        success:req.flash('success').toString(),
        error:req.flash('error').toString()
      });
    });
  })

 app.post('/u/:name/:day/:title',function (req,res) {
   var date=new Date();
   var time=date.getFullYear() + "-" + ( date.getMonth()+1 ) + "-" + date.getDate()
            +" " + date.getHours() + ":" + (date.getMinutes()<10? '0'+date.getMinutes():date.getMinutes());
   var md5 = crypto.createHash('md5'),
       email_MD5=md5.update(req.body.email.toLowerCase()).digest('hex'),
       head="http://www.gravatar.com/avatar/"+ email_MD5 +"?s=48";
   var comment = {
     name:req.body.name,
     head:head,
     email:req.body.email,
     website:req.body.website,
     time:time,
     content:req.body.content
   };
   var newComment=new Comment(req.params.name,req.params.day,req.params.title,comment);
   newComment.save(function (err) {
     if(err){
       req.flash('error',err);
       return res.redirect('back');
     }
     req.flash('success','留言成功');
     res.redirect('back');
   });
 })

//編輯頁面
app.get('/edit/:name/:day/:title',checkLogin);
app.get('/edit/:name/:day/:title',function (req,res) {
  var currentUser = req.session.user;
  Post.edit(currentUser.name,req.params.day,req.params.title,function (err,post) {
    if(err){
      req.flash('error',err);
      return res.redirect('back');
    }
    res.render('edit',{
      title:'編輯',
      post:post,
      user:req.session.user,
      success:req.flash('success').toString(),
      error:req.flash('error').toString()
    });
  });
})

app.post('/edit/:name/:day/:title',checkLogin);
app.post('/edit/:name/:day/:title',function (req,res) {
  var currentUser=req.session.user;
  Post.update(currentUser.name,req.params.day,req.params.title,req.body.post,function(err){
    var url=encodeURI('/u/'+ req.params.name +'/'+ req.params.day + '/' + req.params.title);
    if(err){
      req.flash('error',err);
      return res.redirect(url);//出錯返回文章頁
    }
    req.flash('success','修改成功！');
    res.redirect(url);
  });
});

app.get('/remove/:name/:day/:title',checkLogin);
app.get('/remove/:name/:day/:title',function (req,res) {
  var currentUser=req.session.user;
  Post.remove(currentUser.name,req.params.day,req.params.title,function (err) {
    if(err){
      req.flash('error',err);
      return res.redirect('back');
    }
    req.flash('success','刪除成功');
    res.redirect('/');
  })
})

app.get('/reprint/:name/:day/:title', checkLogin);
app.get('/reprint/:name/:day/:title', function (req, res) {
  Post.edit(req.params.name, req.params.day, req.params.title, function (err, post) {
    if (err) {
      req.flash('error', err);
      return res.redirect(back);
    }
    var currentUser = req.session.user,
        reprint_from = {name: post.name, day: post.time.day, title: post.title},
        reprint_to = {name: currentUser.name, head: currentUser.head};
    // console.log("post.name................."+post.name);
    // console.log(reprint_from.name);
    Post.reprint(reprint_from, reprint_to, function (err, post) {
      if (err) {
        req.flash('error', err);
        return res.redirect('back');
      }
      req.flash('success', '轉載成功!');
      console.log("post................."+post);
      console.log("post.name................."+post.name);
      var url = encodeURI('/u/' + post.name + '/' + post.time.day + '/' + post.title);
      //跳轉到轉載後的文章頁面
      res.redirect(url);
    });
  });
});

app.use(function (req,res) {
  res.render('404');
});

function checkLogin(req,res,next) {
  if(!req.session.user){
    req.flash('error','未登錄！');
    res.redirect('/login');
  }
  next();
}

function checkNotLogin(req,res,next) {
  if(req.session.user){
    req.flash('error','已登錄');
    res.redirect('back');
  }
  next();
}

}
