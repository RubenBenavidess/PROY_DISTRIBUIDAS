const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    roomId: { type: String, required: true, index: true },
    username: { type: String, default: 'Anonimo' },
    msg: { type: String },
    file: {
        filename: String,
        originalname: String,
        mimetype: String,
        size: Number,
        url: String
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);
