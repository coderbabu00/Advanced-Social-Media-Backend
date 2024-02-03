const express = require("express");
const Post = require("../models/Post");
const User = require("../models/Post")
const {verifyToken} = require("./verifyToken")
const router = express.Router();

//Create Post
router.post("/user/post", verifyToken, async (req, res) => {
    try {
      // Request se title, image, aur video ko extract karte hain
      let { title, image, video } = req.body;
  
      // Naya Post object create kiya jata hai, jismein title, image, video aur user ID shamil hote hain
    //   Is line mein req.user.id ka istemal post object banane mein tab hota hai jab aap user authentication implement karte hain. Jab aap apne server par user authentication karte hain, toh user authentication ke baad server user ki details ko request object mein store karta hai.
    // req.user.id se matlab hai ki authenticated user ka ID (user ID) use hota hai jo verifyToken middleware ke dvara verify hota hai. Middleware, jo yahaan verifyToken ke roop mein diya gaya hai, JWT (JSON Web Token) ko verify karta hai aur agar token valid hota hai toh usmein encoded user information hoti hai, jismein se ek piece user ID hota hai.

// Is user ID ko newpost object mein dalna ka maksad hai ki jab yeh naya post database mein save hoga, toh yeh post associated user ke saath connect hoga. Yeh information future reference ke liye store hoti hai aur aap later on posts ko user-wise filter kar sakte hain.

      const newpost = new Post({ title, image, video, user: req.user.id });
  
      // Naya post database mein save kiya jata hai
      const post = await newpost.save();
  
      // Response mein saved post ko JSON format mein bheja jata hai
      res.status(200).json(post);
    } catch (err) {
      // Agar koi error hota hai toh 500 Internal Server Error status ke sath error message bheja jata hai
      return res.status(500).json("Internal error occurred");
    }  
  });

  //Get post by user Id
  router.get("/get/post/:id", verifyToken, async(req,res)=>{
    try{
      const myposts = await Post.find({ user: req.params.id});

      if(myposts.length === 0){
        return res.status(200).json("You don't have any post");
      }
      res.status(200).json(myposts);
    }catch(err){
        return res.status(500).json("Internal server error");
    }
  })

  // Update the post by user
  router.put("/update/post/:id", verifyToken,async(req,res)=>{
    try{
   const post = await Post.findById(req.params.id);
   if(!post){
    res.status(404).json("Post Not Found");
   }
   post = await Post.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });

   const updatedPost = post.save();
   return res.status(200).json(updatedPost);
    }catch(err){
    return res.status(500).json("Internal server error");
    } 
  })

  //Like
   router.put("/:id/like", verifyToken, async(req,res)=>{
    try{
        const post = await Post.findById(req.params.id);

        // Let's understand the meaning of (req.user.id)=> Iska matlab hai koi aise user ki ID jo ki authenticated ho,,wo koi bhi user hoo sakta hai.

        //Let's see the meaning of the line !post.like.includes(req.user.id) like array me koi authenticated user (jo ki like ya dislike karna chata hai) uski id phle se avlbl hai ya nhai

        if(!post.like.includes(req.user.id)){
         if(post.dislike.includes(req.user.id)){
          await post.updateOne({$pull:{
            dislike: req.user.id
          }})
         }
         await post.updateOne({ $push: { like: req.user.id } });
         return res.status(200).json("liked");
        }else{
           // Agar user ne pehle se hi is post ko like kiya hua hai, toh use unlike kar diya jata hai
           await post.updateOne({$pull:{like:req.user.id}});
           
           // Response mein "disliked" message bheja jata hai
      res.status(200).json("disliked");
        }
    }catch(err){
     // Agar koi error hota hai toh usse handle karte hue kuch nahi kiya jata hai
    console.error(err);
    res.status(500).json("Internal error occurred");
    }
   })

  // Dislike
