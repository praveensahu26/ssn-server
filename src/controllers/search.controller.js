const httpStatus = require('http-status');

const User = require('../models/user.model');
const News = require('../models/news.model');
const Campaign = require('../models/campaign.model');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/response');

const globalSearch = catchAsync(async (req, res) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return sendSuccess(res, httpStatus.OK, 'Search results', { users: [], news: [], campaigns: [] });
  }

  const searchTerm = q.trim();

  if (!searchTerm) {
    return sendSuccess(res, httpStatus.OK, 'Search results', { users: [], news: [], campaigns: [] });
  }

  // Add 300ms delay before search
  await new Promise((resolve) => setTimeout(resolve, 300));

  const regex = new RegExp(searchTerm, 'i');

  // Search users by name only
  const users = await User.find({
    name: regex,
    isDeleted: false,
    status: 'active',
  })
    .select('_id name avatar role')
    .limit(20)
    .lean();

  // Search news by caption
  const news = await News.find({
    caption: regex,
    status: 'public',
  })
    .select('_id caption media categories createdAt')
    .populate('categories', '_id name')
    .limit(20)
    .lean();

  // Search campaigns by caption
  const campaigns = await Campaign.find({
    caption: regex,
    status: { $in: ['active', 'completed'] },
  })
    .select('_id caption attachments status createdAt')
    .limit(20)
    .lean();

  // Format news results
  const formattedNews = news.map((item) => ({
    id: item._id,
    caption: item.caption,
    media: item.media?.[0]?.url || null,
    thumbnail: item.media?.[0]?.url || null,
    category: item.categories?.[0] || null,
    createdAt: item.createdAt,
  }));

  // Format campaign results
  const formattedCampaigns = campaigns.map((item) => ({
    id: item._id,
    caption: item.caption,
    media: item.attachments?.[0]?.url || null,
    thumbnail: item.attachments?.[0]?.url || null,
    status: item.status,
    createdAt: item.createdAt,
  }));

  // Format user results
  const formattedUsers = users.map((item) => ({
    id: item._id,
    name: item.name,
    avatar: item.avatar,
    role: item.role,
  }));

  sendSuccess(res, httpStatus.OK, 'Search results', {
    users: formattedUsers,
    news: formattedNews,
    campaigns: formattedCampaigns,
  });
});

module.exports = {
  globalSearch,
};
