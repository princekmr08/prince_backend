import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
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

export {registeruser}