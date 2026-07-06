const mongoose = require('mongoose');

const toJSON = require('./plugins/toJSON.plugin');

const commentReactionSchema = mongoose.Schema(
  {
    comment: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Comment',
      required: true,
    },
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['like', 'dislike'],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

commentReactionSchema.index({ comment: 1, user: 1 }, { unique: true });

commentReactionSchema.plugin(toJSON);

const CommentReaction = mongoose.model('CommentReaction', commentReactionSchema);

module.exports = CommentReaction;
