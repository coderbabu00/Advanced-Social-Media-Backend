const express = require("express");
const User = require("../models/User");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const Post = require("../models/Post");
const ResetToken = require("../models/ResetToken");
const VerificationToken = require("../models/VerificationToken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const {verifyToken} = require("./verifyToken")

dotenv.config();

// OTP generate karne ka function
const generateOTP = () => {
    let OTP = '';
    for (let i = 0; i <= 3; i++) {
        let ranVal = Math.round(Math.random() * 9);
        OTP = OTP + ranVal;
    }
    return OTP;
}

// Endpoint to create a new user
router.post("/create/user", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists with the provided email
        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: "User already exists" });
        }

        // Hash the password before saving it
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user with hashed password
        const newUser = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword,
            profile: req.body.profile,
            phonenumber: req.body.phonenumber
        });

        // Generate OTP and create a verification token
        const OTP = generateOTP();
        const verificationToken = new VerificationToken({
            user: newUser._id,
            token: OTP
        });

        // Save the new user and verification token to the database
        await newUser.save();
        verificationToken.save();

        // Nodemailer code to send email with OTP
        const transport = nodemailer.createTransport({
            host: "sandbox.smtp.mailtrap.io",
            port: 2525,
            auth: {
                user: process.env.USER,
                pass: process.env.PASS
            }
        });

        transport.sendMail({
            from: "sociaMedia@gmail.com",
            to: newUser.email,
            subject: "Verify your email using OTP",
            html: `<h1>Your OTP CODE ${OTP}</h1>`
        });

        // Respond with success message and user ID
        res.status(200).json({ Status: "Pending", msg: "Please check your email", user: newUser._id });
    } catch (err) {
        // Handle errors and respond with an error status
        res.status(500).json(err);
    }
});

// Endpoint to verify the user's email using OTP
router.post("/verify/email", async (req, res) => {
    try {
        const { user, OTP } = req.body;

        // Find the user by ID
        const mainuser = await User.findById(user);
        if (!mainuser) {
            return res.status(400).json({ msg: "User does not exist" });
        }

        // Check if the user is already verified
        if (mainuser.verified) {
            return res.status(400).json({ msg: "User already verified" });
        }

        // Find the verification token for the user
        const token = await VerificationToken.findOne({ user: mainuser._id });
        if (!token) {
            return res.status(400).json({ msg: "Token does not exist" });
        }

        // Compare the provided OTP with the stored token
        const isMatch = await bcrypt.compare(OTP, token.token);
        if (!isMatch) {
            return res.status(400).json({ msg: "Invalid OTP" });
        }

        // Update the user's verification status and delete the verification token
        mainuser.verified = true;
        await VerificationToken.findByIdAndDelete(mainuser._id);
        await mainuser.save();

       // JWT se naya access token generate karna
    const accessToken = jwt.sign({
        id: mainuser._id,
        username: mainuser.username
      }, process.env.JWTSEC);
  
      // User details se password hatana
      const { password, ...other } = mainuser._doc;

        const transport = nodemailer.createTransport({
            host: "smtp.mailtrap.io",
            port: 2525,
            auth: {
                user: process.env.USER,
                pass: process.env.PASS
            }
        });

        transport.sendMail({
            from: "sociaMedia@gmail.com",
            to: mainuser.email,
            subject: "Successfully verify your email",
            html: `Now you can login in social app`
        });

        // Respond with user details and set an HTTP-only cookie with the access token
        // res.status(200)
        //     .cookie("access_token", accessToken, {
        //         httpOnly: true
        //     })
        //     .json(others);
       // Success status aur user details ke saath response bhejna
    return res.status(200).json({ ...other, accessToken });
    } catch (err) {
        // Handle errors and respond with an error status
        res.status(500).json(err);
    }
});

//Login

router.post("/login", async(req,res)=>{
    try{
   const user=await User.findOne({email:req.body.email})
   if(!user){
       res.status(404).json("User not found")
   }
   const comparedPassword=await bcrypt.compare(req.body.password,user.password)
   if(!comparedPassword){
       res.status(400).json("Wrong Password")
   }
   const accessToken=jwt.sign({
    id:user._id,
    username:user.username
   },process.env.JWTSEC)
   const {password,...others}=user._doc
   res.status(200).json({...others,accessToken})
    }catch(err){
      console.log(err)
        res.status(500).json(err)
    }
})

