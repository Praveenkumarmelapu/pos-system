import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    shopId: {
      type: String,
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    action: {
      type: String,
      required: true // e.g., 'auth:login', 'sale:create', 'product:create'
    },
    resourceType: {
      type: String,
      default: ''
    },
    resourceId: {
      type: String,
      default: ''
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ shopId: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
