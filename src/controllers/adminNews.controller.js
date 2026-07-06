const httpStatus = require('http-status');
const { adminNewsService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/response');

const listNews = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await adminNewsService.listNews(req.query);
  sendSuccess(
    res,
    httpStatus.OK,
    'News posts fetched successfully',
    { posts: results },
    { page, limit, total, totalPages }
  );
});

const getNews = catchAsync(async (req, res) => {
  const news = await adminNewsService.getNewsById(req.params.id);
  sendSuccess(res, httpStatus.OK, 'News post fetched successfully', { news });
});

const deleteNews = catchAsync(async (req, res) => {
  await adminNewsService.deleteNews(req.params.id);
  sendSuccess(res, httpStatus.OK, 'News post deleted successfully');
});

module.exports = {
  listNews,
  getNews,
  deleteNews,
};
