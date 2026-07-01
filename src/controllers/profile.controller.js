const httpStatus = require('http-status');

const { profileService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/response');

const getOwnProfile = catchAsync(async (req, res) => {
  const profile = await profileService.getOwnProfile(req.user.id);
  sendSuccess(res, httpStatus.OK, 'Profile fetched successfully', { user: profile });
});

const getUserProfile = catchAsync(async (req, res) => {
  const profile = await profileService.getUserProfile(req.params.userId, req.user.id);
  sendSuccess(res, httpStatus.OK, 'Profile fetched successfully', { user: profile });
});

const updateProfile = catchAsync(async (req, res) => {
  const user = await profileService.updateProfile(req.user, req.body);
  sendSuccess(res, httpStatus.OK, 'Profile updated successfully', { user });
});

const uploadAvatar = catchAsync(async (req, res) => {
  const result = await profileService.uploadAvatar(req.user, req.file);
  sendSuccess(res, httpStatus.OK, 'Profile photo updated successfully', result);
});

const deleteAvatar = catchAsync(async (req, res) => {
  await profileService.deleteAvatar(req.user);
  sendSuccess(res, httpStatus.OK, 'Profile photo deleted successfully');
});

const uploadCoverPhoto = catchAsync(async (req, res) => {
  const result = await profileService.uploadCoverPhoto(req.user, req.file);
  sendSuccess(res, httpStatus.OK, 'Cover photo updated successfully', result);
});

const deleteCoverPhoto = catchAsync(async (req, res) => {
  await profileService.deleteCoverPhoto(req.user);
  sendSuccess(res, httpStatus.OK, 'Cover photo deleted successfully');
});

const getMyPosts = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await profileService.getMyPosts(req.user.id, req.query);
  sendSuccess(res, httpStatus.OK, 'Posts fetched successfully', {
    posts: results,
    meta: { page, limit, total, totalPages },
  });
});

const getUserPosts = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await profileService.getUserPosts(req.params.userId, req.query);
  sendSuccess(res, httpStatus.OK, 'Posts fetched successfully', {
    posts: results,
    meta: { page, limit, total, totalPages },
  });
});

const getSavedPosts = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await profileService.getSavedPosts(req.user, req.query);
  sendSuccess(res, httpStatus.OK, 'Saved posts fetched successfully', {
    posts: results,
    meta: { page, limit, total, totalPages },
  });
});

const savePost = catchAsync(async (req, res) => {
  await profileService.savePost(req.user, req.params.newsId);
  sendSuccess(res, httpStatus.OK, 'Post saved successfully');
});

const unsavePost = catchAsync(async (req, res) => {
  await profileService.unsavePost(req.user, req.params.newsId);
  sendSuccess(res, httpStatus.OK, 'Post removed from saved');
});

const getFollowing = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await profileService.getFollowing(req.user, req.query);
  sendSuccess(res, httpStatus.OK, 'Following list fetched successfully', {
    users: results,
    meta: { page, limit, total, totalPages },
  });
});

const getFollowers = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await profileService.getFollowers(req.user, req.query);
  sendSuccess(res, httpStatus.OK, 'Followers list fetched successfully', {
    users: results,
    meta: { page, limit, total, totalPages },
  });
});

const followUser = catchAsync(async (req, res) => {
  await profileService.followUser(req.user, req.params.userId);
  sendSuccess(res, httpStatus.OK, 'User followed successfully');
});

const unfollowUser = catchAsync(async (req, res) => {
  await profileService.unfollowUser(req.user, req.params.userId);
  sendSuccess(res, httpStatus.OK, 'User unfollowed successfully');
});

const removeFollower = catchAsync(async (req, res) => {
  await profileService.removeFollower(req.user, req.params.userId);
  sendSuccess(res, httpStatus.OK, 'Follower removed successfully');
});

module.exports = {
  deleteAvatar,
  deleteCoverPhoto,
  followUser,
  getFollowers,
  getFollowing,
  getMyPosts,
  getOwnProfile,
  getSavedPosts,
  getUserPosts,
  getUserProfile,
  removeFollower,
  savePost,
  unfollowUser,
  unsavePost,
  updateProfile,
  uploadAvatar,
  uploadCoverPhoto,
};
