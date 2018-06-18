/*ESSENTIALS */
var express = require('express');
var bodyParser = require('body-parser');
var postData = bodyParser.urlencoded({extended: false});
var app = express();
var path = require("path");
/*ESSENTIALS */
/*MY SQL STUFF AND SESSIONS */
var sql = require("mysql");
var pool = sql.createPool({
                connectionLimit : 150,
                host     : '127.0.0.1',
                user     : 'root',
                password : '',
                database : 'dbname',
                debug    :  false
          });
var session = require("express-session");
var MySQLStore = require('express-mysql-session')(session);
var sessionStore = new MySQLStore({},pool);
/*MY SQL STUFF AND SESSIONS */
/*FILE PATHING AND FORMS */
var path = require('path');
var formidable = require('formidable');
var fs = require('fs');
var util = require('util');
/*FILE PATHING AND FORMS */
/*TELLING THE PAGES WHERE TO LOOK FOR FILES */
app.use(express.static('assets'));
app.use('/gamePage', express.static('assets'));
app.use('/profile', express.static('assets'));
app.use('/messages', express.static('assets'));
app.use('/games', express.static('assets'));
app.use('/Achievement', express.static('assets'));
app.use('/search', express.static('assets'));
/*TELLING THE PAGES WHERE TO LOOK FOR FILES */
/*FINALIZING SESSIONS AND VIEW ENGINE */
app.set('view engine', 'ejs');
app.use(session({secret:"mbmbmb",
                store: sessionStore,
                saveUninitialized: true,
                resave: true}));
/*FINALIZING SESSIONS AND VIEW ENGINE */

app.get('/', function(req, res){
  if(!req.session.user){
    res.render('index', {flag: 0});
  }else{
    res.redirect('/profile');
  }
});

app.post('/register', postData, function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    if(fields.reg == 1){
      getQuery("select * from Users where username = '"+fields.username+"' ",res,function(result){
        if(result.length == 0) {
          getQuery("select * from Users where Email = '"+fields.email+"' ",res,function(result){
            if(result.length == 0) {
              getQuery("INSERT INTO Users VALUES (NULL,'"+fields.username+"','"+fields.password+"','"+fields.email+"', DEFAULT, DEFAULT, DEFAULT, DEFAULT, DEFAULT)",res,function(result){});
              res.send("good");
            } else {
              res.send("Email is already taken!");
            }
          });
        } else {
            res.send("Username is already taken!");
        }
      });
    }else if(fields.reg == -1){
      getQuery("select * from Users where username = '"+fields.username+"' ",res,function(result){
        if(result.length == 0) {
            res.send("good");
        } else {
            res.send("Username is already taken!");
        }
      });
    }else{
      getQuery("select * from Users where Email = '"+fields.mail+"' ",res,function(result){
        if(result.length == 0) {
            res.send("good");
        } else {
            res.send("Email is already taken!");
        }
      });
    }
  });
});

app.get('/logout', function(req, res){
  req.session.destroy();
  res.redirect('/');
});

app.get('/search', function(req, res){
  if(!req.session.user){
    res.render('index', {flag: 0});
  }else{
    res.render('search', {userID: req.session.userID, name: req.session.user});
  }
});

