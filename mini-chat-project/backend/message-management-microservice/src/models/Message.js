import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        index: true
    },
    username: {
        type: String,
        required: true
    },
    userIP: {
        type: String,
        required: true
    },
    contentType: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ roomId: 1, contentType: 1 });
messageSchema.index({ username: 1, createdAt: -1 });
messageSchema.index({ userIP: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;