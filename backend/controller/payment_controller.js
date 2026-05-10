import { initializeKhaltiPayment, verifyKhaltiPayment } from "../utils/khalti.js";

export const initializePayment = async (req, res) => {
    try {
        const { item_id, total_price, website_url } = req.body;

        if (!item_id || !total_price || !website_url) {
            return res.status(400).json({
                success: false,
                message: "item_id, total_price and website_url are required"
            });
        }

        const purchasedItemData = {
            item: item_id,
            paymentMethod: "khalti",
            totalPrice: total_price * 100
        };

        const paymentInitiate = await initializeKhaltiPayment({
            amount: total_price * 100,
            purchase_order_id: item_id.toString(),
            purchase_order_name: "Doctor Appointment Payment",
            return_url: `${process.env.BACKEND_URL}/api/payment/complete-khalti-payment`,
            website_url,
        });

        res.json({
            success: true,
            purchasedItemData,
            payment: paymentInitiate
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const completePayment = async (req, res) => {
    try {

        console.log("QUERY:", req.query);

        const {
            pidx,
            transaction_id,
            amount,
            total_amount,
            mobile,
            purchase_order_id,
            purchase_order_name,
            status,
            idx,
            token,
            tidx,
            bank_reference
        } = req.query;

        if (!pidx) {
            return res.status(400).json({
                success: false,
                message: "pidx is required"
            });
        }

        const paymentInfo = await verifyKhaltiPayment(pidx);

        return res.status(200).json({
            success: true,
            message: "Payment completed successfully",

            khaltiQueryData: {
                pidx,
                transaction_id,
                amount,
                total_amount,
                mobile,
                purchase_order_id,
                purchase_order_name,
                status,
                idx,
                token,
                tidx,
                bank_reference
            },

            verifiedPayment: paymentInfo
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "An error occurred",
            error: err.message
        });
    }
};


// http://localhost:8000/api/payment/complete-khalti-payment?
// status=Completed
// &t=txn&idx=LXWPGHhPGxrPLPiDyZQGEE
// &token=fMqGoqUnQNhVh6pbaRvqrR
// &bank_reference=None
// &amount=100000
// &mobile=98XXXXX678
// &transaction_id=LXWPGHhPGxrPLPiDyZQGEE
// &tidx=LXWPGHhPGxrPLPiDyZQGEE
// &total_amount=100000
// &purchase_order_id=1
// &purchase_order_name=Doctor+Appointment+Payment
// &pidx=BU8rPHuQZ4BSyo6y8ADcDd


// https://test-pay.khalti.com/sct?pidx=A9gSKWchdeYB99fRnhGQ9Y