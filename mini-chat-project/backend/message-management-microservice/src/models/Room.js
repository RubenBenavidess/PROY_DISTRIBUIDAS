import mongoose from "mongoose";
import { compareHash } from "../security/bcrypter";

const roomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true
    },
    pin: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['text', 'text/media']
    },
    sizeLimit: {
        type: Number,
        required: true,
        default: 30
    },
    contentSizeLimit: {
        type: Number,
        required: true,
        default: 5 // in MB
    },
    title: {
        type: String,
        required: true,
        default: 'Untitled Room'
    }
}, {
    timestamps: true
});

roomSchema.index({ type: 1, createdAt: -1 });
roomSchema.index({ roomId: 1, type: 1 });

roomSchema.methods.comparePin = async function(candidatePin) {
    return await compareHash(candidatePin, this.pin);
};

roomSchema.methods.canAddMore = function(currentSize) {
    return currentSize < this.sizeLimit;
};

const Room = mongoose.model('Room', roomSchema);

export default Room;