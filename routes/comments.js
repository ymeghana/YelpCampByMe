var express = require("express"),
    router = express.Router({mergeParams:true}),
    Campground = require("../models/campground"),
    Comment = require('../models/comment'),
    middleware = require('../middleware')
//==========================
//    COMMENT ROUTES
//==========================

//comments new
router.get("/new",middleware.isLoggedIn,(req,res)=>{
    //find camground by id
    Campground.findById(req.params.id,(err,campground)=>{
        if(err)
            console.log(err)
        else{
            res.render("comments/new",{campground:campground,currentUser:req.user})
        }
    })
})

//comments create
router.post("/",middleware.isLoggedIn,(req,res)=>{
    //lookup campgrounds by id
    Campground.findById(req.params.id,(err,campground)=>{
        if(err){
            console.log(err)
            res.redirect("/campgrounds")
        }
        else{
            Comment.create(req.body.comment, (err,comment)=>{
                if(err){
                    console.log(err)
                }
                else{
                    //add username and id
                    /* var newComment = new Comment({
                        author: req.user
                    }) */
                    comment.author.id = req.user._id
                    comment.author.username = req.user.username
                    //save comment
                    comment.save()
                    campground.comments.push(comment);
                    campground.save();
                    //console.log(comment)
                    res.redirect("/campgrounds/" + campground._id)
                }
            })   
        }
    })//create new comment connet this to campground redirect campground show page    
})

//EDIT ROUTE - campground/:id/comments/:comment_id/edit
router.get("/:comment_id/edit",middleware.checkCommentOwnership,(req,res)=>{
    Campground.findById(req.params.id,(err,foundCampground)=>{
        if(err || !foundCampground){
            req.flash("err","Campground not found")
            return res.redirect("back")
        }
        Comment.findById(req.params.comment_id,(err,foundComment)=>{
            if(err || !foundComment ){
                req.flash("err","Comment not found")
                res.redirect("back")
            }
            else{
                res.render("comments/edit",{campground_id:req.params.id,comment:foundComment})
            }
        })
    })
})
//UPDATE ROUTE - campground/:id/comments/:comment_id/
router.put("/:comment_id",middleware.checkCommentOwnership,(req,res)=>{
    Comment.findByIdAndUpdate(req.params.comment_id,req.body.comment,(err,updatedComment)=>{
        if(err || !foundComment ){
            req.flash("error","Unable to update Comment!!")
            res.redirect("back")}
        else{
            req.flash("success","Comment Updated!!")
            res.redirect("/campgrounds/"+req.params.id)            
        }
    })
})

//DESTROY ROUTE
router.delete("/:comment_id",middleware.checkCommentOwnership,(req,res)=>{
    Comment.findByIdAndRemove(req.params.comment_id,(err)=>{
        if(err){
            req.flash("error","Comment not be removed!!")
            res.redirect("back")}
        else{
            req.flash("success","Comment Deleted!!")
            res.redirect("/campgrounds/"+req.params.id)            
        }
    })
})


module.exports= router