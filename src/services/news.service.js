const httpStatus = require('http-status');

const { Category, Comment, News, Reaction, Report } = require('../models');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/paginate');
const notificationService = require('./notification.service');

const getNewsOr404 = async (id) => {
  const news = await News.findById(id);
  if (!news) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Post not found');
  }
  return news;
};

const getCommentOr404 = async (commentId, newsId) => {
  const comment = await Comment.findOne({ _id: commentId, news: newsId, parentComment: null });
  if (!comment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Comment not found');
  }
  return comment;
};

const createNews = async (user, files, body) => {
  const categoryIds = Array.isArray(body.categories) ? body.categories : [body.categories];
  const categoryDocs = await Category.find({ _id: { $in: categoryIds } });
  if (categoryDocs.length !== categoryIds.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'One or more invalid categories');
  }

  const media = files.map((file) => ({
    url: file.location,
    key: file.key,
    type: file.mimetype.startsWith('video/') ? 'video' : 'image',
  }));

  return News.create({
    author: user.id,
    media,
    caption: body.caption,
    description: body.description || null,
    categories: categoryIds,
    location: body.location || null,
  });
};

const buildAdminFilter = (query) => {
  const filter = query.status ? { status: query.status } : { status: { $ne: 'deleted' } };
  if (query.category) filter.categories = query.category;
  if (query.author) filter.author = query.author;
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.createdAt.$lte = new Date(query.dateTo);
  }
  return filter;
};

const buildUserFilter = (user, query) => {
  if (query.author) {
    const isSelf = query.author === user.id;
    const filter = { author: query.author };
    filter.status = isSelf ? query.status || { $ne: 'deleted' } : 'public';
    if (query.category) filter.categories = query.category;
    return filter;
  }

  if (query.isConnection) {
    const followingSet = new Set(user.following.map((id) => id.toString()));
    const connectionIds = user.followers.filter((id) => followingSet.has(id.toString()));
    const filter = { status: 'public', author: { $in: connectionIds } };
    if (query.category) filter.categories = query.category;
    return filter;
  }

  // Feed mode: all public posts, optionally narrowed to a single requested category
  const filter = { status: 'public' };
  if (query.category) filter.categories = query.category;
  return filter;
};

const attachUserContext = async (posts, user) => {
  if (!user) {
    return posts.map((post) => ({ ...post.toJSON(), isLike: false, isFollow: false, isMyPost: false }));
  }

  const postIds = posts.map((post) => post.id);
  const likedReactions = await Reaction.find({ news: { $in: postIds }, user: user.id, type: 'like' }).select('news');
  const likedSet = new Set(likedReactions.map((r) => r.news.toString()));
  const followingSet = new Set(user.following.map((id) => id.toString()));

  return posts.map((post) => {
    const authorId = post.author.id;
    return {
      ...post.toJSON(),
      isLike: likedSet.has(post.id),
      isFollow: followingSet.has(authorId),
      isMyPost: authorId === user.id,
    };
  });
};

const listNews = async (user, query) => {
  let filter;
  if (!user) {
    filter = { status: 'public' };
    if (query.category) filter.categories = query.category;
  } else {
    filter = user.isOperator() ? buildAdminFilter(query) : buildUserFilter(user, query);
  }
  const result = await paginate(News, filter, query.page, query.limit, [
    ['author', 'name avatar role'],
    ['categories', 'name'],
  ]);
  return { ...result, results: await attachUserContext(result.results, user) };
};

const listNewsByCategory = async (user, categoryId, query) => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }

  const isOperator = user.isOperator();
  if (!isOperator) {
    const isFollowing = user.followedCategories.some((c) => c.toString() === categoryId);
    if (!isFollowing) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You can only view news for categories you follow');
    }
  }

  const filter = { categories: categoryId };
  filter.status = isOperator ? query.status || { $ne: 'deleted' } : 'public';

  return paginate(News, filter, query.page, query.limit, [
    ['author', 'name avatar role'],
    ['categories', 'name'],
  ]);
};

const getNewsById = async (user, id) => {
  const news = await getNewsOr404(id);
  const isOwner = Boolean(user) && news.author.toString() === user.id;
  const isOperator = Boolean(user) && user.isOperator();
  if (!isOperator && !isOwner && news.status !== 'public') {
    throw new ApiError(httpStatus.NOT_FOUND, 'Post not found');
  }
  const populated = await News.findById(id).populate('author', 'name avatar role').populate('categories', 'name');
  const [result] = await attachUserContext([populated], user);
  return result;
};

const updateNews = async (user, id, body) => {
  const news = await getNewsOr404(id);
  if (news.author.toString() !== user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only edit your own posts');
  }

  if (body.categories !== undefined) {
    const categoryIds = Array.isArray(body.categories) ? body.categories : [body.categories];
    const categoryDocs = await Category.find({ _id: { $in: categoryIds } });
    if (categoryDocs.length !== categoryIds.length) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'One or more invalid categories');
    }
    news.categories = categoryIds;
  }
  if (body.caption !== undefined) news.caption = body.caption;
  if (body.description !== undefined) news.description = body.description || null;
  if (body.location !== undefined) news.location = body.location || null;

  await news.save();
  return News.findById(id).populate('author', 'name avatar role').populate('categories', 'name');
};

