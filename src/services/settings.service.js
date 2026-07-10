const httpStatus = require('http-status');

const { User } = require('../models');
const ApiError = require('../utils/ApiError');

const getProfile = async (user) => User.findById(user.id).populate('followedCategories', 'name description');

const updateProfile = async (user, body) => {
  if (body.mobile && body.mobile !== user.mobile && (await User.isMobileTaken(body.mobile, user.id))) {
    throw new ApiError(httpStatus.CONFLICT, 'Mobile number already in use');
  }

  const allowed = ['name', 'bio', 'gender', 'avatar', 'coverPhoto', 'liveCaption', 'liveUrl', 'location', 'mobile'];
  const updates = allowed.reduce((acc, field) => {
    if (body[field] !== undefined) {
      acc[field] = body[field];
    }
    return acc;
  }, {});

  user.set(updates);
  await user.save();
  return User.findById(user.id).populate('followedCategories', 'name description');
};

const getAccountInfo = (user) => ({
  email: user.email,
  mobile: user.mobile || null,
});

const changePassword = async (user, { currentPassword, newPassword }) => {
  if (user.authProvider !== 'local') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Password change is not available for social login accounts');
  }

  const isMatch = await user.isPasswordMatch(currentPassword);
  if (!isMatch) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Current password is incorrect');
  }

  if (currentPassword === newPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'New password must be different from current password');
  }

  user.set({ password: newPassword });
  await user.save();
};

const deleteAccount = async (user) => {
  if (user.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  user.set({ isDeleted: true, status: 'inactive' });
  await user.save();
};

const getPrivacySettings = (user) => user.privacySettings;

const updatePrivacySettings = async (user, body) => {
  const allowed = ['profileVisibility', 'whoCanComment', 'commentsEnabled', 'whoCanSharePosts'];
  const updates = allowed.reduce((acc, field) => {
    if (body[field] !== undefined) {
      acc[field] = body[field];
    }
    return acc;
  }, {});
  user.set({ privacySettings: { ...user.privacySettings.toObject(), ...updates } });
  await user.save();
  return user.privacySettings;
};

const getBlockedUsers = async (user) => {
  const populated = await User.findById(user.id).populate('blockedUsers', 'name avatar email');
  return populated.blockedUsers;
};

const blockUser = async (user, targetId) => {
  if (user.id === targetId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot block yourself');
  }

  const target = await User.findById(targetId);
  if (!target || target.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const alreadyBlocked = user.blockedUsers.some((id) => id.toString() === targetId);
  if (!alreadyBlocked) {
    user.blockedUsers.push(targetId);
    await user.save();
  }
};

const unblockUser = async (user, targetId) => {
  user.set({ blockedUsers: user.blockedUsers.filter((id) => id.toString() !== targetId) });
  await user.save();
};

const getPreferences = (user) => user.preferences;

const updatePreferences = async (user, body) => {
  if (body.language !== undefined) {
    user.set({ preferences: { ...user.preferences.toObject(), language: body.language } });
  }
  await user.save();
  return user.preferences;
};

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