app.get('/profile', function(req, res){
  if(!req.session.user){
    res.redirect('/');
  }else{
    getQuery("select * from users where userID = "+req.session.userID+"",res,function(result){
      getQuery("select * from games a where a.GameID IN (SELECT b.Game_ID as GameID from game_followers b WHERE b.Follower_ID = "+req.session.userID+")",res,function(result2){
        getQuery("select * from game_newsfeed a inner join game_followers b on a.GameID = b.Game_ID where b.Follower_ID = "+req.session.userID+"",res,function(result3){
          getQuery("select * from users a where a.userID IN (SELECT b.user_ID2 as userID from user_buddies b WHERE b.user_ID = "+req.session.userID+" AND accepted = 1 union SELECT b.user_ID as userID from user_buddies b WHERE b.user_ID2 = "+req.session.userID+" AND accepted = 1)",res,function(result4){
            getQuery("select * from users a where a.userID IN (SELECT b.user_ID as userID from user_buddies b WHERE b.user_ID2 = "+req.session.userID+" AND accepted = 0)",res,function(result5){
              getQuery("select * from user_newsfeed a where a.user_ID IN (SELECT b.user_ID2 as userID from user_buddies b WHERE b.user_ID = "+req.session.userID+" AND accepted = 1 union SELECT b.user_ID as userID from user_buddies b WHERE b.user_ID2 = "+req.session.userID+" AND accepted = 1)",res,function(result6){
                getQuery("select * from user_newsfeed where user_ID = "+req.session.userID+"",res,function(result7){
                  res.render('profile', {userID: req.session.userID, name: req.session.user, rights: req.session.admin, user: result, games: result2, gamefeed: result3, friends: result4, yourFeed: result7, friendFeed: result6, friendRequests: result5});
                });
              });
            });
          });
        });
      });
    });
  }
});

app.get('/games', function(req, res){
  if(!req.session.user){
    res.redirect('/');
  }else{
    getQuery("select * from games where Approved = 1",res,function(result){
      getQuery("select * from platforms",res,function(result2){
        res.render('games', {userID: req.session.userID, name: req.session.user, games: result, platforms: result2, rights: req.session.admin});
      });
    });
  }
});

app.get('/acceptGames', function(req, res){
  if(!req.session.admin){
    res.render('index', {flag: 0});
  }else{
    getQuery("select * from games where Approved = 0",res,function(result){
        getQuery("select a.userID, a.username from users a inner join games b on a.userID = b.Creator_ID where b.Approved = 0;",res,function(result2){
            res.render('acceptGames', {userID: req.session.userID, name: req.session.user, games: result, users: result2});
        });
    });
  }
});

app.get('/addgame', function(req, res){
  if(!req.session.user){
    res.redirect('/');
  }else{
    getQuery("select Platform_Name from platforms",res,function(result){
      if(result.length == 0) {
          res.redirect('/');
      } else {
        res.render('addgame', {userID: req.session.userID, name: req.session.user, platforms: result});
      }
    });
  }
});

app.get('/messages', function(req, res){
  if(!req.session.user){
    res.redirect('/');
  }else{
    getQuery("select * from privatemessages where RecepientID = '"+req.session.userID+"'",res,function(result){
      getQuery("select * from users a join privatemessages b on a.userID = b.SenderID where b.RecepientID = '"+req.session.userID+"'",res,function(result2){
        res.render('messages', {userID: req.session.userID, name: req.session.user, messages: result, users: result2});
      });
    });
  }
});

app.get('/addAchievement', function(req, res){
  if(!req.session.user){
    res.redirect('/');
  }else{
    res.render('addAchievement', {userID: req.session.userID, name: req.session.user});
  }
});

app.get('/Achievement', function(req, res){
  if(!req.session.user){
    res.redirect('/');
  }else{
    getQuery("select * from trophies",res,function(result){
      getQuery("select * from user_trophies where userID = '"+req.session.userID+"'",res,function(result2){
        getQuery("select * from users where userID = '"+req.session.userID+"'",res,function(result3){
          res.render('achievement', {userID: req.session.userID, user: result3, name: req.session.user, rights: req.session.admin, trophies: result, usertrophies: result2});
        });
      });
    });
  }
});

