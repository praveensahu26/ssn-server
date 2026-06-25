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
  sendSuccess(res, httpStatus.OK, 'Campaigns fetched successfully', {
    campaigns: results,
    meta: { page, limit, total, totalPages },
  });
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
  sendSuccess(res, httpStatus.OK, 'Words of support fetched successfully', {
    supporters: results,
    meta: { page, limit, total, totalPages },
  });
});

module.exports = {
  createCampaign,
  donate,
  getCampaign,
  listCampaigns,
  listSupportFeed,
};
