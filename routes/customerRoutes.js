const express = require('express');
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Protect all routes after this middleware
router.use(
  authMiddleware.authenticate,
  authMiddleware.customerRoleAuthenticate
);

// services under main category
router.get('/services/:service_name', customerController.getServicesByType);
//services after filtering
router.post(
    '/services/filter',
    authMiddleware.authenticate,
    authMiddleware.customerRoleAuthenticate,
    customerController.filterServices
);
// detailed info of a service
router.get(
    '/services/info/:id',
    authMiddleware.authenticate,
    authMiddleware.customerRoleAuthenticate,
    customerController.getServiceDetails
);
// review
router.post(
    '/services/:id/review',
    authMiddleware.authenticate,
    authMiddleware.customerRoleAuthenticate,
    customerController.submitReview
);
// pay
router.post(
    '/requests/:id/pay',
    authMiddleware.authenticate,
    authMiddleware.customerRoleAuthenticate,
    customerController.processPayment
);




// sending service request
router.post('/requests', customerController.createServiceRequest);

module.exports = router;