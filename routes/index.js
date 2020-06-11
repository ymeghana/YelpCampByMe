var express = require("express"),
    router = express.Router(),
    User = require('../models/user'),
    Campground = require('../models/campground')
    passport = require("passport")
    async = require("async")
    nodemailer = require("nodemailer")
    crypto =require("crypto")
    middleware = require('../middleware')
//root route
router.get("/",(req,res)=>{
    res.render("landing")
})

//====================
//AUTH ROUTES
//====================
router.get("/register",(req,res)=>{
    res.render("register",{page:'register'})
})
//handle signup
router.post("/register",(req,res)=>{
    var newUser = new User({
        username: req.body.username,
        firstName:req.body.firstName,
        lastName: req.body.lastName,
        email:req.body.email,
        avatar:req.body.avatar
    })
    if(req.body.adminCode === 'secretcode123'){ //give your own user code
        newUser.isAdmin = true;
    }
    User.register(newUser,req.body.password,(err,user)=>{
        if(err){
            //console.log(err)
            req.flash("error",err.message)
            return res.render('register',{error:err.message})
        }
        passport.authenticate("local")(req,res,()=>{
            req.flash("success","Welcome to YelpCamp " + user.username)
            res.redirect('/campgrounds')
        })
    })
})

//show login form
router.get("/login",(req,res)=>{
    res.render("login",{page:'login'})
})
//handling login logic
router.post("/login",passport.authenticate("local",{
    successRedirect:"/campgrounds",
    failureRedirect:"/login",
    failureFlash: true,
    successFlash: "Welcome to YelpCamp"
}),(req,res)=>{
})

router.get("/logout",(req,res)=>{
    req.logOut()
    req.flash("success","Logged you out!!")
    res.redirect("/campgrounds")
})

router.get("/forgot",middleware.isLoggedIn,(req,res)=>{
    res.render("forgot")
})

router.post("/forgot",middleware.isLoggedIn,(req,res,next)=>{
    async.waterfall([
        function(done){
            crypto.randomBytes(20,(err,buf)=>{
                var token = buf.toString('hex')
                done(err,token)
            })
        },
        function(token,done){
            User.findOne({email:req.body.email},(err,user)=>{
                if(!user){
                    req.flash("error","No account with that email address exists");
                    return res.redirect('/forgot')
                }

                user.resetPasswordToken = token
                user.resetPasswordExpires = Date.now() + 3600000 //1hr
                
                user.save((err)=>{
                    done(err,token,user)
                })
            })
        },
        function(token,user,done){
            var smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth:{
                    //https://myaccount.google.com/lesssecureapps is for this below mail
                    user:'webdevlove128@gmail.com',
                    pass: process.env.EMAIL_PWD
                }
            })
            var mailOptions = {
                to:user.email,
                from: 'webdevlove128@gmail.com',
                subject:'Yelp Camp Password Reset',
                text:'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                'If you did not request this, please ignore this email and your password will remain unchanged.\n'
            }
            smtpTransport.sendMail(mailOptions,(err)=>{
                console.log('mail sent')
                req.flash("success","An email has been sent to "+ user.email + ' with further instructions')
                done(err,'done')
            })
        }
    ],function(err){
        if(err) return next(err)
        res.redirect('/forgot')
    })
})
router.get('/reset/:token', function(req, res) {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      res.render('reset', {token: req.params.token});
    });
  });
  
  router.post('/reset/:token', function(req, res) {
    async.waterfall([
      function(done) {
        User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
          if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
          }
          if(req.body.password === req.body.confirm) {
            user.setPassword(req.body.password, function(err) {
              user.resetPasswordToken = undefined;
              user.resetPasswordExpires = undefined;
  
              user.save(function(err) {
                req.logIn(user, function(err) {
                  done(err, user);
                });
              });
            })
          } else {
              req.flash("error", "Passwords do not match.");
              return res.redirect('back');
          }
        });
      },
      function(user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          auth: {
            user:'webdevlove128@gmail.com',
            pass: process.env.EMAIL_PWD
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'webdevlove128@gmail.com',
          subject: 'Your password has been changed',
          text: 'Hello,\n\n' +
            'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      }
    ], function(err) {
      res.redirect('/campgrounds');
    });
  });
//USER PROFILE
router.get("/users/:id",(req,res)=>{
    User.findById(req.params.id,(err,foundUser)=>{
        if(err){
            req.flash("error","User not found!")
            res.redirect("/")
        }
        Campground.find().where('author.id').equals(foundUser._id).exec((err,campgrounds)=>{
            if(err){
                req.flash("error","User not found!")
                res.redirect("/")
            }
            res.render("users/show",{user:foundUser,campgrounds:campgrounds})
        })
    })
})

module.exports= router