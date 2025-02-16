const mongoose = require('mongoose');

const razorpayPaymentSchema = new mongoose.Schema({
  bill: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    required: [true, 'Bill reference is required']
  },
  razorpay_order_id: {
    type: String,
    required: [true, 'Razorpay order ID is required'],
    unique: true
  },
  razorpay_payment_id: {
    type: String,
    required: [true, 'Razorpay payment ID is required'],
    unique: true
  },
  razorpay_signature: {
    type: String,
    required: [true, 'Razorpay signature is required']
  },
  payment_method: {
    type: String,
    enum: ['UPI', 'Card'],
    required: [true, 'Payment method is required']
  },
  payment_status: {
    type: String,
    enum: ['captured', 'failed', 'pending'],
    default: 'pending'
  },
  payment_date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for frequent query fields
razorpayPaymentSchema.index({ bill: 1 });
razorpayPaymentSchema.index({ payment_status: 1 });
razorpayPaymentSchema.index({ payment_date: -1 });

const RazorpayPayment = mongoose.model('RazorpayPayment', razorpayPaymentSchema);

module.exports = RazorpayPayment;