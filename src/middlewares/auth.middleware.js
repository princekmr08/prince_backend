import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";



export const verifyJWT=asynchandler(async(req,res,next)=>{
    try {
        // const token=req.cookies?.accessToken || req.header
        // ("Authorization")?.replace("Bearer ","")
        const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];

        console.log("Extracted Token:", token);
    
        if(!token){
            throw new ApiError(401,"unauthorized request")
        }
    
        const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        const user=await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user){
            // discuss about frontend in nect tutorial
            throw new ApiError(401,"invalid Access token")
        }
        req.user=user;
        next()
    } catch (error) {
        throw new ApiError(401,error?.message ||"invalid Access token")
        
    }
}) 