app.get('/profile/:username', function(req, res){
  if(!req.session.user){
    res.redirect('/');
  }else{
    getQuery("select * from users where username = '"+req.params.username+"'",res,function(result){
      if(result.length == 0) {
        res.redirect('/');
      } else if(result[0].userID == req.session.userID){
        res.redirect('/profile');
      } else {
        getQuery("select * from user_newsfeed where user_ID = "+result[0].userID+"",res,function(result3){
          getQuery("select * from games a where a.GameID IN (SELECT b.Game_ID as GameID from game_followers b WHERE b.Follower_ID = "+result[0].userID+")",res,function(result4){
            getQuery("select * from user_buddies where (user_ID = "+result[0].userID+" AND user_ID2 = "+req.session.userID+") OR (user_ID = "+req.session.userID+" AND user_ID2 = "+result[0].userID+")",res,function(result2){
              if(result2.length == 0) {
                res.render('profileOthers', {userID: req.session.userID, name: req.session.user, rights: req.session.admin, userprofile: result, friends : 0, newsfeed: result3, games: result4});
              } else {
                if(result2[0].accepted == 1){
                  res.render('profileOthers', {userID: req.session.userID, name: req.session.user, rights: req.session.admin, userprofile: result, friends : 2, newsfeed: result3, games: result4});
                }else if(result2[0].user_ID2 == req.session.userID){
                  res.render('profileOthers', {userID: req.session.userID, name: req.session.user, rights: req.session.admin, userprofile: result, friends : 3, newsfeed: result3, games: result4});
                }else{
                  res.render('profileOthers', {userID: req.session.userID, name: req.session.user, rights: req.session.admin, userprofile: result, friends : 1, newsfeed: result3, games: result4});
                }
              }
              });
            });
          });
        }
    });
  }
});

app.get('/gamePage/:gamename', function(req, res){
  if(!req.session.user){
    res.redirect('/');
  }else{
    getQuery("select * from games where gameID = '"+req.params.gamename+"'",res,function(result){
      if(result.length == 0) {
        res.redirect('/');
      } else {
        getQuery("select Platform_Name from platforms where Platform_ID = '"+result[0].Platform+"'",res,function(result2){
          getQuery("select username from users where userID = '"+result[0].Creator_ID+"'",res,function(result3){
            getQuery("select * from game_newsfeed where GameID = "+result[0].GameID+"",res,function(result4){
              getQuery("select * from game_followers where Game_ID = "+result[0].GameID+" AND Follower_ID = "+req.session.userID+"",res,function(result5){
                getQuery("select * from user_ratings where GameID = "+result[0].GameID+" AND userID = "+req.session.userID+"",res,function(result6){
                  getQuery("select * from user_ratings where GameID = "+result[0].GameID+"",res,function(result7){
                    var rate;
                    if(result7.length == 0){
                      rate = 0;
                    }else{
                      rate = result[0].Rating / result7.length
                    }
                    res.render('gamePage', {userID: req.session.userID, name: req.session.user, rights: req.session.admin, game: result, platform: result2, creator: result3, newsfeed: result4, follow: (result5.length == 0) ? 0 : 1, rated: (result6.length == 0) ? 0 : 1, rating: rate});
                  });
                });
              });
            });
          });
        });
      }
    });
  }
});

app.post('/sendMessage', postData, function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
  if(!req.session.user){
    res.redirect('/');
  }else{
    getQuery("select userID from users where username = '"+fields.receiver+"'",res,function(result){
      if(result.length == 0){
        res.send("bad");
      }else{
        var date;
        date = new Date();
        date = date.getUTCFullYear() + '-' +
            ('00' + (date.getUTCMonth()+1)).slice(-2) + '-' +
            ('00' + date.getUTCDate()).slice(-2) + ' ' +
            ('00' + date.getUTCHours()).slice(-2) + ':' +
            ('00' + date.getUTCMinutes()).slice(-2) + ':' +
            ('00' + date.getUTCSeconds()).slice(-2);
        getQuery("INSERT INTO privatemessages VALUES (DEFAULT, '"+fields.title+"', "+req.session.userID+", '"+result[0].userID+"',  '"+fields.content+"', 0, '"+date+"')",res,function(result){
          res.send("good");
        });
      }
    });
  }
  });
});

