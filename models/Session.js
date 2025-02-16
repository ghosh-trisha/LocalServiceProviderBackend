const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A session must belong to a user']
  },
  loginTime: {
    type: Date,
    default: Date.now
  },
  logoutTime: {
    type: Date
  },
  ip: {
    type: String,
    required: [true, 'A session must have an IP address']
  },
  userAgent: {
    type: String,
    required: [true, 'A session must have a user agent']
  },
  active: {
    type: Boolean,
    default: true
  }
});

// Index for faster querying of active sessions
sessionSchema.index({ user: 1, active: 1 });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;