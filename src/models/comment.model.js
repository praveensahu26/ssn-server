const mongoose = require('mongoose');

const toJSON = require('./plugins/toJSON.plugin');

const commentSchema = mongoose.Schema(
  {
    news: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'News',
      required: true,
    },
    author: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      trim: true,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

commentSchema.plugin(toJSON);

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
