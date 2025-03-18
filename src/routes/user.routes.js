import { Router } from "express";
import { loginuser, 
    logoutuser, 
    registeruser,
    refreshAccesstoken,
     changeCurrentPassword,
      getcurrentuser,
       updateAccountdetails,
        updateuserAvatar,
         updateusercoverimage,
          getuserchannelprofile,
           getWatchHistory 
        } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router=Router();

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
           name:"coverimage",
           maxCount:1
        }
    ]),
    registeruser
)

router.route("/login").post(loginuser)

router.route("/logout").post(verifyJWT,logoutuser)
router.route("/refresh-token").post(refreshAccesstoken)

router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getcurrentuser)
router.route("/update-account").patch(verifyJWT, updateAccountdetails)

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateuserAvatar)
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"),updateusercoverimage)

router.route("/c/:username").get(verifyJWT, getuserchannelprofile)
router.route("/history").get(verifyJWT, getWatchHistory)

export default router