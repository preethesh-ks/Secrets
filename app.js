require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
// const md5 = require("md5");//hashing 
const app = express();
const mongoose = require("mongoose");
const session = require('express-session')
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
// const encrypt = require("mongoose-encryption")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
    secret:"our little string.",
    resave:false,
    saveUninitialized:false,
}));
app.use(passport.initialize());
app.use(passport.session());

// main().catch(err => console.log(err));
// async function main() {
//     mongoose.set('strictQuery', true);
//   await mongoose.connect('mongodb://localhost:27017/userDB');  
// //   await mongoose.connect('mongodb+srv://crystal_clear:An754d57ee6gyPDg@cluster0.qzdyhxz.mongodb.net/blogDB?retryWrites=true&w=majority')
//   }
main().catch(err => console.log(err));
async function main() {
  mongoose.set('strictQuery', true);
  //mongoose.connect(process.env.CONNECT_URL);
  mongoose.connect("mongodb://root:root@144.24.143.145:1234/secretsDB?authSource=admin")
  console.log("connected to mongodb server");
}


const userSchema = new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// const secret = process.env.SECRET  //env in learn
// userSchema.plugin(encrypt, { secret: process.env.SECRET,encryptedFields:["password"] });

const User = new mongoose.model("User",userSchema);
passport.use(User.createStrategy())
// passport.serializeUser(User.serializeUser()); only local verification
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:9000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
    res.render("home");
});
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });

app.get("/login",function(req,res){
    res.render("login");
});
app.get("/register",function(req,res){
    res.render("register");
});
app.get("/secrets",function(req,res){
    User.find({"secret":{$ne:null}},function(err,foundUsers){
      if(err){
        console.log(err);
      }else{
          if(foundUsers){
            res.render("secrets",{userWithSecret:foundUsers})
          }
      }
    });
});

app.get("/submit",function(req,res){
   if(req.isAuthenticated()){
          res.render("submit");  
    }else{
        res.redirect("/login");
    }
});

app.post("/submit",function(req,res){
  const submitSecret = req.body.secret;
    console.log(req.user.id);

    User.findById(req.user.id,function(err,foundUser){
      if(err){
        console.log(err);
      }else{
        if(foundUser){
          foundUser.secret =submitSecret;
          foundUser.save(function(){
            res.redirect("/secrets")
          })
        }
      }
    })
  
});
app.get("/logout", function(req,res) {
    req.logout(function(err) {
        if(err) {
            console.log(err);
        }
    });
    res.redirect("/");
});

// app.post("/register",function(req,res){

    
// User.register({username:req.body.username},req.body.password),function(err,user){
//     if(err){
//         console.log(err);
//         res.redirect("/register");
//     }else{
//         passport.authenticate("local")(req,res,function(err){
//             console.log(err);
//             res.render("secrets")
//         })
//     }
//     }
// }
    
    
// );
app.post("/register", function(req,res){

  User.register({username:req.body.username},req.body.password,function(err,user){

    if(err){

      console.log("Error in registering.",err);

      res.redirect("/register");

    }else{

      passport.authenticate("local")(req,res, function(){

      console.log(user,101);

        res.redirect("/secrets");

    });

}})
});


app.post("/login",function(req,res){
 const user = new User({
    username:req.body.username,
    password: req.body.password
 })

    req.login(user,function(err){
        if(err){
            console.log(err);
        }else{
             passport.authenticate("local")(req,res, function(){

    //   console.log(user,101);

        res.redirect("/secrets");

    });
        }
    })



})






app.listen(9000, function() {
  console.log("Server started on port 9000");
}); 