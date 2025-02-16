const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Review must belong to a service']
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Review must belong to a customer']
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: [true, 'Please provide a rating between 1 and 5']
  },
  comment: {
    type: String,
    required: [true, 'Please provide a review comment']
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Prevent duplicate reviews from same user for same service
reviewSchema.index({ service: 1, customer: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);