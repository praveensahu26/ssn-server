const mongoose = require('mongoose');

const toJSON = require('./plugins/toJSON.plugin');

const reportSchema = mongoose.Schema(
  {
    reporter: { type: mongoose.SchemaTypes.ObjectId, ref: 'User', required: true },
    news: { type: mongoose.SchemaTypes.ObjectId, ref: 'News', required: true },
    reason: { type: String, required: true },
    description: { type: String, trim: true, default: null },
  },
  { timestamps: true },
);

// One report per user per post
reportSchema.index({ reporter: 1, news: 1 }, { unique: true });
reportSchema.index({ news: 1, createdAt: -1 });

reportSchema.plugin(toJSON);

const Report = mongoose.model('Report', reportSchema);

module.exports = { Report };
