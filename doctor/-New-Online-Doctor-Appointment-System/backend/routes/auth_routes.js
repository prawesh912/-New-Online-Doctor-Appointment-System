import express from 'express';
import { login, continueWithGoogleButton, continueWithGoogle, continueWithGoogleCallBack } from '../controller/auth_controller.js';

const router = express.Router();

router.post('/login', login);
router.get('/login/google', continueWithGoogleButton);
// router.get('/google/login', continueWithGoogle);
// router.get('/google/callback', continueWithGoogleCallBack, function(req, res){
//     res.redirect('/');
// });

export default router;