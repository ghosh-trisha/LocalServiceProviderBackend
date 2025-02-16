const express = require('express');
const providerController = require('../controllers/providerController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Protect all routes after this middleware
router.use(
  authMiddleware.authenticate,
  authMiddleware.providerRoleAuthenticate
);

router.post('/services', providerController.createService); // create
router.put('/services/:id', providerController.updateService); // update
router.delete('/services/:id', providerController.deleteService); // delete
router.patch(
  '/requests/:id/accept',
  authMiddleware.authenticate,
  authMiddleware.providerRoleAuthenticate,
  providerController.acceptRequest
); // accept
router.patch(
  '/requests/:id/reject',
  authMiddleware.authenticate,
  authMiddleware.providerRoleAuthenticate,
  providerController.rejectRequest
); // reject
router.post(
  '/requests/:id/bill',
  authMiddleware.providerRoleAuthenticate,
  providerController.generateBill
); // bill generate

module.exports = router;