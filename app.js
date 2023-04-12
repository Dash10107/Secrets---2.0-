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

const app = express();



//Lets make this better and make it delete the secret to and make it a array got it bro lets make it what we wanted to lets go 

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set('view engine', 'ejs');

//Create a session 

app.use(session({
    secret:"Our little secret . ",
    resave:false,
    saveUninitialized:false
}));

//initialize passport
app.use(passport.initialize());
app.use(passport.session());
                             
mongoose.connect(process.env.DB)
.then(()=>{
    console.log("Database Connected Successfully")
})
.catch((err)=>{console.log(err)});

const userSchema = new mongoose.Schema ({
    email:String,
    password:String,
    googleId:String,
    githubId:String,
    secret:[String]
});

var secrets = [];
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user,done) { 
    done(null, user.id);
});

passport.deserializeUser(function (id,done) { 
    User.findById(id, function(err, user) {
        done(err, user);
      });
 });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret:process.env.CLIENT_SECRET,
    callbackURL:process.env.GOOGLE_CALLBACK_URL
},
function(accessToken, refreshToken, profile, cb){
    User.findOrCreate({username: profile.emails[0].value,googleId:profile.id},function(err, user){
        return cb(err, user);
    });
}
));

passport.use(new GithubStrategy({
    clientID: process.env.GITHUB_ID,
    clientSecret: process.env.GITHUB_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({username:profile.username,githubId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
                         
app.get("/",function(req,res){
    
    if(req.isAuthenticated())
    res.redirect("/secrets");
    else 
    res.render("home");              
                               
});

app.get("/auth/google", 
    passport.authenticate("google",{ scope: ["profile","email"] })
 );
   
 app.get("/auth/github", 
 passport.authenticate("github",{ scope: ["profile","username"] })
);


app.get("/login",function(req,res){
    res.render("login");                    
                               
});

app.get("/register",function(req,res){
    res.render("register");                    
                               
});

app.get("/logout",function(req,res){
    //Log-out off the session 
      req.logout((err)=>{
        if(err)
        console.log(err);
        else
        console.log("Log Out Successfully");
      });
      res.redirect("/");
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

  app.get("/submit",function(request,myServerResponse){
    if(request.isAuthenticated())
    myServerResponse.render("submit");
    else 
    myServerResponse.redirect("/login");
});


  app.get("/secrets",function(request,res){
    const id = request.user.id;
     User.findById(id,(err,user)=>{
        if(err) console.log(err);
        else{
        const secretsArr = user.secret;
            res.render("secrets",{secrets:secretsArr});
        }
    })
  

});


  app.post("/submit",function (req,res) { 
    const submittedSecret  = req.body.secret;
    const userprofile = req.user.id;
    User.findByIdAndUpdate(userprofile,{$push : {secret : submittedSecret}},function(err,foundUser){
        if(err)
        console.log(err);
        else if(foundUser){
            console.log("Added Secret Succesfully");
           res.redirect("/secrets");
        }
});
   
});

app.post("/register",function(req,res){
    //Registering the username nad password and authenticating using local strategy by passport-local-mongoose
        User.register({username: req.body.username},req.body.password,function(err,user){
                   if(err)
                   {
                       //If any error occurs,user is redirected to register route
                   console.log(err);
                   res.redirect("register");
                   }
                   else{
                       //else the user is authenticated and redirected to /secrets route
                    passport.authenticate("local")(req,res,function(){
                           res.redirect("/secrets");
                    });
                   }
        });
    });


  app.post("/login",function (req,res) {
    const user = new User({
        username : req.body.username,
        password : req.body.password
   });
   //Requests a login and authenticates it when the user is found
   req.login(user,function(err){
         if(err)
         console.log(err);
         else{
               passport.authenticate('local')(req,res,function(){
                    res.redirect("/secrets");
               });
         }
   });

  });
                                 
                                    
  //delete a secret 
  
  app.post("/delete",function(req,res){
    const id = req.user.id;
   const deleteSecret = req.body.Delete;
   User.findByIdAndUpdate(id,{$pull : {secret : deleteSecret}},function(err,foundUser){
    if(err)
    console.log(err);
    else if(foundUser){
        console.log("Deleted  Secret Succesfully");
       res.redirect("/secrets");
    }
  });
});
  




  let port = process.env.PORT;
  if(port == null || port == ""){
    port = 3000;
  }
                                   
                                    
                                    
                                    
app.listen(port,function(){
console.log("Server is up and running on port :" + port);
}); 




