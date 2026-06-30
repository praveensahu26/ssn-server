const httpStatus = require('http-status');

const { Campaign, Donation } = require('../models');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/paginate');

const STATUS_BY_TAB = {
  active: 'active',
  completed: 'completed',
  requests: 'pending',
  suspended: 'suspended',
};

const getCampaignOr404 = async (id) => {
  const campaign = await Campaign.findById(id);
  if (!campaign) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }
  return campaign;
};

const buildAdminFilter = (query) => {
  const filter = {};
  if (query.tab && query.tab !== 'overview') {
    filter.status = STATUS_BY_TAB[query.tab];
  }
  if (query.category) filter.category = query.category;
  if (query.organizer) filter.organizer = query.organizer;
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.createdAt.$lte = new Date(query.dateTo);
  }
  return filter;
};

const listCampaigns = (query) =>
  paginate(Campaign, buildAdminFilter(query), query.page, query.limit, [
    ['organizer', 'name avatar role'],
    ['category', 'name'],
  ]);

const getCampaignById = async (id) => {
  const campaign = await getCampaignOr404(id);
  return campaign.populate('organizer', 'name avatar role').populate('category', 'name');
};

const sumRaisedAmount = async (filter) => {
  const [result] = await Campaign.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: '$raisedAmount' } } },
  ]);
  return result ? result.total : 0;
};

const getCampaignStats = async () => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalCampaigns, activeCampaigns, completedCampaigns, totalRaised, activeRaised, completedRaised, fansThisWeek] =
    await Promise.all([
      Campaign.countDocuments({}),
      Campaign.countDocuments({ status: 'active' }),
      Campaign.countDocuments({ status: 'completed' }),
      sumRaisedAmount({}),
      sumRaisedAmount({ status: 'active' }),
      sumRaisedAmount({ status: 'completed' }),
      Donation.distinct('donor', { status: 'succeeded', createdAt: { $gte: sevenDaysAgo } }).then((donors) => donors.length),
    ]);

  return {
    totalCampaigns,
    totalRaised,
    activeCampaigns,
    activeRaised,
    completedCampaigns,
    completedRaised,
    fansThisWeek,
  };
};

const approveCampaign = async (id) => {
  const campaign = await getCampaignOr404(id);
  if (campaign.status !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Only pending campaigns can be approved');
  }
  campaign.status = 'active';
  campaign.approvedAt = new Date();
  await campaign.save();
  return campaign;
};

const rejectCampaign = async (id, rejectionReason) => {
  const campaign = await getCampaignOr404(id);
  if (campaign.status !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Only pending campaigns can be rejected');
  }
  campaign.status = 'rejected';
  campaign.rejectionReason = rejectionReason;
  await campaign.save();
  return campaign;
};

const suspendCampaign = async (id, { suspensionReasons, suspensionNote }) => {
  const campaign = await getCampaignOr404(id);
  if (campaign.status !== 'active') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Only active campaigns can be suspended');
  }
  campaign.status = 'suspended';
  campaign.suspensionReasons = suspensionReasons;
  campaign.suspensionNote = suspensionReasons.includes('Other') ? suspensionNote : null;
  await campaign.save();
  return campaign;
};

const completeCampaign = async (id) => {
  const campaign = await getCampaignOr404(id);
  if (campaign.status !== 'active') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Only active campaigns can be marked as completed');
  }
  campaign.status = 'completed';
  campaign.completedAt = new Date();
  await campaign.save();
  return campaign;
};

module.exports = {
  approveCampaign,
  completeCampaign,
  getCampaignById,
  getCampaignStats,
  listCampaigns,
  rejectCampaign,
  suspendCampaign,
};
