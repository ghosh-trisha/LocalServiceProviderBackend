
const express = require('express');
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Protect all routes after this middleware
router.use(authMiddleware.authenticate);


// process payment from customer to my razorpay account
router.post('/payment/:id', 
    paymentController.processPaymentFromCustomerToMe
); 


// // process payment from my razorpay account to provider's bank account
// router.post('/transfer/:id', 
//     paymentController.processPaymentFromMeToProvider
// );


// testing
router.post('/order', 
    paymentController.createOrder
);
router.get('/payment/:paymentId',
    paymentController.getPaymentDetails
)


module.exports = router;
