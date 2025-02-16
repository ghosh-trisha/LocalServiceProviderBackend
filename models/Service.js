const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Service must belong to a provider']
  },
  name: {
    type: String,
    required: [true, 'Please enter service name']
  },
  description: String,
  price: {
    type: Number,
    required: [true, 'Please enter service price'],
    min: [0, 'Price must be at least 0']
  },
  location: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: [Number]
  },
  address: {
    type: String,
    required: [true, 'Please enter service address']
  },
  parent_service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

serviceSchema.index({ location: '2dsphere' });
serviceSchema.index({ provider: 1 });
module.exports = mongoose.model('Service', serviceSchema);