const mongoose = require('mongoose');
const { Schema } = mongoose;

const roomSchema = new Schema({
    roomId: { type: String, required: true, unique: true },
    type: { type: String, enum: ['text', 'multimedia'], default: 'text' },
    pinHash: { type: String, required: true },
    maxFileSize: { type: Number, default: 10 * 1024 * 1024 }, // 10MB
    ownerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    adminsIds: [
        {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    title: {
        type: String,
        maxlength: 128,
    },
    description: {
        type: String,
        maxlength: 512,
    },
    createdAt: { type: Date, default: Date.now },
});

// indexes
roomSchema.index({ ownerId: 1, createdAt: -1 });
roomSchema.index({ posts: 1 });

module.exports = mongoose.model('Room', roomSchema);