const httpStatus = require('http-status');

const { Campaign, News, User } = require('../models');
const ApiError = require('../utils/ApiError');

const DEFAULT_COUNTRY = 'USA';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const PROFILE_SELECT =
  'name email mobile avatar coverPhoto bio liveUrl location role status statusReasonTitle statusReasonDescription reporterProfile followers following createdAt updatedAt isDeleted gender';
const CONNECTION_SELECT = 'name email avatar role';

const slugify = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toUsername = (user) => slugify(user.name || user.email?.split('@')[0] || user.id);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatLocationObject = (location) => {
  if (!location) {
    return { city: null, state: null, country: DEFAULT_COUNTRY };
  }

  const parts = String(location)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    city: parts[0] || null,
    state: parts[1] || null,
    country: parts[2] || DEFAULT_COUNTRY,
  };
};

const formatLocationString = (location) => {
  const formatted = formatLocationObject(location);
  return [formatted.city, formatted.state, formatted.country].filter(Boolean).join(', ');
};

const formatConnection = (user) => ({
  id: user.id,
  name: user.name,
  username: toUsername(user),
  profileImage: user.avatar || null,
  profilePicture: user.avatar || null,
});

const formatAccountBase = (user, extras = {}) => ({
  id: user.id,
  name: user.name,
  username: toUsername(user),
  email: user.email,
  phoneNumber: user.mobile || null,
  profileImage: user.avatar || null,
  profilePicture: user.avatar || null,
  coverImage: user.coverPhoto || null,
  bio: user.bio || null,
  socialLink: user.liveUrl || null,
  link: user.liveUrl || null,
  location: formatLocationString(user.location),
  locationDetails: formatLocationObject(user.location),
  role: user.role,
  status: {
    value: user.status || 'active',
    reasonTitle: user.statusReasonTitle || null,
    reasonDescription: user.statusReasonDescription || null,
  },
  reporterProfile: user.reporterProfile || undefined,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  ...extras,
});

const getRoleFilter = (role, tab) => {
  if (role === 'user') return { role: 'user' };

  if (tab === 'verification') {
    return {
      $or: [{ role: 'reporter_pending' }, { 'reporterProfile.approvalStatus': 'pending' }],
    };
  }

  return { role: 'reporter', 'reporterProfile.approvalStatus': 'approved' };
};

const getTabFilter = (tab) => {
  switch (tab) {
    case 'active':
      return { status: 'active' };
    case 'inactive':
      return { status: 'inactive' };
    case 'blocked':
      return { status: 'blocked' };
    case 'suspended':
      return { status: 'suspended' };
    case 'reported':
      return { _id: { $exists: false } };
    case 'all':
      return { status: { $ne: 'suspended' } };
    case 'verification':
    case 'overview':
    default:
      return {};
  }
};

const buildAccountFilter = ({ role = 'user', tab = 'all', search } = {}) => {
  const filter = {
    isDeleted: false,
    ...getRoleFilter(role, tab),
    ...getTabFilter(tab),
  };

  if (search) {
    // Escaped user input is used intentionally for a case-insensitive contains search.
    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(escapeRegExp(search.trim()), 'i');
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [{ name: regex }, { email: regex }, { mobile: regex }, { 'reporterProfile.journalistId': regex }],
      },
    ];
  }

  return filter;
};

