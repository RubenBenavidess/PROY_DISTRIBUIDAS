import mongoose from 'mongoose';

const { Schema } = mongoose;

const ImmutableLogSchema = new Schema(
  {
    /**
     * Campo de Identificación y Trazabilidad del Log
     */
    id: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      immutable: true,
      index: true,
    },
    actorId: {
      type: String,
      required: true,
      immutable: true,
    },
    eventType: {
      type: String,
      required: true,
      immutable: true,
    },
    details: {
      type: Schema.Types.Mixed,
      required: true,
      immutable: true,
    },
    previousHash: {
      type: String,
      required: true,
      immutable: true,
      index: true,
    },
    hash: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      index: true,
    },
    signature: {
      type: String,
      required: true,
      immutable: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Índice para Optimizar la Lectura del Último Hash
ImmutableLogSchema.index({ timestamp: -1 });

export const ImmutableLogModel = mongoose.model('AuditLog', ImmutableLogSchema);