const reportNews = async (user, id, { reason, description }) => {
  const news = await getNewsOr404(id);
  if (news.status === 'deleted') throw new ApiError(httpStatus.NOT_FOUND, 'Post not found');
  if (news.author.toString() === user.id) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot report your own post');
  }

  try {
    await Report.create({ reporter: user.id, news: id, reason, description: description || null });
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(httpStatus.CONFLICT, 'You have already reported this post');
    }
    throw err;
  }
};

const deleteNews = async (user, id) => {
  const news = await getNewsOr404(id);
  const isOwner = news.author.toString() === user.id;
  if (!isOwner && !user.isOperator()) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only delete your own posts');
  }
  news.status = 'deleted';
  await news.save();
};

const reactToNews = async (user, id, type) => {
  const news = await getNewsOr404(id);
  const existing = await Reaction.findOne({ news: id, user: user.id });

  if (existing && existing.type === type) {
    return news;
  }

  if (existing) {
    existing.type = type;
    await existing.save();
    if (type === 'like') {
      news.likesCount += 1;
      news.dislikesCount = Math.max(0, news.dislikesCount - 1);
    } else {
      news.dislikesCount += 1;
      news.likesCount = Math.max(0, news.likesCount - 1);
    }
  } else {
    await Reaction.create({ news: id, user: user.id, type });
    if (type === 'like') {
      news.likesCount += 1;
    } else {
      news.dislikesCount += 1;
    }
  }

  await news.save();

  if (type === 'like') {
    notificationService
      .createNotification({ recipient: news.author, sender: user.id, type: 'like', data: { newsId: id } })
      .catch(() => {});
  }

  return news;
};

const removeReaction = async (user, id) => {
  const news = await getNewsOr404(id);
  const existing = await Reaction.findOneAndDelete({ news: id, user: user.id });
  if (!existing) {
    return news;
  }

  if (existing.type === 'like') {
    news.likesCount = Math.max(0, news.likesCount - 1);
  } else {
    news.dislikesCount = Math.max(0, news.dislikesCount - 1);
  }
  await news.save();
  return news;
};

const listReactions = async (user, id, query) => {
  await getNewsOr404(id);
  const filter = { news: id };
  if (query.type) filter.type = query.type;
  const result = await paginate(Reaction, filter, query.page, query.limit, [['user', 'name avatar role']]);
  const followingSet = new Set(user.following.map((fid) => fid.toString()));
  return {
    ...result,
    results: result.results.map((reaction) => ({
      ...reaction.toJSON(),
      isFollow: followingSet.has(reaction.user.id),
    })),
  };
};

const addComment = async (user, id, text) => {
  const news = await getNewsOr404(id);
  const comment = await Comment.create({ news: id, author: user.id, text });
  await News.findByIdAndUpdate(id, { $inc: { commentsCount: 1 } });
  notificationService
    .createNotification({ recipient: news.author, sender: user.id, type: 'comment', data: { newsId: id, commentId: comment.id } })
    .catch(() => {});
  return comment.populate('author', 'name avatar role');
};

const listComments = async (id, query) => {
  await getNewsOr404(id);
  return paginate(Comment, { news: id, parentComment: null }, query.page, query.limit, [['author', 'name avatar role']]);
};

const deleteComment = async (user, commentId) => {
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Comment not found');
  }
  const isOwner = comment.author.toString() === user.id;
  if (!isOwner && !user.isOperator()) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only delete your own comments');
  }
  await comment.deleteOne();
  if (!comment.parentComment) {
    await News.findByIdAndUpdate(comment.news, { $inc: { commentsCount: -1 } });
  } else {
    await Comment.findByIdAndUpdate(comment.parentComment, { $inc: { repliesCount: -1 } });
  }
};

const addReply = async (user, newsId, commentId, text) => {
  await getNewsOr404(newsId);
  await getCommentOr404(commentId, newsId);
  const reply = await Comment.create({ news: newsId, author: user.id, text, parentComment: commentId });
  await Comment.findByIdAndUpdate(commentId, { $inc: { repliesCount: 1 } });
  return reply.populate('author', 'name avatar role');
};

const listReplies = async (newsId, commentId, query) => {
  await getNewsOr404(newsId);
  await getCommentOr404(commentId, newsId);
  return paginate(
    Comment,
    { parentComment: commentId },
    query.page,
    query.limit,
    [['author', 'name avatar role']],
    { createdAt: 1 },
  );
};

module.exports = {
  addComment,
  addReply,
  createNews,
  deleteComment,
  deleteNews,
  getNewsById,
  listComments,
  listNews,
  listNewsByCategory,
  listReactions,
  listReplies,
  reactToNews,
  removeReaction,
  reportNews,
  updateNews,
};
