const mongoose = require('mongoose');

const toJSON = require('./plugins/toJSON.plugin');

const campaignReportSchema = mongoose.Schema(
  {
    reporter: { type: mongoose.SchemaTypes.ObjectId, ref: 'User', required: true },
    campaign: { type: mongoose.SchemaTypes.ObjectId, ref: 'Campaign', required: true },
    reason: { type: String, required: true },
    description: { type: String, trim: true, default: null },
  },
  { timestamps: true },
);

// One report per user per campaign
campaignReportSchema.index({ reporter: 1, campaign: 1 }, { unique: true });
campaignReportSchema.index({ campaign: 1, createdAt: -1 });

campaignReportSchema.plugin(toJSON);

const CampaignReport = mongoose.model('CampaignReport', campaignReportSchema);

module.exports = { CampaignReport };