const countByAuthor = async (Model, field, ids, extraFilter = {}) => {
  const rows = await Model.aggregate([
    { $match: { [field]: { $in: ids }, ...extraFilter } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);

  return rows.reduce((acc, row) => {
    acc[row._id.toString()] = row.count;
    return acc;
  }, {});
};

const formatListAccount = (user, counts) => {
  const userId = user._id.toString();

  return formatAccountBase(user, {
    newsReportCount: counts.news[userId] || 0,
    activeCampaignCount: counts.campaigns[userId] || 0,
    isReported: false,
    reportCount: 0,
    gender: user.gender || null,
    journalistId: user.reporterProfile?.journalistId || null,
    verificationRequest: user.reporterProfile?.approvalStatus || null,
  });
};

const getAccountOr404 = async (id) => {
  const user = await User.findById(id).select(PROFILE_SELECT);
  if (!user || user.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Account not found');
  }
  return user;
};

const listAccounts = async (query) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const filter = buildAccountFilter(query);

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(PROFILE_SELECT)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  const ids = users.map((user) => user._id);
  const [newsCounts, campaignCounts] = await Promise.all([
    countByAuthor(News, 'author', ids, { status: { $ne: 'deleted' } }),
    countByAuthor(Campaign, 'organizer', ids, { status: 'active' }),
  ]);

  return {
    results: users.map((user) => formatListAccount(user, { news: newsCounts, campaigns: campaignCounts })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

const countWithCreatedAtRange = (filter, from, to) =>
  User.countDocuments({
    ...filter,
    createdAt: {
      $gte: from,
      $lte: to,
    },
  });

const buildAccountStat = async (filter) => {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * ONE_DAY_MS);
  const previousWeekStart = new Date(weekStart.getTime() - 7 * ONE_DAY_MS);
  const monthStart = new Date(now.getTime() - 30 * ONE_DAY_MS);

  const [total, weeklyNew, monthlyNew, previousWeek] = await Promise.all([
    User.countDocuments(filter),
    countWithCreatedAtRange(filter, weekStart, now),
    countWithCreatedAtRange(filter, monthStart, now),
    countWithCreatedAtRange(filter, previousWeekStart, weekStart),
  ]);

  let changePercent = 0;
  if (previousWeek > 0) {
    changePercent = Math.round(((weeklyNew - previousWeek) / previousWeek) * 100);
  } else if (weeklyNew > 0) {
    changePercent = 100;
  }

  return {
    total,
    weeklyNew,
    monthlyNew,
    changePercent,
  };
};

const getAccountStats = async ({ role = 'user' }) => {
  const baseFilter = { isDeleted: false, ...getRoleFilter(role, 'all') };

  const [total, active, blocked] = await Promise.all([
    buildAccountStat(baseFilter),
    buildAccountStat({ ...baseFilter, status: 'active' }),
    buildAccountStat({ ...baseFilter, status: 'blocked' }),
  ]);

  return { total, active, blocked };
};

const getConnections = async (user, key, query) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const ids = [...(user[key] || [])].reverse();
  const total = ids.length;
  const pageIds = ids.slice((page - 1) * limit, page * limit);

  const users = await User.find({ _id: { $in: pageIds }, isDeleted: false }).select(CONNECTION_SELECT);
  const byId = new Map(users.map((item) => [item._id.toString(), item]));
  const results = pageIds
    .map((id) => byId.get(id.toString()))
    .filter(Boolean)
    .map(formatConnection);

  return { results, page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
};

const getAccount = async (id) => {
  const user = await getAccountOr404(id);
  const [postsCount, campaignsCount, followers, following] = await Promise.all([
    News.countDocuments({ author: user._id, status: { $ne: 'deleted' } }),
    Campaign.countDocuments({ organizer: user._id }),
    getConnections(user, 'followers', { page: 1, limit: 20 }),
    getConnections(user, 'following', { page: 1, limit: 20 }),
  ]);

  return formatAccountBase(user, {
    followersCount: user.followers?.length || 0,
    followers: followers.results,
    followingCount: user.following?.length || 0,
    following: following.results,
    postsCount,
    campaignsCount,
    posts: [],
    campaigns: [],
    isReported: false,
    reportCount: 0,
  });
};

const listFollowers = async (id, query) => getConnections(await getAccountOr404(id), 'followers', query);

const listFollowing = async (id, query) => getConnections(await getAccountOr404(id), 'following', query);

const formatPost = (post) => ({
  id: post.id,
  mediaUrl: post.media?.[0]?.url || null,
  viewCount: String(post.viewsCount || 0),
  categories: (post.categories || []).map((category) => category.name).filter(Boolean),
});

const listPosts = async (id, query) => {
  await getAccountOr404(id);
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const filter = { author: id, status: query.status || { $ne: 'deleted' } };

  const [posts, total] = await Promise.all([
    News.find(filter)
      .populate('categories', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    News.countDocuments(filter),
  ]);

  return { results: posts.map(formatPost), page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
};

const formatCampaign = (campaign) => ({
  id: campaign.id,
  mediaUrl: campaign.attachments?.[0]?.url || null,
  viewCount: String(campaign.viewsCount || 0),
  categories: campaign.categories?.map((c) => c.name).filter(Boolean) || [],
  status: campaign.status,
});

const listCampaigns = async (id, query) => {
  await getAccountOr404(id);
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const filter = { organizer: id };
  if (query.status) filter.status = query.status;

  const [campaigns, total] = await Promise.all([
    Campaign.find(filter)
      .populate('categories', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Campaign.countDocuments(filter),
  ]);

  return { results: campaigns.map(formatCampaign), page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
};

const updateStatus = async (id, status, payload = {}) => {
  const user = await getAccountOr404(id);
  user.status = status;
  user.statusReasonTitle = payload.reasons?.[0] || null;
  user.statusReasonDescription = payload.description || null;
  await user.save();

  // Fetch the user again to ensure we get the updated fields
  const updatedUser = await getAccountOr404(id);

  return formatAccountBase(updatedUser, {
    status: {
      value: updatedUser.status,
      reasonTitle: updatedUser.statusReasonTitle,
      reasonDescription: updatedUser.statusReasonDescription,
    },
  });
};

const softDeleteAccount = async (id) => {
  const user = await getAccountOr404(id);
  user.set({ isDeleted: true, status: 'inactive' });
  await user.save();
};

const bulkUpdateStatus = async (ids, status) => {
  await User.updateMany(
    { _id: { $in: ids }, isDeleted: false },
    { status }
  );
};

module.exports = {
  bulkUpdateStatus,
  getAccount,
  getAccountStats,
  listAccounts,
  listCampaigns,
  listFollowers,
  listFollowing,
  listPosts,
  softDeleteAccount,
  updateStatus,
};