// Forgot password
router.post("/forgot/password", async(req, res)=>{
    const {email} = req.body;
    // User ka email check karna
    const user = await User.findOne({email: email});
    // Agar user nahi milta toh 400 status aur message bhejna
    if(!user){
        return res.status(400).json("User not found");
    }

    // Reset token check karna
    const token = await ResetToken.findOne({user: user._id});
    // // Agar token mil gaya toh 400 status aur message bhejna
    // if(token){
    //     return res.status(400).json("After one hour you can request for another token");
    // }

    // Random token generate karna
    const randomTxt = crypto.randomBytes(20).toString('hex');
    const resetToken = new ResetToken({
        user: user._id,
        token: randomTxt
    });

    // Token ko database mein save karna
    await resetToken.save();

    // Nodemailer se email bhejna jismein reset link ho
    const transport = nodemailer.createTransport({
        host: "smtp.mailtrap.io",
        port: 2525,
        auth: {
            user: process.env.USER,
            pass: process.env.PASS
        }
    });

    transport.sendMail({
        from: "sociaMedia@gmail.com",
        to: user.email,
        subject: "Reset Token",
        html: `http://localhost:5000/reset/password?token=${randomTxt}&_id=${user._id}`
    });

    // Success status aur message bhejna
    return res.status(200).json("Check your email to reset password");
})

// Reset password
router.put("/reset/password", async(req, res)=>{
    const {token, _id} = req.query;
    // Token aur user ID ka existence check karna
    if(!token || !_id){
        return res.status(400).json("Invalid request");
    }

    // User ka ID se user find karna
    const user = await User.findOne({_id: _id});
    // Agar user nahi milta toh 400 status aur message bhejna
    if(!user){
        return res.status(400).json("User not found");
    }

    // User ka reset token find karna
    const resetToken = await ResetToken.findOne({user: user._id});
    // Agar reset token nahi milta toh 400 status aur message bhejna
    if(!resetToken){
        return res.status(400).json("Reset token is not found");
    }

    // Diya hua token aur stored token ko compare karna
    const isMatch = bcrypt.compare(token, resetToken.token);
    // Agar match nahi karta toh 400 status aur message bhejna
    if(!isMatch){
        return res.status(400).json("Token is not valid");
    }

    // Naya password set karna aur save karna
    const {password} = req.body;
    const secPass = await bcrypt.hash(password, 10);
    user.password = secPass;
    //Save the user with changed password
    await user.save();
    //Delete the reset token
    await ResetToken.findByIdAndDelete({user: user._id})

    // Nodemailer se password reset confirmation email bhejna
    const transport = nodemailer.createTransport({
        host: "smtp.mailtrap.io",
        port: 2525,
        auth: {
            user: process.env.USER,
            pass: process.env.PASS
        }
    });

    transport.sendMail({
        from: "sociaMedia@gmail.com",
        to: user.email,
        subject: "Your password reset successfully",
        html: `Now you can login with your new password`
    });

    // Success status aur message bhejna
    return res.status(200).json("Email has been sent");
})

//Follow and unfollow
router.put("/following/:id",verifyToken,async(req, res)=>{
   // Agar requested user Id aur body mein diya gaya user ID alag hain

   // req.body.use ka matlab hota hai jo data hum post kar rahe hai
try{
   if(req.params.id !== req.body.user){
     //Requested user ko find karo 
     const user = await User.findById(req.params.id);
    //  "user": "<your_user_id_to_follow>" => This is the logic

     // Find user given in body
     const otheruser = await User.findById(req.body.user);

       // Requested user ke Followers mein diye gaye user ID ko push karo
     if(!user.Followers.includes(req.body.user)) {
       // Requested user ke Followers mein diye gaye user ID ko push karo
       await user.updateOne({$push: {Followers: req.body.user}});

       // Diye gaye user ke Following mein requested user ID ko push karo
      await otheruser.updateOne({ $push: { Following: req.params.id } });

       // Success response - User ne doosre user ko follow kiya hai
       return res.status(200).json("User ne follow kiya hai");
     }else{
        // Agar requested user diye gaye user ko already follow kar raha hai
      // Requested user ke Followers mein diye gaye user ID ko pull karo
      await user.updateOne({ $pull: { Followers: req.body.user } });

      // Diye gaye user ke Following mein requested user ID ko pull karo
      await otheruser.updateOne({ $pull: { Following: req.params.id } });

      // Success response - User ne doosre user ko unfollow kiya hai
      return res.status(200).json("User ne unfollow kiya hai");
     }
   }else{
    // Agar requested user apne aap ko follow karne ki koshish kar raha hai
     return res.status(403).json("You can't follow yourself");
   }}catch(err){
    console.log(err);
    return res.status(500).json("Internal server error");
   }
})

