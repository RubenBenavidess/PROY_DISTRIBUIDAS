import { Schema, model, Document, Types } from 'mongoose';

export interface IRoom extends Document {
    ownerId: Types.ObjectId;
    adminsIds: Types.ObjectId[];
    title?: string;
    description?: string;
}

const roomSchema = new Schema<IRoom>(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            ref:  'User',
            required: true,
        },
        adminsIds: [
            {
                type: Schema.Types.ObjectId,
                ref:  'User',
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
    },
    makeOptions<IRoom>(),
);

roomSchema.index({ ownerId: 1, createdAt: -1 });
roomSchema.index({ posts: 1 });

export const RoomModel = model<IRoom>('Room', roomSchema);