const mongoose = require('mongoose');

const toJSON = require('./plugins/toJSON.plugin');

const CAMPAIGN_REPORT_REASONS = [
  'inappropriate_content',
  'misinformation',
  'hate_speech',
  'defamation',
  'copyright_violation',
  'misleading_headline',
  'irrelevant_content',
  'others',
];

const campaignReportSchema = mongoose.Schema(
  {
    reporter: { type: mongoose.SchemaTypes.ObjectId, ref: 'User', required: true },
    campaign: { type: mongoose.SchemaTypes.ObjectId, ref: 'Campaign', required: true },
    reason: { type: String, enum: CAMPAIGN_REPORT_REASONS, required: true },
    description: { type: String, trim: true, default: null },
  },
  { timestamps: true },
);

// One report per user per campaign
campaignReportSchema.index({ reporter: 1, campaign: 1 }, { unique: true });
campaignReportSchema.index({ campaign: 1, createdAt: -1 });

campaignReportSchema.plugin(toJSON);

const CampaignReport = mongoose.model('CampaignReport', campaignReportSchema);

module.exports = { CampaignReport, CAMPAIGN_REPORT_REASONS };
