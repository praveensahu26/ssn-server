const httpStatus = require('http-status');

const { categoryService } = require('../services');
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

const assignCategories = catchAsync(async (req, res) => {
  const user = await categoryService.assignCategoriesToUser(req.user.id, req.body.categoryIds);
  sendSuccess(res, httpStatus.OK, 'Topics assigned successfully', {
    user,
    isProfilePending: !user.mobile || !user.gender,
    isTopicsSelectionPending: user.followedCategories.length === 0,
    isAgencyReporter: user.isAgencyReporter,
  });
});

module.exports = {
  assignCategories,
  followCategory,
  listCategories,
  unfollowCategory,
};
