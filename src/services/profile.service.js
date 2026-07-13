const httpStatus = require('http-status');

const { News, ProfileReport, User } = require('../models');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/paginate');
const { deleteS3Object } = require('./s3.service');
const notificationService = require('./notification.service');

const getUserOr404 = async (userId) => {
  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user;
};

const buildProfileStats = async (userId) => {
  const [postsCount, user] = await Promise.all([
    News.countDocuments({ author: userId, status: { $ne: 'deleted' } }),
    User.findById(userId).select('followers following'),
  ]);
  return {
    postsCount,
    followersCount: user.followers.length,
    followingCount: user.following.length,
  };
};

const getOwnProfile = async (userId) => {
  const [user, stats] = await Promise.all([
    User.findById(userId).populate('followedCategories', 'name'),
    buildProfileStats(userId),
  ]);
  return { ...user.toJSON(), ...stats };
};

const getUserProfile = async (targetId, currentUserId) => {
  const user = await getUserOr404(targetId);
  const stats = await buildProfileStats(targetId);
  const isFollowing = user.followers.some((id) => id.toString() === currentUserId);
  const visibility = user.privacySettings?.profileVisibility || 'everyone';
  const isOwner = targetId.toString() === currentUserId.toString();
  let isPrivate = false;
  if (isOwner) {
    isPrivate = false;
  } else if (visibility === 'private') {
    isPrivate = true;
  } else if (visibility === 'connections_only') {
    isPrivate = !isFollowing;
  } else {
    isPrivate = false;
  }
  const json = user.toJSON();
  // strip private fields for other users
  delete json.blockedUsers;
  delete json.savedPosts;
  delete json.privacySettings;
  delete json.preferences;
  delete json.followedCategories;
  return { ...json, ...stats, isFollowing, isPrivate };
};

const updateProfile = async (user, body) => {
  const allowed = ['name', 'bio', 'gender', 'dateOfBirth', 'liveCaption', 'liveUrl', 'location'];
  const updates = allowed.reduce((acc, field) => {
    if (body[field] !== undefined) acc[field] = body[field];
    return acc;
  }, {});
  user.set(updates);
  await user.save();
  return User.findById(user.id).populate('followedCategories', 'name');
};

const uploadAvatar = async (user, file) => {
  const oldKey = user.avatarKey;
  user.set({ avatar: file.location, avatarKey: file.key });
  await user.save();
  if (oldKey) await deleteS3Object(oldKey);
  return { avatar: user.avatar };
};

const deleteAvatar = async (user) => {
  const key = user.avatarKey;
  user.set({ avatar: null, avatarKey: null });
  await user.save();
  if (key) await deleteS3Object(key);
};

const uploadCoverPhoto = async (user, file) => {
  const oldKey = user.coverPhotoKey;
  user.set({ coverPhoto: file.location, coverPhotoKey: file.key });
  await user.save();
  if (oldKey) await deleteS3Object(oldKey);
  return { coverPhoto: user.coverPhoto };
};

const deleteCoverPhoto = async (user) => {
  const key = user.coverPhotoKey;
  user.set({ coverPhoto: null, coverPhotoKey: null });
  await user.save();
  if (key) await deleteS3Object(key);
};

const getMyPosts = async (userId, query) => {
  const filter = { author: userId, status: { $ne: 'deleted' } };
  return paginate(News, filter, query.page, query.limit, [['categories', 'name']]);
};

const getUserPosts = async (targetId, query) => {
  await getUserOr404(targetId);
  return paginate(News, { author: targetId, status: 'public' }, query.page, query.limit, [['categories', 'name']]);
};

