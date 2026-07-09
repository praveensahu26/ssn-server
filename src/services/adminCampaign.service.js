const httpStatus = require('http-status');

const { Campaign, Donation } = require('../models');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/paginate');
const notificationService = require('./notification.service');

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
  if (query.categories) filter.categories = { $in: Array.isArray(query.categories) ? query.categories : [query.categories] };
  if (query.organizer) filter.organizer = query.organizer;
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.createdAt.$lte = new Date(query.dateTo);
  }
  return filter;
};

const formatCampaign = (campaign) => ({
  ...campaign.toObject(),
  id: campaign._id,
  mediaUrl: campaign.attachments?.[0]?.url || null,
  mediaType: campaign.attachments?.[0]?.type || null,
});

const listCampaigns = (query) =>
  paginate(Campaign, buildAdminFilter(query), query.page, query.limit, [
    ['organizer', 'name avatar role'],
    ['categories', 'name'],
  ]).then(({ results, page, limit, total, totalPages }) => ({
    results: results.map(formatCampaign),
    page,
    limit,
    total,
    totalPages,
  }));

const getCampaignById = async (id) => {
  const campaign = await Campaign.findById(id)
    .populate('organizer', 'name avatar role')
    .populate('categories', 'name');
  if (!campaign) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }
  const campaignObject = campaign.toObject();
  campaignObject.id = campaign._id;
  campaignObject.attachments = campaign.attachments || [];
  return campaignObject;
};

const sumRaisedAmount = async (filter) => {
  const [result] = await Campaign.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: '$raisedAmount' } } },
  ]);
  return result ? result.total : 0;
};

const getCampaignStats = async () => {
  const now = new Date();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalCampaigns,
    activeCampaigns,
    completedCampaigns,
    totalRaised,
    activeRaised,
    completedRaised,
    fansThisWeek,
    newThisWeek,
    newThisMonth,
    activeNewThisWeek,
    activeNewThisMonth,
    completedNewThisWeek,
    completedNewThisMonth,
  ] = await Promise.all([
    Campaign.countDocuments({}),
    Campaign.countDocuments({ status: 'active' }),
    Campaign.countDocuments({ status: 'completed' }),
    sumRaisedAmount({}),
    sumRaisedAmount({ status: 'active' }),
    sumRaisedAmount({ status: 'completed' }),
    Donation.distinct('donor', { status: 'succeeded', createdAt: { $gte: sevenDaysAgo } }).then((donors) => donors.length),
    Campaign.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    Campaign.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Campaign.countDocuments({ status: 'active', createdAt: { $gte: sevenDaysAgo } }),
    Campaign.countDocuments({ status: 'active', createdAt: { $gte: startOfMonth } }),
    Campaign.countDocuments({ status: 'completed', createdAt: { $gte: sevenDaysAgo } }),
    Campaign.countDocuments({ status: 'completed', createdAt: { $gte: startOfMonth } }),
  ]);

  return {
    totalCampaigns,
    totalRaised,
    activeCampaigns,
    activeRaised,
    completedCampaigns,
    completedRaised,
    fansThisWeek,
    newThisWeek,
    newThisMonth,
    activeNewThisWeek,
    activeNewThisMonth,
    completedNewThisWeek,
    completedNewThisMonth,
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
  notificationService
    .notifyFollowers(campaign.organizer, 'campaign_started', { campaignId: campaign.id })
    .catch(() => {});
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
