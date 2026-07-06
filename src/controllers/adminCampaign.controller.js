// "Message Organizer" (shown in the admin mockup's campaign card actions) is intentionally not
// implemented here — this codebase has no messaging/conversation module to hang it off of.

const httpStatus = require('http-status');

const { adminCampaignService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/response');

const listCampaigns = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await adminCampaignService.listCampaigns(req.query);
  sendSuccess(
    res,
    httpStatus.OK,
    'Campaigns fetched successfully',
    { campaigns: results },
    { page, limit, total, totalPages },
  );
});

const getCampaignStats = catchAsync(async (req, res) => {
  const stats = await adminCampaignService.getCampaignStats();
  sendSuccess(res, httpStatus.OK, 'Campaign stats fetched successfully', { stats });
});

const getCampaign = catchAsync(async (req, res) => {
  const campaign = await adminCampaignService.getCampaignById(req.params.id);
  sendSuccess(res, httpStatus.OK, 'Campaign fetched successfully', { campaign });
});

const approveCampaign = catchAsync(async (req, res) => {
  const campaign = await adminCampaignService.approveCampaign(req.params.id);
  sendSuccess(res, httpStatus.OK, 'Campaign approved successfully', { campaign });
});

const rejectCampaign = catchAsync(async (req, res) => {
  const campaign = await adminCampaignService.rejectCampaign(req.params.id, req.body.rejectionReason);
  sendSuccess(res, httpStatus.OK, 'Campaign rejected successfully', { campaign });
});

const suspendCampaign = catchAsync(async (req, res) => {
  const campaign = await adminCampaignService.suspendCampaign(req.params.id, req.body);
  sendSuccess(res, httpStatus.OK, 'Campaign suspended successfully', { campaign });
});

const completeCampaign = catchAsync(async (req, res) => {
  const campaign = await adminCampaignService.completeCampaign(req.params.id);
  sendSuccess(res, httpStatus.OK, 'Campaign marked as completed', { campaign });
});

module.exports = {
  approveCampaign,
  completeCampaign,
  getCampaign,
  getCampaignStats,
  listCampaigns,
  rejectCampaign,
  suspendCampaign,
};