// fetch posts from following, followers and user's post
router.get("/flw/:id", verifyToken, async(req, res)=>{
    try{
    const user = await User.findById(req.params.id);

    if(!user){
        return res.status(404).json("User not found");
    }
 // User ke Following mein jitne bhi users hain, unke posts ko fetch karne ke liye Promise.all ka use kiya jata hai. Har user ke posts ko find karke ek array mein collect kiya jata hai.
    const followingsPost = await Promise.all(user.Following.map((item)=>{
        return Post.find({user: item});
    }))

    //User ke Followers mein jitne bhi users hain, unke posts ko find karne ke liye Promise.all ka use kiya jata hai. Har user ke posts ko find karke ek array mein collect kiya jata hai.
    const followersPost = await Promise.all(user.Followers.map((item)=>{
        return Post.find({user: item});
    }))
  
    // User khud ke posts ko find karke ek array mein collect kiya jata hai.
    const userPost = await Post.find({ user: user._id });

    // User ke posts aur uske following ke users ke posts ko combine karke 200 status code ke saath JSON response bhej diya jata hai.
    res.status(200).json(userPost.concat(...followersPost, ...followingsPost));
    }catch(err){
        return res.status(500).json(err);
    }
})

// Update user profile
router.put("/update/:id", verifyToken, async (req, res) => {
    try {
      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        req.body.password = await bcrypt.hash(req.body.password, salt);
        const updatedUser = await User.findByIdAndUpdate(req.params.id, {
          $set: req.body
        }, { new: true });
        res.status(200).json(updatedUser);
      } else {
        return res.status(400).json("You are not allowed to update this user details");
      }
    } catch (err) {
      res.status(500).json(err);
    }
  });

// Delete user account
router.delete("/delete/:id", verifyToken, async (req, res) => {
    try{
      if(req.params.id !== req.user.id){
        return res.status(400).json("Account doesn't match")
      }else{
        await User.findByIdAndDelete(req.params.id);
        return res.status(200).json("Account deleted successfully");
      }
    }catch(err){
      res.status(500).json(err);
    }
})


// Get user details for post
router.get("/user/post/:id",verifyToken, async(req, res)=>{
        try{
     const user = await User.findById(req.params.id);
     if(!user){
         return res.status(404).json("User not found");
     }
     const {email, password,phonenumber, ...others} = user._doc;
     res.status(200).json(others);
        }catch(err){
            res.status(500).json(err)
        }
}) 

// Get user to follow
router.get("/all/user/:id", async (req, res) => {
    try {
        // Fetch all users
        const allUsers = await User.find();

        // Fetch the specific user based on the provided ID
        const user = await User.findById(req.params.id);

        // Store the IDs of users followed by the specific user in an array
        const followingUserIds = user.Following.map(item => item.toString());

        // Filter out sensitive information and create a new array of users to follow
        const usersToFollow = allUsers
            .filter(val => !followingUserIds.includes(val._id.toString()))
            .map(({ email, profile, username, _id }) => ({ email, profile, username, _id }));

        return res.status(200).json(usersToFollow);
    } catch (err) {
        return res.status(500).json({ msg: "Internal Server error" });
    }
});

// Suggest users to follow
router.get("/suggestions/:id", async (req, res) => {
    try {
        // Fetch the specific user based on the provided ID
        const user = await User.findById(req.params.id);

        // Fetch all users
        const allUsers = await User.find();

        // Store the IDs of users followed by the specific user in an array
        const followingUserIds = user.Following.map(item => item.toString());

        // Filter out the user and users already followed
        const usersToExclude = [...followingUserIds, user._id.toString()];

        // Filter out sensitive information and create a new array of users to suggest
        const suggestedUsers = allUsers
            .filter(val => !usersToExclude.includes(val._id.toString()))
            .map(({ email, profile, username, _id }) => ({ email, profile, username, _id }));

        // Shuffle the array to provide random suggestions
        const shuffledSuggestions = shuffleArray(suggestedUsers);

        // Get a limited number of suggestions (adjust the count as needed)
        const numberOfSuggestions = Math.min(shuffledSuggestions.length, 5);
        const finalSuggestions = shuffledSuggestions.slice(0, numberOfSuggestions);

        return res.status(200).json(finalSuggestions);
    } catch (err) {
        return res.status(500).json({ msg: "Internal Server error" });
    }
});

// Helper function to shuffle an array
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}


module.exports = router;
