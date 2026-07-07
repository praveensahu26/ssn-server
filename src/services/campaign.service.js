const httpStatus = require('http-status');

const { Campaign, Category, CampaignReport } = require('../models');
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
  const categoryIds = Array.isArray(body.categories) ? body.categories : [body.categories];
  const categoryDocs = await Category.find({ _id: { $in: categoryIds } });
  if (categoryDocs.length !== categoryIds.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'One or more invalid categories');
  }

  return Campaign.create({
    organizer: user.id,
    caption: body.caption,
    description: body.description || null,
    categories: categoryIds,
    tags: normalizeTags(body.tags),
    goalAmount: body.goalAmount,
    endDate: body.endDate,
    location: body.location || null,
    attachments: mapAttachments(files),
    status: 'pending',
  });
};

const buildCategoriesFilter = (query) => {
  const categories = query.categories || query.category;
  if (!categories) return undefined;
  return { $in: Array.isArray(categories) ? categories : [categories] };
};

const buildDiscoverFilter = (user, query) => {
  const filter = { status: { $in: ['active', 'completed'] } };
  const categoriesFilter = buildCategoriesFilter(query);
  if (categoriesFilter) filter.categories = categoriesFilter;
  if (user) filter.notInterestedBy = { $ne: user.id };
  return filter;
};

const buildMyCampaignsFilter = (user, query) => {
  const filter = { organizer: user.id };
  if (query.status) filter.status = query.status;
  const categoriesFilter = buildCategoriesFilter(query);
  if (categoriesFilter) filter.categories = categoriesFilter;
  return filter;
};

const listCampaigns = async (user, query) => {
  const filter = query.scope === 'mine' ? buildMyCampaignsFilter(user, query) : buildDiscoverFilter(user, query);
  const paginated = await paginate(Campaign, filter, query.page, query.limit, [
    ['organizer', 'name avatar role'],
    ['categories', 'name'],
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
  const populated = await Campaign.findById(id).populate('organizer', 'name avatar role').populate('categories', 'name');
  return attachProgress(populated);
};

const requireOwner = (campaign, user) => {
  if (campaign.organizer.toString() !== user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only manage your own campaigns');
  }
};

const editCampaign = async (user, id, body) => {
  const campaign = await getCampaignOr404(id);
  requireOwner(campaign, user);
  if (campaign.status !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Only pending campaigns can be edited');
  }

  if (body.categories !== undefined) {
    const categoryIds = Array.isArray(body.categories) ? body.categories : [body.categories];
    const categoryDocs = await Category.find({ _id: { $in: categoryIds } });
    if (categoryDocs.length !== categoryIds.length) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'One or more invalid categories');
    }
    campaign.categories = categoryIds;
  }
  if (body.caption !== undefined) campaign.caption = body.caption;
  if (body.description !== undefined) campaign.description = body.description || null;
  if (body.tags !== undefined) campaign.tags = normalizeTags(body.tags);
  if (body.goalAmount !== undefined) campaign.goalAmount = body.goalAmount;
  if (body.endDate !== undefined) campaign.endDate = body.endDate;
  if (body.location !== undefined) campaign.location = body.location || null;

  await campaign.save();
  return Campaign.findById(id).populate('organizer', 'name avatar role').populate('categories', 'name');
};

const redriveCampaign = async (user, id) => {
  const campaign = await getCampaignOr404(id);
  requireOwner(campaign, user);
  if (!['rejected', 'suspended'].includes(campaign.status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Only rejected or suspended campaigns can be redriven');
  }
  campaign.status = 'pending';
  campaign.rejectionReason = null;
  campaign.suspensionReasons = [];
  campaign.suspensionNote = null;
  await campaign.save();
  return campaign;
};

const completeCampaign = async (user, id) => {
  const campaign = await getCampaignOr404(id);
  requireOwner(campaign, user);
  if (campaign.status !== 'active') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Only active campaigns can be marked as completed');
  }
  campaign.status = 'completed';
  campaign.completedAt = new Date();
  await campaign.save();
  return campaign;
};

const toggleMute = async (user, id) => {
  const campaign = await getCampaignOr404(id);
  const userId = user.id;
  const isMuted = campaign.mutedBy.some((uid) => uid.toString() === userId);
  if (isMuted) {
    campaign.mutedBy = campaign.mutedBy.filter((uid) => uid.toString() !== userId);
  } else {
    campaign.mutedBy.push(userId);
  }
  await campaign.save();
  return { muted: !isMuted };
};

const toggleNotInterested = async (user, id) => {
  const campaign = await getCampaignOr404(id);
  const userId = user.id;
  const isNotInterested = campaign.notInterestedBy.some((uid) => uid.toString() === userId);
  if (isNotInterested) {
    campaign.notInterestedBy = campaign.notInterestedBy.filter((uid) => uid.toString() !== userId);
  } else {
    campaign.notInterestedBy.push(userId);
  }
  await campaign.save();
  return { notInterested: !isNotInterested };
};

const deleteCampaign = async (user, id) => {
  const campaign = await getCampaignOr404(id);
  requireOwner(campaign, user);
  if (!['pending', 'rejected'].includes(campaign.status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Only pending or rejected campaigns can be deleted');
  }
  await campaign.deleteOne();
};

const reportCampaign = async (user, id, { reason, description }) => {
  const campaign = await getCampaignOr404(id);
  if (!['active', 'pending'].includes(campaign.status)) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }
  if (campaign.organizer.toString() === user.id) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot report your own campaign');
  }
  try {
    await CampaignReport.create({ reporter: user.id, campaign: id, reason, description: description || null });
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(httpStatus.CONFLICT, 'You have already reported this campaign');
    }
    throw err;
  }
};

module.exports = {
  completeCampaign,
  createCampaign,
  deleteCampaign,
  editCampaign,
  getCampaignById,
  listCampaigns,
  redriveCampaign,
  reportCampaign,
  toggleMute,
  toggleNotInterested,
};
