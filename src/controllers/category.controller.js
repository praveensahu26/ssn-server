const httpStatus = require('http-status');

const { categoryService, tokenService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/response');

const listCategories = catchAsync(async (req, res) => {
  const categories = await categoryService.listCategories();
  sendSuccess(res, httpStatus.OK, 'Categories fetched successfully', { categories });
});

const followCategory = catchAsync(async (req, res) => {
  const user = await categoryService.followCategory(req.user, req.params.id);
  sendSuccess(res, httpStatus.OK, 'Category followed successfully', { user });
});

const unfollowCategory = catchAsync(async (req, res) => {
  const user = await categoryService.unfollowCategory(req.user, req.params.id);
  sendSuccess(res, httpStatus.OK, 'Category unfollowed successfully', { user });
});

const getAssignedCategories = catchAsync(async (req, res) => {
  const categories = await categoryService.getAssignedCategories(req.user.id);
  sendSuccess(res, httpStatus.OK, 'Assigned categories fetched successfully', { categories });
});

const assignCategories = catchAsync(async (req, res) => {
  const user = await categoryService.assignCategoriesToUser(req.user.id, req.body.categoryIds);
  const tokens = await tokenService.generateAuthTokens(user);

  const responseData = {
    tokens,
    isProfilePending: !user.mobile || !user.gender,
    isTopicsSelectionPending: user.followedCategories.length === 0,
    isAgencyReporter: user.isAgencyReporter,
  };

  // Include verification object for agency reporters
  if (user.isAgencyReporter) {
    const statusMap = {
      pending: 'PENDING',
      approved: 'VERIFIED',
      rejected: 'REJECTED',
    };
    const verificationStatus = user.reporterProfile?.approvalStatus
      ? statusMap[user.reporterProfile.approvalStatus] || 'PENDING'
      : 'PENDING';
    responseData.verification = { status: verificationStatus };
  }

  sendSuccess(res, httpStatus.OK, 'Topics assigned successfully', responseData);
});

module.exports = {
  assignCategories,
  followCategory,
  getAssignedCategories,
  listCategories,
  unfollowCategory,
};
