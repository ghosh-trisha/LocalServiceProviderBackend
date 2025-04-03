const mongoose = require('mongoose');
const Schema = mongoose.Schema;


// Transfer Schema
const transferSchema = new Schema({
    payment: {
        type: Schema.Types.ObjectId,
        ref: 'Payment',
        required: [true, 'Payment reference is required'] // Reference to the payment associated with the transfer
    },
    provider: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Provider reference is required'] // Provider receiving the transferred amount
    },
    amount: {
        type: Number,
        required: [true, 'Transfer amount is required'] // The amount to be transferred
    },
    status: {
        type: String,
        enum: ['created', 'captured' , 'failed'],
        default: 'created' // Status of the transfer
    },
    transfer_mode: {
        type: String,
        enum: ['upi', 'imps', 'neft', 'rtgs'],
        required: [true, 'Transfer mode is required'] // Transfer mode used for the payment
    },
    createdAt: {
        type: Date,
        default: Date.now // Timestamp for when the transfer was initiated
    },
    updatedAt: {
        type: Date,
        default: Date.now // Timestamp for when the transfer was last updated
    }
});

module.exports = mongoose.model('Transfer', transferSchema); // Export the Transfer model