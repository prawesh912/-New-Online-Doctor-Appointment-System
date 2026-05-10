import express from 'express';
import { initializePayment , completePayment } from "../controller/payment_controller.js";

const router = express.Router();

router.post('/initialize-khalti-payment', initializePayment);
router.get('/complete-khalti-payment', completePayment);

export default router;