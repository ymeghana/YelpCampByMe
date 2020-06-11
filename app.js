var express = require("express"),
    app = express(),
    bodyParser = require("body-parser"),
    mongoose = require('mongoose'),
    passport = require('passport'),
    LocalStrategy = require('passport-local')
    passportLocalMongoose = require('passport-local-mongoose'),
    Campground = require("./models/campground"),
    User = require("./models/user"),
    Comment = require("./models/comment"),
    seedDB = require("./seeds"),
    flash = require("connect-flash")

var commentRoutes = require('./routes/comments'),
    campgroundRoutes = require('./routes/campgrounds'),
    reviewRoutes     = require("./routes/reviews"),
    indexRoutes = require('./routes/index'),    
    methodOverride = require('method-override')
require('dotenv').config()

//var mc = require("mongodb").MongoClient
mongoose.connect(process.env.DBURL,{ useNewUrlParser: true,useUnifiedTopology: true })
app.use(bodyParser.urlencoded({extended:true}))
app.set("view engine","ejs")
app.use(express.static(__dirname+"/public"))
app.use(methodOverride("_method"))
app.use(flash())
app.locals.moment = require('moment')
//seedDB(); //seed the db

//PASSPORT CONFIG
app.use(require('express-session')({
    secret:"Once Again rusty wins cutest dog",
    resave:false,
    saveUninitialized:false
}))
app.use(passport.initialize())
app.use(passport.session())

passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

app.use((req,res,next)=>{
    res.locals.currentUser = req.user
    res.locals.error = req.flash("error")
    res.locals.success = req.flash("success")
    next()
})

app.use(indexRoutes)
app.use("/campgrounds",campgroundRoutes) //adds that prefix string to the route
app.use("/campgrounds/:id/comments",commentRoutes)
app.use("/campgrounds/:id/reviews", reviewRoutes);

app.listen(process.env.PORT || 4001 ,()=>{
    console.log("Yelp Camp Started")
})

/* <%- include("../partials/header") %>
<%- include("../partials/footer") %> */

/*INDEX  /campgrounds          GET
NEW    /campgrounds/new  GET
CREATE /campgrounds        POST
SHOW   /campgrounds/:id    GET

NEW    /campgrounds/:id/comments/new   GET
CREATE /campgrounds/:id/comments	   POST */