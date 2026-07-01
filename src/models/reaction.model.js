const mongoose = require('mongoose');

const toJSON = require('./plugins/toJSON.plugin');

const reactionSchema = mongoose.Schema(
  {
    news: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'News',
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

reactionSchema.index({ news: 1, user: 1 }, { unique: true });

reactionSchema.plugin(toJSON);

const Reaction = mongoose.model('Reaction', reactionSchema);

module.exports = Reaction;
