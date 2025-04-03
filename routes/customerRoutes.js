const express = require('express');
const customerController = require('../controllers/customerController');
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Protect all routes after this middleware
router.use(
    authMiddleware.authenticate,
    authMiddleware.customerRoleAuthenticate
);


// get all parent services
router.get('/services/all/parents', customerController.getAllParentServices); 

// get all services by category and radius
router.get('/services/:service_name', customerController.getFilteredServices);

// get one service details by id
router.get('/services/info/:id', customerController.getServiceDetails);

// create service request
router.post('/services/request', customerController.createServiceRequest);

// submit review for a service
router.post('/services/:id/review', customerController.submitReview);


module.exports = router;
