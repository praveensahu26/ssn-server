const httpStatus = require('http-status');

const { User } = require('../models');
const ApiError = require('../utils/ApiError');

const listReporters = async (query) => {
  const { status = 'pending', page = 1, limit = 20 } = query;
  const filter = { 'reporterProfile.approvalStatus': status };
  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    User.find(filter).sort({ 'reporterProfile.appliedAt': -1 }).skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  return { results, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
};

const approveReporter = async (id) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  if (user.reporterProfile.approvalStatus !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Reporter application is not pending');
  }

  user.set({
    role: 'reporter',
    'reporterProfile.approvalStatus': 'approved',
    'reporterProfile.rejectionReason': null,
  });
  await user.save();
  return user;
};

const rejectReporter = async (id, reason) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  if (user.reporterProfile.approvalStatus !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Reporter application is not pending');
  }

  user.set({
    'reporterProfile.approvalStatus': 'rejected',
    'reporterProfile.rejectionReason': reason,
  });
  await user.save();
  return user;
};

module.exports = { approveReporter, listReporters, rejectReporter };