const getSavedPosts = async (user, query) => {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const total = user.savedPosts.length;
  const ids = [...user.savedPosts].reverse().slice((page - 1) * limit, page * limit);
  const posts = await News.find({ _id: { $in: ids }, status: { $ne: 'deleted' } })
    .populate('author', 'name avatar role')
    .populate('categories', 'name');
  return { results: posts, page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
};

const savePost = async (user, newsId) => {
  const news = await News.findById(newsId);
  if (!news || news.status === 'deleted') {
    throw new ApiError(httpStatus.NOT_FOUND, 'Post not found');
  }
  const alreadySaved = user.savedPosts.some((id) => id.toString() === newsId);
  if (!alreadySaved) {
    user.savedPosts.push(newsId);
    await user.save();
  }
};

const unsavePost = async (user, newsId) => {
  user.set({ savedPosts: user.savedPosts.filter((id) => id.toString() !== newsId) });
  await user.save();
};

const getFollowing = async (user, query) => {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const total = user.following.length;
  const ids = [...user.following].reverse().slice((page - 1) * limit, page * limit);
  const users = await User.find({ _id: { $in: ids }, isDeleted: false }).select('name avatar bio role isVerified');
  return { results: users, page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
};

const getFollowers = async (user, query) => {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const total = user.followers.length;
  const ids = [...user.followers].reverse().slice((page - 1) * limit, page * limit);
  const users = await User.find({ _id: { $in: ids }, isDeleted: false }).select('name avatar bio role isVerified');
  return { results: users, page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
};

const getUserFollowers = async (targetId, query) => {
  const user = await getUserOr404(targetId);
  const page = query.page || 1;
  const limit = query.limit || 20;
  const total = user.followers.length;
  const ids = [...user.followers].reverse().slice((page - 1) * limit, page * limit);
  const users = await User.find({ _id: { $in: ids }, isDeleted: false }).select('name avatar bio role isVerified');
  return { results: users, page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
};

const getUserFollowing = async (targetId, query) => {
  const user = await getUserOr404(targetId);
  const page = query.page || 1;
  const limit = query.limit || 20;
  const total = user.following.length;
  const ids = [...user.following].reverse().slice((page - 1) * limit, page * limit);
  const users = await User.find({ _id: { $in: ids }, isDeleted: false }).select('name avatar bio role isVerified');
  return { results: users, page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
};

const followUser = async (user, targetId) => {
  if (user.id === targetId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot follow yourself');
  }
  const target = await getUserOr404(targetId);
  const alreadyFollowing = user.following.some((id) => id.toString() === targetId);
  if (!alreadyFollowing) {
    user.following.push(targetId);
    target.followers.push(user.id);
    await Promise.all([user.save(), target.save()]);
    notificationService
      .createNotification({ recipient: targetId, sender: user.id, type: 'follow' })
      .catch(() => {});
  }
};

const unfollowUser = async (user, targetId) => {
  const target = await User.findById(targetId);
  user.following.pull(targetId);
  if (target) {
    target.followers.pull(user.id);
    await Promise.all([user.save(), target.save()]);
  } else {
    await user.save();
  }
};

const removeFollower = async (user, targetId) => {
  const target = await User.findById(targetId);
  user.followers.pull(targetId);
  if (target) {
    target.following.pull(user.id);
    await Promise.all([user.save(), target.save()]);
  } else {
    await user.save();
  }
};

const shareProfile = async (targetId) => {
  const target = await User.findByIdAndUpdate(targetId, { $inc: { sharesCount: 1 } }, { new: true });
  if (!target || target.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return { sharesCount: target.sharesCount };
};

const reportProfile = async (user, targetId, { reason, description }) => {
  if (user.id === targetId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot report your own profile');
  }
  await getUserOr404(targetId);

  try {
    await ProfileReport.create({ reporter: user.id, reportedUser: targetId, reason, description: description || null });
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(httpStatus.CONFLICT, 'You have already reported this profile');
    }
    throw err;
  }
};

const blockProfile = async (user, targetId) => {
  if (user.id === targetId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot block yourself');
  }
  await getUserOr404(targetId);

  const alreadyBlocked = user.blockedUsers.some((id) => id.toString() === targetId);
  if (!alreadyBlocked) {
    user.blockedUsers.push(targetId);
    await user.save();
  }
};

const unblockProfile = async (user, targetId) => {
  user.set({ blockedUsers: user.blockedUsers.filter((id) => id.toString() !== targetId) });
  await user.save();
};

module.exports = {
  blockProfile,
  deleteAvatar,
  deleteCoverPhoto,
  followUser,
  getFollowers,
  getFollowing,
  getMyPosts,
  getOwnProfile,
  getSavedPosts,
  getUserFollowers,
  getUserFollowing,
  getUserPosts,
  getUserProfile,
  removeFollower,
  reportProfile,
  savePost,
  shareProfile,
  unblockProfile,
  unfollowUser,
  unsavePost,
  updateProfile,
  uploadAvatar,
  uploadCoverPhoto,
};
