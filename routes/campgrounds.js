var express = require("express"),
    router = express.Router(),
    Campground = require('../models/campground'),
    middleware = require('../middleware')
    var Review = require("../models/review");
/* var multer = require('multer');
var storage = multer.diskStorage({
      filename: function(req, file, callback) {
        callback(null, Date.now() + file.originalname);
      }
    });
var imageFilter = function (req, file, cb) {
        // accept image files only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    };
    var upload = multer({ storage: storage, fileFilter: imageFilter})
    
    var cloudinary = require('cloudinary');
    cloudinary.config({ 
      cloud_name: 'ds0b0zwlv', 
      api_key: process.env.CLOUDINARY_API_KEY, 
      api_secret: process.env.CLOUDINARY_API_SECRET
    }); */

//INDEX DISPLAY ALL CAMPGROUNDS
router.get("/",(req,res)=>{
    //get all campgrounds from db
    var noMatch = null;
    var perPage = 8;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    if(req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Campground.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
            Campground.count({name: regex}).exec(function (err, count) {
                if (err) {
                    console.log(err);
                    res.redirect("back");
                } else {
                    if(allCampgrounds.length < 1) {
                        noMatch = "No campgrounds match that query, please try again.";
                    }
                    res.render("campgrounds/index", {
                        campgrounds: allCampgrounds,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: req.query.search
                    });
                }
            });
        });
    } else {
        // get all campgrounds from DB
        Campground.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
            Campground.count().exec(function (err, count) {
                if (err) {
                    console.log(err);
                } else {
                    res.render("campgrounds/index", {
                        campgrounds: allCampgrounds,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: false
                    });
                }
            });
        });
    }
    
   //res.render("campgrounds",{campgrounds:campgrounds})
})

//CREATE - ADD NEW CAMPGROUND TO DB
router.post("/",middleware.isLoggedIn,(req,res)=>{
    //get data from form  and add to campgrounds array
    
    var name = req.body.name

    var description = req.body.description
    var author= {
        id : req.user._id,
         username : req.user.username
    }
    var price = req.body.price
    //console.log(newCampground)
    //campgrounds.push(newCampground)
    //create a new campground and save to db
    //cloudinary.uploader.upload(req.file.path, function(result) {
        //req.body.image = result.secure_url;
        var newCampground = {name:name,price:price,image:req.body.image,description:description,author:author}
        Campground.create(newCampground,(err,campground)=>{
            if(err){
                req.flash("error","Cannot create Campground")
            }
            else{
                req.flash("success","Campground created!!")
                res.redirect("/campgrounds")
            }
        })
      //});
    
    //redirect back to campgrounds
})

//NEW - SHOW FORM TO CREATE CAMPGROUND
router.get("/new",middleware.isLoggedIn,(req,res)=>{
    res.render("campgrounds/new")
})


//SHOW /campgrounds/:id GET REQUEST - SHOWS INFO OF ONE DOG
router.get("/:id",(req,res)=>{
    //find campground with provided ID
    Campground.findById(req.params.id).populate("comments likes").populate({
        path: "reviews",
        options: {sort: {createdAt: -1}}
    }).exec((err,foundCampground)=>{
        if(err || !foundCampground){
            req.flash("error","Campground not found!!")
            res.redirect("back")
        }
        else{
            //console.log(foundCampground)
            res.render("campgrounds/show",{campg:foundCampground})
        }
    })
})

//EDIT CAMPGROUND ROUTE
router.get("/:id/edit",middleware.checkCampgroundOwnership,(req,res)=>{
    //is user logged in if not redirect else
    //does user own campground? if not redirect
        Campground.findById(req.params.id,(err,foundCampground)=>{
                //foundCampground.author.id is obj
                //req.user._id is string so we can't use === to compare
            res.render("campgrounds/edit",{campground:foundCampground})       
        })
})
//UPDATE CAMPGROUND ROUTE
router.put("/:id",middleware.checkCampgroundOwnership,(req,res)=>{
    //find and update 
    Campground.findOneAndUpdate({_id:req.params.id},req.body.campground,(err,updatedCampground)=>{
        if(err)
           { req.flash("error","Unable to update Campground!!")
               res.redirect('/campgrounds')}
        else{
            campground.name = req.body.campground.name;
            campground.description = req.body.campground.description;
            campground.image = req.body.campground.image;
            campground.save(function (err) {
                if (err) {
                    console.log(err);
                    res.redirect("/campgrounds");
                } else {
                    req.flash("success","Campground Updated!!")
                    res.redirect("/campgrounds/" + campground._id);
                }
            });
        }
    })
})

//DESTROY CAMPGROUND ROUTE
router.delete("/:id",middleware.checkCampgroundOwnership,(req,res)=>{
    Campground.findByIdAndRemove(req.params.id,(err)=>{
        if(err){
            req.flash("error","Campground not be removed!!")
            res.redirect('/campgrounds')}
        else{
            Comment.remove({"_id": {$in: campground.comments}}, function (err) {
                if (err) {
                    console.log(err);
                    return res.redirect("/campgrounds");
                }
                // deletes all reviews associated with the campground
                Review.remove({"_id": {$in: campground.reviews}}, function (err) {
                    if (err) {
                        console.log(err);
                        return res.redirect("/campgrounds");
                    }
                    //  delete the campground
                    campground.remove();
                    req.flash("success", "Campground deleted successfully!");
                    res.redirect("/campgrounds");
                });
            });
        }
    })
})

// Campground Like Route
router.post("/:id/like", middleware.isLoggedIn, function (req, res) {
    Campground.findById(req.params.id, function (err, foundCampground) {
        if (err) {
            console.log(err);
            return res.redirect("/campgrounds");
        }

        // check if req.user._id exists in foundCampground.likes
        var foundUserLike = foundCampground.likes.some(function (like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            // user already liked, removing like
            foundCampground.likes.pull(req.user._id);
        } else {
            // adding the new user like
            foundCampground.likes.push(req.user);
        }

        foundCampground.save(function (err) {
            if (err) {
                console.log(err);
                return res.redirect("/campgrounds");
            }
            return res.redirect("/campgrounds/" + foundCampground._id);
        });
    });
});



//search regex function
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

//function checkCampgroundOwnership

module.exports= router;