const mongoose = require('mongoose');

const toJSON = require('./plugins/toJSON.plugin');

const categorySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

categorySchema.plugin(toJSON);

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
