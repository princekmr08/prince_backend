import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshToken=async(userId)=>{
    
  try {
    const user=await User.findById(userId)
  const accessToken=user.generateAccessToken();
  const refreshToken=user.generateRefreshToken();

  user.refreshToken=refreshToken;
  await user.save({validateBeforeSave:false})

  return {accessToken,refreshToken}
  } catch (error) {
    throw new ApiError(500,"something went wrong while generating token")
    
  }

}

const registeruser=asynchandler(async(req,res)=>{
      // get user details from frontend
      // validation-not empty
      // check if user already exist : username,email
      // check for images,check for avatar
      // upload them to cloudinary , avatar
      // create user object - create entry in db
      // remove password and refresh token field from response
      // check for user creation
      // return response

      const {username,email,fullname,password}=req.body
     // console.log("email: ",email);
      
      if(email===""){
        throw new ApiError(400,"email is required")
      }
      if(username===""){
        throw new ApiError(400,"username is required")
      }
      if(password===""){
        throw new ApiError(400,"password is required")
      }
     
      const existeduser=await User.findOne({
        $or:[{username},{email}]
      })

      if(existeduser){
        throw new ApiError(409,"user with email or username already exists")
      }
     // console.log(req.files);
      const avatarLocalpath=req.files?.avatar[0]?.path;
      //const coverimageLocalpath=req.files?.coverimage[0]?.path;
      let coverimageLocalpath;
      if(req.files && Array.isArray(req.files.coverimage)&& req.files.coverimage.length>0){
        coverimageLocalpath=req.files.coverimage[0].path
      }
      if(!avatarLocalpath){
        throw new ApiError(400,"avatar file is required")
      }

      const avatar=await uploadOnCloudinary(avatarLocalpath)
      const coverimage=await uploadOnCloudinary(coverimageLocalpath)
       
      if(!avatar){
        throw new ApiError(400,"avatar file is required")
      }

     const user=await  User.create({
        fullname,
        avatar:avatar.url,
        coverimage:coverimage?.url || "",
        email,
        password,
        username:username.toLowerCase()
      })

      const createduser=await User.findById(user._id).select(
        "-password -refreshToken"  // it first check user is created or not 
        // if created then it remove password and refresh token from created user using select option
      )

      if(!createduser){
        throw new ApiError(500,"something went wrong while registering the user")
      }

      return res.status(201).json(
        new ApiResponse(200,createduser,"user registred successfully")
      )
})

const loginuser=asynchandler(async(req,res)=>{
  // req body->data aa jayega
  //username or email se 
  //find user
  //check password
  // access and refresh token
  // send cookie

  const {username,email,password}=req.body;
  console.log("email: ",email);
  if(!username && !email ){
    throw new ApiError(400,"useranme or email is required")
  }

  const user=await User.findOne({
    $or:[{username},{email}]
  })
  if(!user){
    throw new ApiError(404,"user not found")
  }


  const isPasswordValid=await user.isPasswordCorrect(password) // here user is used not User because we are 
   
  if(!isPasswordValid){
    throw new ApiError(401,"invalid password")
  }

  const{accessToken,refreshToken}= await generateAccessAndRefreshToken(user._id)
    
  const loggedInuser=await User.findById(user._id).select(
    "-password -refreshToken"
  )

  const options={
    httpOnly:true,
    secure:true,

  }


  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options)
  .json(
    new ApiResponse(
      200,
      {
        user:loggedInuser,accessToken,refreshToken
      },
      "user logged in successfully"

    )
  )

})


const logoutuser=asynchandler(async(req,res)=>{

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        refreshToken:undefined
      }
    },
    {
     
      new:true
    }
      
    

  )

  const options={
    httpOnly:true,
    // secure:true,

  }

  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(new ApiResponse(200,{},"user logout successfully"))


})


const refreshAccesstoken=asynchandler(async(req,res)=>{
  const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
  if(!incomingRefreshToken){
    throw new ApiError(401,"unauthorized request")
  }
  try {
    const decodedtoken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    const user=await User.findById(decodedtoken?._id)
    if(!user){
      throw new ApiError(401,"invalid refresh token")
    }
  
    if(incomingRefreshToken!=user?.refreshToken){
      throw new ApiError(401,"refresh token is expired or used")
    }
  
    const options={
      httpOnly:true,
      secure:true,
    }
    const {accessToken,newrefreshToken}=await generateAccessAndRefreshToken(user._id)
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newrefreshToken,options)
    .json(
       new ApiResponse(
        200,
        {accessToken,refreshToken:newrefreshToken},
        "new access token generated successfully"
       )
  
    )
  } catch (error) {
    throw new ApiError(401,error?.message || "invalid")
    
  }


})


const changeCurrentPassword=asynchandler(async(req,res)=>{
  const {oldpassword,newpassword}=req.body
  const user=await User.findById(req.user?._id)
  const isPasswordValid=await user.isPasswordCorrect(oldpassword)
  if(!isPasswordValid){
    throw new ApiError(400,"invalid password")

  }

  user.password=newpassword

  return res
  .status(200)
  .json(200,{},"password changed successfully")
})


const getcurrentuser=asynchandler(async(req,res)=>{
  return res
  .status(200)
  .json(200,req.user,"current user fetched succesfully")
})

const updateAccountdetails=asynchandler(async(req,res)=>{
  const {fullname,email}=req.body
  if(!fullname || !email){
    throw new ApiError(400,"fullname and email is required")
  }

  const user= await User.findByIdAndUpdate(
    req.user._id,{
      $set:{
        fullname:fullname,
        email:email
      }

    },
    {
      new:true
    }
  ).select("-password ")
  return res
  .status(200)
  .json(new ApiResponse(200,user,"user details updated successfully"))
})


const updateuserAvatar=asynchandler(async(req,res)=>{

  const avatarLocalpath=req.file?.path
  if(!avatarLocalpath){
    throw new ApiError(400,"avatar file is required")
  }

  const avatar=await uploadOnCloudinary(avatarLocalpath)
  if(!avatar.url){
    throw new ApiError(400,"error while uploading  avatar")


  }
  const user=await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        avatar:avatar.url
      }
          
    },
    {
      new:true
    }
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200,user,"avatar updated successfully"))


})

const updateusercoverimage=asynchandler(async(req,res)=>{

  const coverimageLocalpath=req.file?.path
  if(!coverimageLocalpath){
    throw new ApiError(400,"coverimage file is required")
  }

  const coverimage=await uploadOnCloudinary(coverimageLocalpath)
  if(!coverimage.url){
    throw new ApiError(400,"error while uploading  coverimage")


  }
  const user=await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        coverimage:coverimage.url
      }
          
    },
    {
      new:true
    }
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200,user,"coverimage updated successfully"))


})

export {
  registeruser,loginuser,logoutuser
 ,refreshAccesstoken,
 changeCurrentPassword,
 getcurrentuser,
 updateAccountdetails,
 updateuserAvatar,
 updateusercoverimage
}