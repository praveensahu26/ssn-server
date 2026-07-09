const mongoose = require('mongoose');

const toJSON = require('./plugins/toJSON.plugin');

const PROFILE_REPORT_REASONS = [
  'fake_account',
  'impersonation',
  'spam',
  'harassment',
  'hate_speech',
  'inappropriate_content',
  'others',
];

const profileReportSchema = mongoose.Schema(
  {
    reporter: { type: mongoose.SchemaTypes.ObjectId, ref: 'User', required: true },
    reportedUser: { type: mongoose.SchemaTypes.ObjectId, ref: 'User', required: true },
    reason: { type: String, enum: PROFILE_REPORT_REASONS, required: true },
    description: { type: String, trim: true, default: null },
  },
  { timestamps: true },
);

// One report per user per profile
profileReportSchema.index({ reporter: 1, reportedUser: 1 }, { unique: true });
profileReportSchema.index({ reportedUser: 1, createdAt: -1 });

profileReportSchema.plugin(toJSON);

const ProfileReport = mongoose.model('ProfileReport', profileReportSchema);

module.exports = { ProfileReport, PROFILE_REPORT_REASONS };
