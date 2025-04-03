const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Bill = require ('../models/bill');
const Transfer = require ('../models/Transfer');
const crypto = require('crypto');
const ProviderBankDetail = require('../models/ProviderBankDetails');
const ServiceRequest = require('../models/ServiceRequest');


// Initialize Razorpay client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET
});


// Process payment from customer to provider
exports.processPaymentFromCustomerToMe = catchAsync(async (req, res, next) => {
  const { id } = req.params; // bill id
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return next(new AppError('Missing payment verification details', 400));
  }

  // Validate service request and ownership
  const serviceRequest = await ServiceRequest.findById(id).populate('customer');
  if (!serviceRequest || serviceRequest.customer._id.toString() !== req.user.id) {
    return next(new AppError('Invalid service request or unauthorized access', 403));
  }

  // Validate bill
  const bill = await Bill.findOne({ request: id });
  if (!bill) {
    return next(new AppError('Bill not found', 400));
  }
  if (bill.status === 'paid') {
    return next(new AppError('Bill already paid', 400));
  }

  // Prevent duplicate payment
  const existingPayment = await Payment.findOne({ bill: bill._id });
  if (existingPayment && existingPayment.status === 'captured') {
    return next(new AppError('Duplicate payment detected. Payment already captured.', 400));
  }

  if (existingPayment && existingPayment.status !== 'created') {
    return next(new AppError('Invalid transfer status', 400));
  }

  // Verify payment with Razorpay
  const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    return next(new AppError('Invalid payment signature', 400));
  }

  const order = await razorpay.orders.fetch(razorpay_order_id);
  if (order.amount !== bill.amount * 100) {
    return next(new AppError('Payment amount mismatch', 400));
  }

  // Update existing payment entry status to 'captured'
  const payment = await Payment.findOneAndUpdate(
    { bill: bill._id },
    {
      razorpay_order_id,
      razorpay_payment_id,
      payment_method: order.method,
      status: 'captured'
    },
    { new: true }
  );

  if (!payment) {
    return next(new AppError('No payment entry found for the bill', 400));
  }

  // Update bill status to 'paid'
  bill.status = 'paid';
  await bill.save();

  // Initiate transfer to provider using Razorpay
  const transferAmount = payment.amount - payment.platform_fee;
  const transfer = await Transfer.create({
    payment: payment._id,
    provider: serviceRequest.service.provider,
    amount: transferAmount,
    status: 'created',
    transfer_mode: 'pending'
  });

  res.status(200).json({
    status: 'success',
    message: 'Payment processed and transfer initiated',
    payment,
    transfer
  });
});


// Process payment from me to customer
exports.processPaymentFromMeToProvider = catchAsync(async (req, res, next) => {
  const { transferId } = req.params;

  // 1. Validate transfer entry
  const transfer = await Transfer.findById(transferId).populate('provider payment');
  if (!transfer) {
    return next(new AppError('Transfer not found', 404));
  }

  if (transfer.status === 'captured') {
    return next(new AppError('Duplicate transfer detected. Transfer already captured.', 400));
  }
  
  if (transfer.status !== 'created') {
    return next(new AppError('Invalid transfer status', 400));
  }

  // 2. Validate provider bank details
  const providerBankDetails = await ProviderBankDetail.findOne({ provider: transfer.provider._id });
  if (!providerBankDetails || providerBankDetails.verification_status !== 'verified') {
    return next(new AppError('Provider bank details not verified or missing', 400));
  }

  // 3. Perform Razorpay fund transfer
  const fundTransfer = await razorpay.transfers.create({
    account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
    amount: transfer.amount,
    currency: 'INR',
    mode: transfer.transfer_mode,
    purpose: 'payout',
    fund_account_id: providerBankDetails.razorpay_fund_id,
    notes: {
      payment_id: transfer.payment._id.toString(),
      provider_id: transfer.provider._id.toString()
    }
  });

  // 4. Update transfer status
  transfer.status = 'captured';
  await transfer.save();

  res.status(200).json({
    status: 'success',
    message: 'Payment successfully transferred to provider',
    fundTransfer
  });
});


// testing
exports.createOrder = catchAsync(async(req, res, next) => {
  const razorpay = new Razorpay({
      key_id: "rzp_test_V3eLJGsq0GMluZ",
      key_secret: "0OT7aG5vG6bvT60WmtBoEY5G"
  })

  const options = {
      amount: req.body.amount,
      currency: req.body.currency,
      receipt: "receipt#1",
      payment_capture: 1
  }

  try {
      const response = await razorpay.orders.create(options)

      res.json({
          order_id: response.id,
          currency: response.currency,
          amount: response.amount
      })
  } catch (error) {
      res.status(500).send("Internal server error")
  }
})

exports.getPaymentDetails = catchAsync(async(req, res) => {
  const {paymentId} = req.params;

  const razorpay = new Razorpay({
      key_id: "rzp_test_GcZZFDPP0jHtC4",
      key_secret: "6JdtQv2u7oUw7EWziYeyoewJ"
  })
  
  try {
      const payment = await razorpay.payments.fetch(paymentId)

      if (!payment){
          return res.status(500).json("Error at razorpay loading")
      }

      res.json({
          status: payment.status,
          method: payment.method,
          amount: payment.amount,
          currency: payment.currency
      })
  } catch(error) {
      res.status(500).json("failed to fetch")
  }
})
