const httpStatus = require('http-status');

const { newsService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/response');

const createNews = catchAsync(async (req, res) => {
  const news = await newsService.createNews(req.user, req.files, req.body);
  sendSuccess(res, httpStatus.CREATED, 'Post created successfully', { news });
});

const listNews = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await newsService.listNews(req.user, req.query);
  sendSuccess(res, httpStatus.OK, 'Posts fetched successfully', {
    posts: results,
    meta: { page, limit, total, totalPages },
  });
});

const listNewsByCategory = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await newsService.listNewsByCategory(
    req.user,
    req.params.categoryId,
    req.query,
  );
  sendSuccess(res, httpStatus.OK, 'Posts fetched successfully', {
    posts: results,
    meta: { page, limit, total, totalPages },
  });
});

const getNews = catchAsync(async (req, res) => {
  const news = await newsService.getNewsById(req.user, req.params.id);
  sendSuccess(res, httpStatus.OK, 'Post fetched successfully', { news });
});

const deleteNews = catchAsync(async (req, res) => {
  await newsService.deleteNews(req.user, req.params.id);
  sendSuccess(res, httpStatus.OK, 'Post deleted successfully');
});

const likeNews = catchAsync(async (req, res) => {
  const news = await newsService.reactToNews(req.user, req.params.id, 'like');
  sendSuccess(res, httpStatus.OK, 'Post liked successfully', { news });
});

const dislikeNews = catchAsync(async (req, res) => {
  const news = await newsService.reactToNews(req.user, req.params.id, 'dislike');
  sendSuccess(res, httpStatus.OK, 'Post disliked successfully', { news });
});

const removeReaction = catchAsync(async (req, res) => {
  const news = await newsService.removeReaction(req.user, req.params.id);
  sendSuccess(res, httpStatus.OK, 'Reaction removed successfully', { news });
});

const listReactions = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await newsService.listReactions(req.params.id, req.query);
  sendSuccess(res, httpStatus.OK, 'Reactions fetched successfully', {
    reactions: results,
    meta: { page, limit, total, totalPages },
  });
});

const addComment = catchAsync(async (req, res) => {
  const comment = await newsService.addComment(req.user, req.params.id, req.body.text);
  sendSuccess(res, httpStatus.CREATED, 'Comment added successfully', { comment });
});

const listComments = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await newsService.listComments(req.params.id, req.query);
  sendSuccess(res, httpStatus.OK, 'Comments fetched successfully', {
    comments: results,
    meta: { page, limit, total, totalPages },
  });
});

const deleteComment = catchAsync(async (req, res) => {
  await newsService.deleteComment(req.user, req.params.commentId);
  sendSuccess(res, httpStatus.OK, 'Comment deleted successfully');
});

const addReply = catchAsync(async (req, res) => {
  const reply = await newsService.addReply(req.user, req.params.id, req.params.commentId, req.body.text);
  sendSuccess(res, httpStatus.CREATED, 'Reply added successfully', { reply });
});

const listReplies = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await newsService.listReplies(
    req.params.id,
    req.params.commentId,
    req.query,
  );
  sendSuccess(res, httpStatus.OK, 'Replies fetched successfully', {
    replies: results,
    meta: { page, limit, total, totalPages },
  });
});

module.exports = {
  addComment,
  addReply,
  createNews,
  deleteComment,
  deleteNews,
  dislikeNews,
  getNews,
  likeNews,
  listComments,
  listNews,
  listNewsByCategory,
  listReactions,
  listReplies,
  removeReaction,
};
