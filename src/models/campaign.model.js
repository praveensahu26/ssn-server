const mongoose = require('mongoose');

const config = require('../config/config');
const toJSON = require('./plugins/toJSON.plugin');

const campaignSchema = mongoose.Schema(
  {
    // Single organizer only — multi-person "Fundraising Team" is out of scope for this module.
    organizer: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    caption: {
      type: String,
      trim: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    categories: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'Category',
      },
    ],
    tags: {
      type: [String],
      default: [],
    },
    goalAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    raisedAmount: {
      type: Number,
      default: 0,
    },
    donationsCount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: () => config.stripe.currency,
      uppercase: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      trim: true,
      default: null,
    },
    attachments: [
      {
        type: { type: String, enum: ['image', 'video'], required: true },
        url: { type: String, required: true },
        key: { type: String, required: true },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'active', 'rejected', 'completed', 'suspended'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    suspensionReasons: {
      type: [String],
      enum: [
        'Violation of Platform Guidelines',
        'Misleading or False Information',
        'Inappropriate Content',
        'Reported for Fraudulent Activity',
        'Other',
      ],
      default: [],
    },
    suspensionNote: {
      type: String,
      default: null,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    mutedBy: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  },
);

campaignSchema.index({ status: 1, categories: 1, createdAt: -1 });
campaignSchema.index({ organizer: 1, status: 1 });

campaignSchema.plugin(toJSON);

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;
