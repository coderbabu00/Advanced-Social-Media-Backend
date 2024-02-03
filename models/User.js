const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true,
        minLength:5
},
email:{
        type:String,
        required:true,
        unique:true  
},
password: {
type: String,
required: true,
minlength: 6
},

Followers:{
        type:Array,
},
Following:{
        type:Array,
},
phonenumber:{
        type:Number,
        required:true
},
profile:{
        type:String,
},
verified:{
        type:Boolean,
        required:true,
        default:false
}
})

module.exports = mongoose.model("User", userSchema)