app.post('/Approve', postData, function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
  if(!req.session.user){
    res.redirect('/');
  }else{
    if(fields.operation == 0){
      getQuery("UPDATE games SET Approved = 1 WHERE GameID='"+fields.gamename+"'",res,function(result){});
      res.send();
    }else{
      getQuery("DELETE FROM games WHERE GameID = '"+fields.gamename+"'",res,function(result){});
      res.send();
    }
  }
  });
});

app.post('/FriendResponse', postData, function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
  if(!req.session.user){
    res.redirect('/');
  }else{
    if(fields.operation == "accept"){
      getQuery("UPDATE user_buddies SET accepted = 1 WHERE user_ID = '"+fields.friendID+"' AND user_ID2 = '"+req.session.userID+"'",res,function(result){});
    }else{
      getQuery("DELETE FROM user_buddies WHERE (user_ID = '"+fields.friendID+"' AND user_ID2 = '"+req.session.userID+"') OR (user_ID = '"+req.session.userID+"' AND user_ID2 = '"+fields.friendID+"')",res,function(result){});
    }
    res.send();
  }
  });
});

app.post('/markedRead', postData, function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
  if(!req.session.user){
    res.redirect('/');
  }else{
    getQuery("UPDATE privatemessages SET Marked = 1 WHERE MessageID = '"+fields.messageID+"'",res,function(result){});
    res.send();
  }
  });
});

app.post('/gameAdded', postData, function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
  if(!req.session.user){
    res.redirect('/');
  }else{
    getQuery("select Platform_ID from platforms where Platform_Name = '"+fields.platform+"'",res,function(result){
      if(result.length == 0) {
          res.redirect('/');
      } else {
        getQuery("INSERT INTO games VALUES (NULL,'"+fields.name+"',DEFAULT,'"+req.session.userID+"', '"+result[0].Platform_ID+"',DEFAULT,'"+fields.description+"',DEFAULT)",res,function(result){});
        res.send();
      }
    });
  }
  });
});

app.post('/gamenewsAdded', postData, function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
  if(!req.session.user){
    res.redirect('/');
  }else{
    var date;
    date = new Date();
    date = date.getUTCFullYear() + '-' +
        ('00' + (date.getUTCMonth()+1)).slice(-2) + '-' +
        ('00' + date.getUTCDate()).slice(-2) + ' ' +
        ('00' + date.getUTCHours()).slice(-2) + ':' +
        ('00' + date.getUTCMinutes()).slice(-2) + ':' +
        ('00' + date.getUTCSeconds()).slice(-2);
    getQuery("INSERT INTO game_newsfeed VALUES (DEFAULT,"+fields.gameID+",'"+fields.news+"','"+date+"')",res,function(result){});
    res.send();
  }
  });
});

app.post('/postUserfeed', postData, function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
  if(!req.session.user){
    res.redirect('/');
  }else{
    var date;
    date = new Date();
    date = date.getUTCFullYear() + '-' +
        ('00' + (date.getUTCMonth()+1)).slice(-2) + '-' +
        ('00' + date.getUTCDate()).slice(-2) + ' ' +
        ('00' + date.getUTCHours()).slice(-2) + ':' +
        ('00' + date.getUTCMinutes()).slice(-2) + ':' +
        ('00' + date.getUTCSeconds()).slice(-2);
    getQuery("INSERT INTO user_newsfeed VALUES (DEFAULT,"+req.session.userID+",'"+fields.newsfeed+"','"+date+"')",res,function(result){});
    res.send();
  }
  });
});

