const mongoose = require('mongoose');

const toJSON = require('./plugins/toJSON.plugin');

const newsSchema = mongoose.Schema(
  {
    author: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    mediaKey: {
      type: String,
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
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      city: { type: String, trim: true, default: null },
      state: { type: String, trim: true, default: null },
      country: { type: String, trim: true, default: null },
    },
    category: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Category',
      required: true,
    },
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
  },
  {
    timestamps: true,
  },
);

newsSchema.plugin(toJSON);

const News = mongoose.model('News', newsSchema);

module.exports = News;
