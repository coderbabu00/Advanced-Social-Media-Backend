const express = require("express");
const dotenv=require("dotenv");
const mongoose=require("mongoose");
const app=express();
dotenv.config();
mongoose.connect(process.env.MONGO_DB).then(()=>{
    console.log("Database connected successfully");
}).catch(()=>{
    console.log("Database not connected");
})
app.use(express.json());



app.listen(5000,()=>{
    console.log("Server running on port 5000");
})