router.put("/:id/dislike", verifyToken, async (req, res) => {
    try {
      // Post ko post ID ke basis par database se fetch kiya jata hai
      const post = await Post.findById(req.params.id);
  
      // Agar user ne pehle se hi is post ko dislike nahi kiya hai
      if (!post.dislike.includes(req.user.id)) {
        // Agar user ne pehle se hi is post ko like kiya hai, toh use unlike kar diya jata hai
        if (post.like.includes(req.user.id)) {
          await post.updateOne({ $pull: { like: req.user.id } });
        }
  
        // Post ko dislike karne wale users mein naye user ko add kiya jata hai
        await post.updateOne({ $push: { dislike: req.user.id } });
  
        // Response mein "disliked" message bheja jata hai
        return res.status(200).json("disliked");
      } else {
        // Agar user ne pehle se hi is post ko dislike kiya hua hai, toh use unlike kar diya jata hai
        await post.updateOne({ $pull: { dislike: req.user.id } });
  
        // Response mein "liked" message bheja jata hai
        res.status(200).json("liked");
      }
    } catch (err) {
      // Agar koi error hota hai toh usse handle karte hue 500 Internal Server Error status ke sath ek error message bheja jata hai
      res.status(500).json(err);
    }
  });

  // Post par comment karne ke liye PUT request ka route
router.put("/comment/post", verifyToken, async (req, res) => {
    try {
        // Line 1: Request body se comment, postid, aur profile nikal lo
        const { comment, postid, profile } = req.body;
  
        // Line 2: Comment details ko ek object mein store karo
        const comments = {
            user: req.user.id,
            username: req.user.username,
            comment,
            profile
        }
  
        // Line 3: Post ID ke corresponding post ko dhundho
        const post = await Post.findById(postid);
  
        // Line 4: Post ke comments array mein newly created comment object ko push karo
        post.comments.push(comments);
  
        // Line 5: Post ko save karo taki updated comments usme store ho jayein
        await post.save();
  
        // Line 6: Success response - Updated post ko JSON format mein bhejo
        res.status(200).json(post);
    } catch (error) {
        // Line 7: Agar koi error aata hai toh 500 status code ke saath "Internal server error" message bhejo
        return res.status(500).json("Internal server error");
    }
  });

  //Delete post
router.delete("/delete/post/:id", verifyToken, async (req, res) => {
    try{
      const post=await Post.findById(req.params.id);
      if(post.user===req.user.id){
        const deletePost=await Post.findByIdAndDelete(req.params.id);
        return res.status(200).json("Post deleted successfully");
      }else{
        return res.status(400).json("You can delete only your post");
      }
    }catch(err){
      res.status(500).json(err)
    }
  })

  //Following users ko get krne ka route
  router.get("/following/:id", verifyToken, async(req,res)=>{
    try{
    // User model se specific user ko find karo using ID
    const user = await User.findById(req.params.id);

    //User ke "Following" array mein jo users hain, unko Promise.all se fetch karo
    const followingUsers = await Promise.all(
        user.Following.map((item)=>{
            return User.findById(item);
        })
    );
     // Following users ki details ko alag array mein store karo
     const followingList = [];
     followingUsers.map((person) => {
       // User object se sensitive information (email, password, phonenumber, Following, Followers) ko exclude karo
       const { email, password, phonenumber, Following, Followers, ...others } = person._doc;
       // Baki ke details ko "followingList" array mein push karo
       followingList.push(others);
     });
      // Response mein following users ki list ko status code 200 ke saath bhejo
    return res.status(200).json(followingList);
    }catch(err){
 // Agar koi error aaye toh usko handle karo aur status code 500 ke saath error message bhejo
 return res.status(500).json(err);
    }
  })

 //Get followers user
router.get("/followers/:id", verifyToken, async (req, res) => {
    try{
      const user=await User.findById(req.params.id);
      const followersuser=await Promise.all(
        user.Followers.map((item)=>{
          return User.findById(item)
        })
      )
      const followersList=[];
      followersuser.map((person)=>{
        const {email, password , phonenumber , Following , Followers , ...others} = person._doc;
        followersList.push(others);
      })
      return res.status(200).json(followersList)
    }catch(err){
      res.status(500).json(err)
    }
  });

  // Route to fetch advanced trending posts
router.get('/trending', verifyToken, async (req, res) => {
  try {
    // Use the aggregation framework to calculate the sum of likes and comments
    const trendingPosts = await Post.aggregate([
      {
        $project: {
          title: 1,
          image: 1,
          video: 1,
          likes: { $size: '$like' },
          comments: { $size: '$comments' },
        },
      },
      {
        $addFields: {
          trendingScore: { $sum: ['$likes', '$comments'] },
        },
      },
      {
        $sort: { trendingScore: -1 }, // Sort in descending order by trending score
      },
      {
        $limit: 10,
      },
    ]);

    res.status(200).json(trendingPosts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

  module.exports = router;