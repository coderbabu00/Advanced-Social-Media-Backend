const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const resetTokenSchema = new mongoose.Schema({
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

resetTokenSchema.pre("save", async function(next){
    if(this.isModified("token")){
        this.token = bcrypt.hash(this.token, 10)
    }
    next();
})

module.exports = mongoose.model("ResetToken", resetTokenSchema)