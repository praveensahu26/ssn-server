const mongoose = require('mongoose');

const toJSON = require('./plugins/toJSON.plugin');

const mediaItemSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    key: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], required: true },
  },
  { _id: false },
);

const newsSchema = mongoose.Schema(
  {
    author: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    media: {
      type: [mediaItemSchema],
      validate: { validator: (v) => v.length > 0, message: 'At least one media item is required' },
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
    location: {
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
    status: {
      type: String,
      enum: ['public', 'flagged', 'deleted'],
      default: 'public',
    },
    flagReason: {
      type: String,
      default: null,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    dislikesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    sharesCount: {
      type: Number,
      default: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

newsSchema.plugin(toJSON);

newsSchema.index({ caption: 1 });

const News = mongoose.model('News', newsSchema);

module.exports = News;
