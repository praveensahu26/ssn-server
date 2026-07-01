const httpStatus = require('http-status');

const { campaignService, donationService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/response');

const createCampaign = catchAsync(async (req, res) => {
  const campaign = await campaignService.createCampaign(req.user, req.files, req.body);
  sendSuccess(res, httpStatus.CREATED, 'Campaign submitted for verification', { campaign });
});

const listCampaigns = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await campaignService.listCampaigns(req.user, req.query);
  sendSuccess(
    res,
    httpStatus.OK,
    'Campaigns fetched successfully',
    { campaigns: results },
    { page, limit, total, totalPages },
  );
});

const getCampaign = catchAsync(async (req, res) => {
  const campaign = await campaignService.getCampaignById(req.user, req.params.id);
  sendSuccess(res, httpStatus.OK, 'Campaign fetched successfully', { campaign });
});

const donate = catchAsync(async (req, res) => {
  const { donation, clientSecret } = await donationService.createDonationIntent(req.user, req.params.id, req.body);
  sendSuccess(res, httpStatus.CREATED, 'Payment intent created', { donation, clientSecret });
});

const listSupportFeed = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await donationService.listSupportFeed(req.params.id, req.query);
  sendSuccess(
    res,
    httpStatus.OK,
    'Words of support fetched successfully',
    { supporters: results },
    { page, limit, total, totalPages },
  );
});

const editCampaign = catchAsync(async (req, res) => {
  const campaign = await campaignService.editCampaign(req.user, req.params.id, req.body);
  sendSuccess(res, httpStatus.OK, 'Campaign updated successfully', { campaign });
});

const redriveCampaign = catchAsync(async (req, res) => {
  const campaign = await campaignService.redriveCampaign(req.user, req.params.id);
  sendSuccess(res, httpStatus.OK, 'Campaign resubmitted for verification', { campaign });
});

const completeCampaign = catchAsync(async (req, res) => {
  const campaign = await campaignService.completeCampaign(req.user, req.params.id);
  sendSuccess(res, httpStatus.OK, 'Campaign marked as completed', { campaign });
});

const toggleMute = catchAsync(async (req, res) => {
  const result = await campaignService.toggleMute(req.user, req.params.id);
  const message = result.muted ? 'Campaign notifications muted' : 'Campaign notifications unmuted';
  sendSuccess(res, httpStatus.OK, message, result);
});

const deleteCampaign = catchAsync(async (req, res) => {
  await campaignService.deleteCampaign(req.user, req.params.id);
  sendSuccess(res, httpStatus.OK, 'Campaign deleted successfully');
});

const reportCampaign = catchAsync(async (req, res) => {
  await campaignService.reportCampaign(req.user, req.params.id, req.body);
  sendSuccess(res, httpStatus.CREATED, 'Campaign reported successfully');
});

module.exports = {
  completeCampaign,
  createCampaign,
  deleteCampaign,
  donate,
  editCampaign,
  getCampaign,
  listCampaigns,
  listSupportFeed,
  redriveCampaign,
  reportCampaign,
  toggleMute,
};
