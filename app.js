//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require('lodash');
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const GithubStrategy = require("passport-github");

// const bcyrpt = require("bcrypt"); //bcrypting password 
// const saltrounds = 10;
// const encrypt = require("mongoose-encryption"); // encryption


const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret:"Our little secret . ",
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());
                             
mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema ({
    email:String,
    password:String,
    googleId:String,
    githubId:String,
    secret:String
});

userSchema.plugin(passportLocalMongoose);
// userSchema.plugin(encrypt,{secret:process.env.SECRET, encryptedFields: ["password"] }); // plugin encryption
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user,done) { 
    done(null,user.id); 
});

passport.deserializeUser(function (id,done) { 
    User.findById(id,function (err,user) { 
        done(err,user);
     });
 });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret:process.env.CLIENT_SECRET,
    callbackURL:"http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb){
    User.findOrCreate({googleId:profile.id},function(err, user){
        return cb(err, user);
    });
}
));

passport.use(new GithubStrategy({
    clientID:process.env.GITHUB_ID,
    clientSecret:process.env.GITHUB_SECRET,
    callbackURL:"http://localhost:3000/auth/github/secrets"
},function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ githubId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


//Get requests                          
app.get("/",function(req,res){
    res.render("home");                    
                               
});

app.get("/auth/google", 
    passport.authenticate("google",{ scope: ["profile"] })
 );
   
 app.get("/auth/github", 
 passport.authenticate("github",{ scope: ["profile"] })
);


app.get("/login",function(req,res){
    res.render("login");                    
                               
});

app.get("/secrets",function (req,res) { 
  User.find({"secret":{$ne:null}}, function (err,foundUsers) { 
    if(err){
        console.log(err);
    }else{
        if(foundUsers){
            res.render("secrets",{usersWithSecrets:foundUsers});
        }
    }
   })
 });

app.get("/register",function(req,res){
    res.render("register");                    
                               
});

app.get("/logout",function(req,res){

    req.logOut(function(err){
        if(err){
            console.log(err);
        } else{
            res.redirect("/");
        }
    });
    
});
 
app.get("/auth/google/secrets",
    passport.authenticate("google",{failureRedirect:"/login"}),function (req,res) { 
     res.redirect("/secrets") ;  
     
 });

 app.get("/auth/github/secrets", 
  passport.authenticate('github', { failureRedirect: '/login' }),function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

 app.get("/submit",function (req,res) { 
    if(req.isAuthenticated){
        res.render("submit");
       } else{
        res.redirect("/login");
       }
  });

  app.post("/submit",function (req,res) { 
    const submittedSecret = req.body.secret;
    const Id = req.user.id;
    

    User.findById(Id,function (err,foundUser) { 
        if(err){
           console.log(err); 
        }else{
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(function () { 
                    res.redirect("/secrets");
                 });
            }
        }
     });
   
});

app.post("/register",function (req,res) {

    User.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else {
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");    
            });
        }
    });

    });

  app.post("/login",function (req,res) {
    const user = new User({
        username:req.body.username,
        password:req.body.password
    });
   req.login(user,function(err){
    if(err){
    console.log();
    } else{
        passport.authenticate("local")(req,res,function () { 
            res.redirect("/secrets");
         });
    }
   });

  });
                                 
                                    
                                    
  let port = process.env.PORT;
  if(port == null || port == ""){
    port = 3000;
  }
                                   
                                    
                                    
                                    
app.listen(port,function(){
console.log("Server is up and running 3000");
}); 




