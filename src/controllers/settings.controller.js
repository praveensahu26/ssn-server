const httpStatus = require('http-status');

const { settingsService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/response');

const getProfile = catchAsync(async (req, res) => {
  const user = await settingsService.getProfile(req.user);
  sendSuccess(res, httpStatus.OK, 'Profile fetched successfully', { user });
});

const updateProfile = catchAsync(async (req, res) => {
  const user = await settingsService.updateProfile(req.user, req.body);
  sendSuccess(res, httpStatus.OK, 'Profile updated successfully', { user });
});

const getAccountInfo = catchAsync(async (req, res) => {
  const account = settingsService.getAccountInfo(req.user);
  sendSuccess(res, httpStatus.OK, 'Account info fetched successfully', { account });
});

const changePassword = catchAsync(async (req, res) => {
  await settingsService.changePassword(req.user, req.body);
  sendSuccess(res, httpStatus.OK, 'Password changed successfully');
});

const deleteAccount = catchAsync(async (req, res) => {
  await settingsService.deleteAccount(req.params.userId);
  sendSuccess(res, httpStatus.OK, 'Account deleted successfully');
});

const getPrivacySettings = catchAsync(async (req, res) => {
  const privacy = settingsService.getPrivacySettings(req.user);
  sendSuccess(res, httpStatus.OK, 'Privacy settings fetched successfully', { privacy });
});

const updatePrivacySettings = catchAsync(async (req, res) => {
  const privacy = await settingsService.updatePrivacySettings(req.user, req.body);
  sendSuccess(res, httpStatus.OK, 'Privacy settings updated successfully', { privacy });
});

const getBlockedUsers = catchAsync(async (req, res) => {
  const blockedUsers = await settingsService.getBlockedUsers(req.user);
  sendSuccess(res, httpStatus.OK, 'Blocked users fetched successfully', { blockedUsers });
});

const blockUser = catchAsync(async (req, res) => {
  await settingsService.blockUser(req.user, req.params.id);
  sendSuccess(res, httpStatus.OK, 'User blocked successfully');
});

const unblockUser = catchAsync(async (req, res) => {
  await settingsService.unblockUser(req.user, req.params.id);
  sendSuccess(res, httpStatus.OK, 'User unblocked successfully');
});

const getPreferences = catchAsync(async (req, res) => {
  const preferences = settingsService.getPreferences(req.user);
  sendSuccess(res, httpStatus.OK, 'Preferences fetched successfully', { preferences });
});

const updatePreferences = catchAsync(async (req, res) => {
  const preferences = await settingsService.updatePreferences(req.user, req.body);
  sendSuccess(res, httpStatus.OK, 'Preferences updated successfully', { preferences });
});

module.exports = {
  blockUser,
  changePassword,
  deleteAccount,
  getAccountInfo,
  getBlockedUsers,
  getPreferences,
  getPrivacySettings,
  getProfile,
  unblockUser,
  updatePreferences,
  updatePrivacySettings,
  updateProfile,
};