app.post('/gameFollow', postData, function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
  if(!req.session.user){
    res.redirect('/');
  }else{
    if(fields.operation == 0){
      getQuery("INSERT INTO game_followers VALUES ("+fields.game+","+req.session.userID+")",res,function(result){});
      getQuery("UPDATE games SET followers = followers + 1 WHERE GameID = "+fields.game+"",res,function(result){});
    }else{
      getQuery("DELETE FROM game_followers WHERE Game_ID = "+fields.game+" AND Follower_ID = "+req.session.userID+"",res,function(result){});
      getQuery("UPDATE games SET followers = followers - 1 WHERE GameID = "+fields.game+"",res,function(result){});
    }
    res.send();
  }
  });
});

app.post('/searchData', postData, function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    getQuery("select * from Users where username like '%"+fields.search+"%' ",res,function(result){
      getQuery("select * from games where game_name like '%"+fields.search+"%' ",res,function(result2){
        res.json({user: result, game: result2});
      });
    });
  });
});

app.post('/searchGame', postData, function(req, res){
  var form = new formidable.IncomingForm();
  var rate;
  form.parse(req, function(err, fields, files) {
    if(fields.platform == "mycreation"){
      getQuery("select * from Games where Creator_ID = "+req.session.userID+" and Approved = 1",res,function(result){
        res.json({game: result});
      });
    }
    else{
      getQuery("select Platform_ID from platforms where Platform_Name = '"+fields.platform+"'",res,function(result){
        if(result.length != 0){
          getQuery("select * from Games where Game_Name like '%"+fields.search+"%' and Approved = 1 and Platform = "+result[0].Platform_ID+" ",res,function(result){
            res.json({game: result});
          });
        }else{
          getQuery("select * from Games where Game_Name like '%"+fields.search+"%' and Approved = 1 ",res,function(result){
            res.json({game: result});
          });
        }
      });
    }
  });
});

app.post('/login', postData, function(req, res){
  getQuery("select * from Users where username = '"+req.body.user+"' AND password = '"+req.body.pass+"' ",res,function(result){
    if(result.length == 0) {
        res.render('index', {flag: 4});
    } else {
        if(result[0].Rank == 1){
          req.session.admin = 1;
        }else{
          req.session.admin = 0;
        }
        req.session.user = req.body.user;
        req.session.userID = result[0].userID;
        req.session.userpic = result[0].profilepic;
        res.redirect('/profile');
    }
  });
});

app.post('/rate', postData, function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
  if(!req.session.user){
    res.redirect('/');
  }else{
    getQuery("INSERT INTO user_ratings VALUES ("+req.session.userID+","+fields.game+","+fields.rate+")",res,function(result){});
    getQuery("UPDATE games SET Rating = Rating + "+fields.rate+" WHERE GameID = "+fields.game+"",res,function(result){});
    res.send();
  }
  });
});

app.post('/addChievement', postData, function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
  if(!req.session.user){
    res.redirect('/');
  }else{
    var type;
    if(fields.type == 'Buddy Count'){
      type = 0;
    }else if(fields.type == 'Developed Count'){
      type = 1;
    }else if(fields.type == 'Follower Count'){
      type = 2;
    }else{
      type = 0;
    }
    getQuery("INSERT INTO trophies VALUES (DEFAULT,'"+type+"','"+fields.count+"','"+fields.name+"','"+fields.description+"','"+fields.exp+"')",res,function(result){});
    res.send();
  }
  });
});

app.post('/AddPlatform', postData, function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    getQuery("INSERT INTO platforms VALUES (DEFAULT,'"+fields.platform+"')",res,function(result){});
    res.send();
  });
});

