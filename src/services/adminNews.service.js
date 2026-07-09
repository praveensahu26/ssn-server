const httpStatus = require('http-status');
const { News, Comment, CommentReaction, Reaction } = require('../models');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/paginate');

const slugify = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toUsername = (user) => slugify(user.name || user.email?.split('@')[0] || user.id);

const formatNews = (news) => ({
  ...news.toObject(),
  id: news._id,
  media: news.media || [],
  viewCount: String(news.viewsCount || 0),
});

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

  const { results, page, limit, total, totalPages } = await paginate(News, filter, query.page, query.limit, [
    ['author', 'name avatar role'],
    ['categories', 'name'],
  ]);

  return { results: results.map(formatNews), page, limit, total, totalPages };
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

  // Fetch comments with author info
  const comments = await Comment.find({ news: news._id, parentComment: null })
    .populate('author', 'name avatar')
    .sort({ createdAt: -1 });

  // Fetch replies for each comment
  const commentsWithReplies = await Promise.all(
    comments.map(async (comment) => {
      const replies = await Comment.find({ parentComment: comment._id })
        .populate('author', 'name avatar')
        .sort({ createdAt: 1 });

      // Fetch comment reactions (likes/dislikes)
      const commentReactions = await CommentReaction.find({ comment: comment._id });
      const likeCount = commentReactions.filter((r) => r.type === 'like').length;
      const dislikeCount = commentReactions.filter((r) => r.type === 'dislike').length;

      // Format replies with reaction data
      const formattedReplies = await Promise.all(
        replies.map(async (reply) => {
          const replyReactions = await CommentReaction.find({ comment: reply._id });
          const replyLikeCount = replyReactions.filter((r) => r.type === 'like').length;
          const replyDislikeCount = replyReactions.filter((r) => r.type === 'dislike').length;

          return {
            _id: reply._id,
            text: reply.text,
            createdAt: reply.createdAt,
            updatedAt: reply.updatedAt,
            author: {
              _id: reply.author._id,
              name: reply.author.name,
              username: toUsername(reply.author),
              avatar: reply.author.avatar,
            },
            likesCount: replyLikeCount,
            dislikesCount: replyDislikeCount,
            isLike: false, // Admin panel doesn't track current user's like state
          };
        })
      );

      return {
        _id: comment._id,
        text: comment.text,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        author: {
          _id: comment.author._id,
          name: comment.author.name,
          username: toUsername(comment.author),
          avatar: comment.author.avatar,
        },
        likesCount: likeCount,
        dislikesCount: dislikeCount,
        isLike: false, // Admin panel doesn't track current user's like state
        replies: formattedReplies,
      };
    })
  );

  // Fetch reactions (likes/dislikes) for the news post
  const reactions = await Reaction.find({ news: id }).populate('user', 'name avatar');

  // Format reactions with user info
  const formattedReactions = reactions.map((reaction) => ({
    _id: reaction._id,
    type: reaction.type,
    user: {
      _id: reaction.user._id,
      name: reaction.user.name,
      username: toUsername(reaction.user),
      avatar: reaction.user.avatar,
    },
    createdAt: reaction.createdAt,
  }));

  // Build the response object
  const newsObject = news.toObject();
  newsObject.id = news._id;
  newsObject.media = news.media || [];
  newsObject.comments = commentsWithReplies;
  newsObject.likes = formattedReactions.filter((r) => r.type === 'like');
  newsObject.dislikes = formattedReactions.filter((r) => r.type === 'dislike');
  newsObject.shareCount = newsObject.sharesCount || 0;

  return newsObject;
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
