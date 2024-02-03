const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
  
const verificationTokenSchema = new mongoose.Schema({
   user:{
   type:mongoose.Schema.Types.ObjectId,
   ref:"User",
   required:true
   },
   token:{
    type: String,
    required: true
   },
   createdAt:{
    type: Date,
    default: Date.now(),
   },
});

verificationTokenSchema.pre("save", async function(next){
    if(this.isModified("token")){
        this.token = await bcrypt.hash(this.token, 10)
    }
    next();
});

module.exports = mongoose.model("VerificationToken", verificationTokenSchema)