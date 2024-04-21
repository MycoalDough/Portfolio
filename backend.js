const { default: mongoose } = require("mongoose");

mongoose.connect("mongodb+srv://mycoal:4Ffeed$@feed.pdgdqcf.mongodb.net/")
.then(()=>{
    console.log("mongo connected");
})
.catch(()=>{
    console.log("error");
})

const feedSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    date:{
        type:Date,
        required:Date.now
    },
    content:{
        type:String,
        required:true
    }
})


const collection = new mongoose.model('feed', feedSchema);

module.exports = Feed;