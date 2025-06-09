const express=require('express');
const app=express();
const usermodel=require('./models/user');
const postmodel=require("./models/post")
const cookieParser = require('cookie-parser');
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const user = require('./models/user');
const crypto=require('crypto');
const path=require('path')
const multer=require("multer")



app.set('view engine','ejs');
app.use(express.json());
app.use(express.urlencoded({extended:true})); 
app.use(cookieParser());



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/uploads')
  },
  filename: function (req, file, cb) {
     crypto.randomBytes(12,function(err,bytes){
      const fn= bytes.toString("hex") + path.extname(file.originalname)
      cb(null,fn)
     })
    
  }
})

const upload = multer({ storage: storage })



app.get('/',function(req,res){
    res.render('index')
});



app.post('/upload',upload.single("image"),function(req,res){

  res.render('upload')//enctype basically means that you are sending the data to upload in chunks multipart
});

app.get('/login',function(req,res){
    res.render('login')
});



app.get('/profile',isLoggedIn,async function(req,res){
  let user= await usermodel.findOne({email:req.user.email}).populate('post')
  res.render("profile",{user})
});




app.post('/post',isLoggedIn,async function(req,res){
  let user= await usermodel.findOne({email:req.user.email});
  let{content}=req.body;
    let post=await postmodel.create({
    user:user._id,
    content
  });
  
  user.post.push(post._id)
    await user.save()


  res.redirect('/profile');
});


app.post('/register',async(req,res)=>{
    let{email,password,username,name,age}=req.body;
    let user= await usermodel.findOne({email});
    if(user) return res.status(500).send("user already registered");

    bcrypt.genSalt(10, (err,salt)=>{
         bcrypt.hash(password,salt, async (err,hash)=>{
     let user= await usermodel.create({
        username,
        email,
        age,
        name,
        password:hash
       });
       let token=jwt.sign({email:email,userid:user._id},"shhhh");
        res.cookie("token",token);
        res.redirect("/profile");
        
         
       
        });
    });

});


app.get('/delete/:id', async (req, res) => {


  // let postId = req.params.id;
  let deletedPost = await postmodel.findOneAndDelete({ _id: req.params.id });
  console.log("Deleted post:", deletedPost);
  res.redirect('/profile'); 
});

app.get('/edit/:id',isLoggedIn, async (req, res) => {
  let post = await postmodel.findOne({ _id: req.params.id });
  res.render('edit',{post}); 
});

app.post('/update/:id',isLoggedIn, async (req, res) => {
  let update= await postmodel.findOneAndUpdate({ _id: req.params.id },{content:req.body.content });
  res.redirect('/profile')
});



app.post('/login',async(req,res)=>{
    let{email,password}=req.body;
    let user= await usermodel.findOne({email});
    if(!user) return res.status(500).send("email not found!");
    bcrypt.compare(password, user.password, function(err, result) {
      if(result) {  
        let token=jwt.sign({email:email,userid:user._id},"shhhh");
        res.cookie("token",token);
        res.status(200).redirect("/profile");
        
     } else res.redirect("/login");
    });
   
       

});

app.post('/logout',function(req,res){
    res.cookie("token", "");
    res.redirect('/login');
});


function isLoggedIn(req,res,next){
  if(req.cookies.token==="")res.redirect("/login")
    else{
       let data=jwt.verify(req.cookies.token,"shhhh")
       req.user=data;
    }
  next();
}

app.listen(4000);

