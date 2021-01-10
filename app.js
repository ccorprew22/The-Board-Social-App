const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const redis = require('redis');
const redisStore = require('connect-redis')(session);
const moment = require('moment');
const bcrypt = require('bcrypt')
const client  = redis.createClient();
const app = express();
const db = require('./connect.js');
var conn = db.conn;
const check = require('express-validator/check').check;
var urlencodedParser = bodyParser.urlencoded({ extended: false })

app.use( express.static( "images" ) );

app.use(session({
  secret: 'secret',
  saveUninitialized: true,
  store: new redisStore({ host: 'localhost', port: 6379, client: client,ttl : 260}),
  resave: true
}));

const PORT = 8080;
app.engine('html', require('ejs').renderFile);
app.set('view engine','ejs');
app.listen(PORT, () => console.log("listening on port " + PORT));

app.use(function(req, res, next) { //This to send variable to header
  res.locals.user = req.session.user;
  next();
});

app.get("/", function(req, res){
  if(req.session.user){
    return res.redirect('/dashboard');
  }
  res.render("index");
});

app.get("/index", function(req, res){
  res.render("index"); //renders page
  console.log("Connected to index");
});

app.get("/dashboard", function(req, res){
  if(!req.session.idUsers){
    res.redirect("index");
  }else{
    console.log("Connected to dashboard: " + req.session.user);
    conn.query("SELECT * FROM Users WHERE idUsers = ?;SELECT uidUsers, Feed_Post, Date_Time FROM Users, Feed WHERE Users.idUsers = Feed.idUsers",
    req.session.idUsers ,function(err, result, fields){
      if (err) throw err;
      console.log("Connected to dashboard");
      res.render("dashboard", {title: 'User List', userResult: result[0], feedResult: result[1]});
    });
  }
});

app.get("/search", function(req, res){
  console.log("Connected to search");
  res.render("search");
});

app.get("/login", function(req, res){
  res.render("login");
  console.log("Connected to login");
});

app.get("/signup", function(req, res){
  res.render("signup"); //renders page
  console.log("Connected to signup");
});

app.get("/logout", function(req, res){
  let user = req.session.user;
  req.session.destroy((err) => {
        if(err) {
            return console.log(err);
        }
        console.log(user + " logged out");
        res.redirect('/');
    });
});

app.post("/login", [
  check('uid', 'Username is required').not().isEmpty(),
  check('pwd', 'Password is required').not().isEmpty()
], urlencodedParser, function(req, res, next){
  const user = req.body.uid;
  const password = req.body.pwd;

  conn.query(`SELECT * FROM Users WHERE uidUsers = ?`, [user], function (err, result, fields) {
    if (err) throw err;
    if(result.length === 1){
      result.forEach(row => {
        if(row.pwdUsers == password){
          req.session.idUsers = row.idUsers;
          req.session.user = user;
          //console.log("Password is "+ row.pwdUsers);
          return res.redirect('/dashboard?login=success');
        }else{
          console.log("Wrong password: " + password);
          return res.redirect('/login?error=invalidPassword');
        }
      });
    }else{
      console.log("Not a valid user");
      return res.redirect('/login?error=userInvalid');
    }
  });

});

app.post('/signup', [
  check('fname', 'First Name is required').not().isEmpty(),
  check('l', 'Last Name is required').not().isEmpty(),
  check('uid', 'Username is required').not().isEmpty(),
  check('mail', 'Email is required').not().isEmpty(),
  check('sex', 'Gender is required').not().isEmpty(),
  check('pwd', 'Password is required').not().isEmpty(),
  check('pwdRepeat', 'Enter password again').not().isEmpty()
],urlencodedParser, function(req, res, next){
  const first = req.body.fname;
  const last = req.body.l;
  const email = req.body.mail;
  const user = req.body.uid;
  const sex = req.body.sex;
  const password = req.body.pwd;
  const passwordRepeat = req.body.pwdRepeat;

  if(password === passwordRepeat){
    conn.query(`INSERT INTO Users (Fname, Lname, Sex, uidUsers, emailUsers, pwdUsers) Values (?,?,?,?,?,?)`, [first, last, sex, user, email, password], function (err, result, fields) {
      if (err){
        if(err.code == 'ER_DUP_ENTRY' || err.errno == 1062){
          console.log("Usertaken");
          return res.redirect('/signup?error=usertaken');
        }else{
          throw err;
        }
      }
      res.redirect('/signup?signup=success');
    });
  }else{
    return res.redirect('/signup?error=passwordsNotIdentical');
  }
});

app.post("/search",urlencodedParser, function(req,res,next){
  const search = req.body.searchUsers;
  conn.query("SELECT * FROM Users WHERE uidUsers LIKE ?", '%' + search + '%' ,function(err,result, fields){
    if (err) throw err;
    console.log("Connected to search with " + result.length + " results");
    res.render("search", {title: 'User List', searchResult: result});
  });
});

app.post("/dashboard", check('feedPost', 'Feed post empty').not().isEmpty(), urlencodedParser, function(req, res){
  if(Object.hasOwnProperty.call(req.body, "bio")){ //Checking to see what button was pressed based on property
    const bio = req.body.bio;

    conn.query("UPDATE Users SET Bio = ? WHERE idUsers = ?", [bio, req.session.idUsers] ,function(err,result, fields){
      if (err) throw err;
      console.log("Updated Bio");
      //console.log(req.body);
      res.redirect("dashboard");
    });
  }else if(Object.hasOwnProperty.call(req.body, "feedPost")) {
    const feed = req.body.feedPost;
    const time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
    conn.query(`INSERT INTO Feed (idUsers, Feed_Post, Date_Time) Values (?,?,?)`, [req.session.idUsers, feed, time], function(err,result, fields){
      if (err) throw err;
      console.log("Posted to feed");
      //console.log(req.body);
      res.redirect("dashboard");
    });
  }

});