app.post('/claimChievement', postData, function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
  if(!req.session.user){
    res.redirect('/');
  }else{
    getQuery("SELECT * from trophies where Achievement_ID = "+fields.trophyID+"",res,function(result){
      if(result.length > 0){
        getQuery("SELECT userID from user_trophies where userID = '"+req.session.userID+"' and trophyID = "+fields.trophyID+"",res,function(result2){
          if(result2.length == 0){
              var n = extractQuery(result[0].Achievement_Type, req);
              getQuery(n,res,function(result3){
                if(result3.length >= result[0].Count){
                  console.log(result3.length);
                  console.log(result[0].Count);
                    getQuery("SELECT * from users where userID = '"+req.session.userID+"'",res,function(result4){
                      var userget = doLevelUp(result4, result[0].Exp);
                      getQuery("UPDATE users SET Level = "+userget[0].Level+", Exp = "+userget[0].Exp+", Next = "+userget[0].Next+" WHERE userID = "+req.session.userID+"",res,function(result){});
                      getQuery("INSERT INTO user_trophies VALUES (DEFAULT,"+req.session.userID+","+fields.trophyID+")",res,function(result){});
                      res.send("Achievement Claimed!");
                    });
                }else{
                    res.send("Not eligible for this Achievement!");
                }
              });
            }else{
              res.redirect('/');
            }
        });
      }else{
        res.redirect('/');
      }
    });
  }
  });
});

app.post('/addBuddy', postData, function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
  if(!req.session.user){
    res.redirect('/');
  }else{
    getQuery("INSERT INTO user_buddies VALUES ('"+req.session.userID+"','"+fields.name+"',0)",res,function(result){});
    res.send();
  }
  });
});

app.post('/uploadGamePic', postData, function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
  if(!req.session.user){
    res.redirect('/');
  }else{
    if(fields.gamedesc != ""){
      getQuery("UPDATE games SET Description = '"+fields.gamedesc+"' WHERE GameID = "+fields.game+"",res,function(result){});
    }
    if(files['picture']){
      if(files['picture'].type.substring(0, 5) == "image"){
        fs.rename(files['picture'].path, __dirname+"/assets/gamepics/"+fields.game+"");
      }
    }
    if(files['cover']){
      if(files['cover'].type.substring(0, 5) == "image"){
        fs.rename(files['cover'].path, __dirname+"/assets/gamepics/cover/"+fields.game+"");
        res.send();
      }else{
        res.send();
      }
    }else{
        res.send();
    }
  }
  });
});

app.post('/uploadProfPic', postData, function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
  if(!req.session.user){
    res.redirect('/');
  }else{
    if(fields.desc != ""){
      getQuery("UPDATE users SET AboutMe = '"+fields.desc+"' WHERE userID = "+req.session.userID+"",res,function(result){});
    }
    if(files['picture']){
      if(files['picture'].type.substring(0, 5) == "image"){
        fs.rename(files['picture'].path, __dirname+"/assets/ppics/"+req.session.userID+"");
        res.send();
      }else{
        res.send();
      }
    }else{
      res.send();
    }
  }
  });
});

function getQuery(query, res, callback){
  pool.getConnection(function(err, connection){
    if(err){
      console.log(err);
      res.redirect('/');
      return null;
    }else{
      connection.query(query,function(err, result, field){
        if(err){
          console.log(err);
          connection.release();
          res.redirect('/');
        }else{
          connection.release();
          return callback(result);
        }
      });
    }
  });
}

function extractQuery(type, req){
  if(type == 0){
    return "SELECT user_ID from user_buddies where (user_ID = '"+req.session.userID+"' or user_ID2 = '"+req.session.userID+"') and accepted = 1";
  }else if(type == 1){
    return "SELECT GameID from games where Creator_ID = '"+req.session.userID+"' and Approved = 1";
  }else{
    return "SELECT a.Game_ID from game_followers a join games b on a.Game_ID = b.GameID where b.Creator_ID = '"+req.session.userID+"' and b.Approved = 1";
  }
}

function doLevelUp(result, exp){
    result[0].Exp = result[0].Exp + exp;
    while(result[0].Exp >= result[0].Next){
      result[0].Level++;
      result[0].Exp = result[0].Exp - result[0].Next;
      result[0].Next = result[0].Next * 1.5;
    }
    return result;
}
app.listen(8888);
