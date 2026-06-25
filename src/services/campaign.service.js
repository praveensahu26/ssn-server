const httpStatus = require('http-status');

const { Campaign, Category } = require('../models');
const ApiError = require('../utils/ApiError');
const paginate = require('../utils/paginate');

const normalizeTags = (tags) => {
  if (!tags) return [];
  const list = Array.isArray(tags) ? tags : tags.split(',');
  return list.map((tag) => tag.trim()).filter(Boolean);
};

const mapAttachments = (files = []) =>
  files.map((file) => ({
    type: file.mimetype.startsWith('video/') ? 'video' : 'image',
    url: file.location,
    key: file.key,
  }));

const getCampaignOr404 = async (id) => {
  const campaign = await Campaign.findById(id);
  if (!campaign) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }
  return campaign;
};

const attachProgress = (campaign) => {
  const json = campaign.toJSON ? campaign.toJSON() : campaign;
  json.progressPercent = json.goalAmount > 0 ? Math.min(100, Math.round((json.raisedAmount / json.goalAmount) * 100)) : 0;
  return json;
};

const createCampaign = async (user, files, body) => {
  const category = await Category.findById(body.category);
  if (!category) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid category');
  }

  return Campaign.create({
    organizer: user.id,
    caption: body.caption,
    description: body.description || null,
    category: body.category,
    tags: normalizeTags(body.tags),
    goalAmount: body.goalAmount,
    endDate: body.endDate,
    location: body.location || null,
    attachments: mapAttachments(files),
    status: 'pending',
  });
};

const buildDiscoverFilter = (query) => {
  const filter = { status: { $in: ['active', 'completed'] } };
  if (query.category) filter.category = query.category;
  return filter;
};

const buildMyCampaignsFilter = (user, query) => {
  const filter = { organizer: user.id };
  if (query.status) filter.status = query.status;
  return filter;
};

const listCampaigns = async (user, query) => {
  const filter = query.scope === 'mine' ? buildMyCampaignsFilter(user, query) : buildDiscoverFilter(query);
  const paginated = await paginate(Campaign, filter, query.page, query.limit, [
    ['organizer', 'name avatar role'],
    ['category', 'name'],
  ]);
  paginated.results = paginated.results.map(attachProgress);
  return paginated;
};

const getCampaignById = async (user, id) => {
  const campaign = await getCampaignOr404(id);
  const isOwner = Boolean(user) && campaign.organizer.toString() === user.id;
  const isOperator = Boolean(user) && user.isOperator();
  if (!isOwner && !isOperator && !['active', 'completed'].includes(campaign.status)) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }

  await Campaign.findByIdAndUpdate(id, { $inc: { viewsCount: 1 } });
  const populated = await Campaign.findById(id).populate('organizer', 'name avatar role').populate('category', 'name');
  return attachProgress(populated);
};

module.exports = {
  createCampaign,
  getCampaignById,
  listCampaigns,
};
