const httpStatus = require('http-status');
const { News } = require('../models');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/paginate');

/**
 * List all news posts with optional admin filters
 * @param {Object} query
 * @returns {Promise<Object>}
 */
const listNews = async (query) => {
  const filter = { status: { $ne: 'deleted' } };
  if (query.status) {
    filter.status = query.status;
  }
  if (query.category) {
    filter.categories = query.category;
  }
  if (query.author) {
    filter.author = query.author;
  }
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.createdAt.$lte = new Date(query.dateTo);
  }

  return paginate(News, filter, query.page, query.limit, [
    ['author', 'name avatar role'],
    ['categories', 'name'],
  ]);
};

/**
 * Get news post details by ID
 * @param {string} id
 * @returns {Promise<Object>}
 */
const getNewsById = async (id) => {
  const news = await News.findById(id)
    .populate('author', 'name avatar role')
    .populate('categories', 'name');

  if (!news || news.status === 'deleted') {
    throw new ApiError(httpStatus.NOT_FOUND, 'Post not found');
  }

  return news;
};

/**
 * Delete a news post (soft delete by status = deleted)
 * @param {string} id
 * @returns {Promise<void>}
 */
const deleteNews = async (id) => {
  const news = await News.findById(id);
  if (!news || news.status === 'deleted') {
    throw new ApiError(httpStatus.NOT_FOUND, 'Post not found');
  }

  news.status = 'deleted';
  await news.save();
};

module.exports = {
  listNews,
  getNewsById,
  deleteNews,
};
