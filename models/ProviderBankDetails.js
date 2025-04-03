const mongoose = require('mongoose');

const providerBankDetailSchema = new mongoose.Schema({
    provider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Provider ID is required']
    },
    account_holder: {
        type: String,
        required: [true, 'Account holder name is required']
    },
    account_number: {
        type: String,
        required: [true, 'Account number is required'],
        index: true
    },
    ifsc: {
        type: String,
        required: [true, 'IFSC code is required'],
        uppercase: true
    },
    razorpay_contact_id: {
        type: String,
        unique: true
    },
    razorpay_fund_id: {
        type: String,
        unique: true
    },
    verification_status: {
        type: String,
        enum: ['pending', 'verified', 'failed'],
        default: 'pending'
    }
}, {
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
});

providerBankDetailSchema.index({ provider: 1 });

module.exports = mongoose.model('ProviderBankDetail', providerBankDetailSchema);