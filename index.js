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

app.use("/api/user",require("./routes/user"))
app.use("/api/post",require("./routes/post"))

app.listen(5001,()=>{
    console.log("Server running on port 5001");
})