const httpStatus = require('http-status');

const { adminAccountService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/response');

const listAccounts = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await adminAccountService.listAccounts(req.query);
  sendSuccess(res, httpStatus.OK, 'Accounts fetched successfully', {
    accounts: results,
    meta: { page, limit, total, totalPages },
  });
});

const getAccountStats = catchAsync(async (req, res) => {
  const stats = await adminAccountService.getAccountStats(req.query);
  sendSuccess(res, httpStatus.OK, 'Account stats fetched successfully', { stats });
});

const getAccount = catchAsync(async (req, res) => {
  const account = await adminAccountService.getAccount(req.params.id);
  sendSuccess(res, httpStatus.OK, 'Account fetched successfully', { account });
});

const listFollowers = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await adminAccountService.listFollowers(req.params.id, req.query);
  sendSuccess(res, httpStatus.OK, 'Followers fetched successfully', {
    users: results,
    meta: { page, limit, total, totalPages },
  });
});

const listFollowing = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await adminAccountService.listFollowing(req.params.id, req.query);
  sendSuccess(res, httpStatus.OK, 'Following fetched successfully', {
    users: results,
    meta: { page, limit, total, totalPages },
  });
});

const listPosts = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await adminAccountService.listPosts(req.params.id, req.query);
  sendSuccess(res, httpStatus.OK, 'Account posts fetched successfully', {
    posts: results,
    meta: { page, limit, total, totalPages },
  });
});

const listCampaigns = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await adminAccountService.listCampaigns(req.params.id, req.query);
  sendSuccess(res, httpStatus.OK, 'Account campaigns fetched successfully', {
    campaigns: results,
    meta: { page, limit, total, totalPages },
  });
});

const warnAccount = catchAsync(async (req, res) => {
  const account = await adminAccountService.updateStatus(req.params.id, 'active', req.body);
  sendSuccess(res, httpStatus.OK, 'Account warned successfully', { account });
});

const blockAccount = catchAsync(async (req, res) => {
  const account = await adminAccountService.updateStatus(req.params.id, 'blocked', req.body);
  sendSuccess(res, httpStatus.OK, 'Account blocked successfully', { account });
});

const suspendAccount = catchAsync(async (req, res) => {
  const account = await adminAccountService.updateStatus(req.params.id, 'suspended', req.body);
  sendSuccess(res, httpStatus.OK, 'Account suspended successfully', { account });
});

const restoreAccount = catchAsync(async (req, res) => {
  const account = await adminAccountService.updateStatus(req.params.id, 'active', req.body);
  sendSuccess(res, httpStatus.OK, 'Account restored successfully', { account });
});

const deactivateAccount = catchAsync(async (req, res) => {
  const account = await adminAccountService.updateStatus(req.params.id, 'inactive', req.body);
  sendSuccess(res, httpStatus.OK, 'Account deactivated successfully', { account });
});

const deleteAccount = catchAsync(async (req, res) => {
  await adminAccountService.softDeleteAccount(req.params.id);
  sendSuccess(res, httpStatus.OK, 'Account deleted successfully');
});

const bulkUpdateStatus = catchAsync(async (req, res) => {
  const { ids, status } = req.body;
  await adminAccountService.bulkUpdateStatus(ids, status);
  sendSuccess(res, httpStatus.OK, 'Accounts status updated successfully');
});

module.exports = {
  blockAccount,
  bulkUpdateStatus,
  deactivateAccount,
  deleteAccount,
  getAccount,
  getAccountStats,
  listAccounts,
  listCampaigns,
  listFollowers,
  listFollowing,
  listPosts,
  restoreAccount,
  suspendAccount,
  warnAccount,
};
