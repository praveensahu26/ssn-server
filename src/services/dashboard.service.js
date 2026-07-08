const { Campaign, News, User } = require('../models');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const buildCreatedAtFilter = ({ from, to } = {}) => {
  if (!from && !to) return {};

  const createdAt = {};
  if (from) createdAt.$gte = startOfDay(from);
  if (to) createdAt.$lte = endOfDay(to);

  return { createdAt };
};

const combineFilters = (...filters) => Object.assign({}, ...filters);

const countInRange = (Model, filter, from, to) =>
  Model.countDocuments(combineFilters(filter, buildCreatedAtFilter({ from, to })));

const buildStat = async (Model, baseFilter, rangeFilter) => {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * ONE_DAY_MS);
  const monthStart = new Date(now.getTime() - 30 * ONE_DAY_MS);

  const [total, weeklyNew, monthlyNew, previousWeek] = await Promise.all([
    Model.countDocuments(combineFilters(baseFilter, rangeFilter)),
    countInRange(Model, baseFilter, weekStart, now),
    countInRange(Model, baseFilter, monthStart, now),
    countInRange(Model, baseFilter, new Date(weekStart.getTime() - 7 * ONE_DAY_MS), weekStart),
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

const getDashboardStats = async (query) => {
  const rangeFilter = buildCreatedAtFilter(query);
  const userFilter = { role: 'user', isDeleted: false };
  const reporterFilter = { role: 'reporter', 'reporterProfile.approvalStatus': 'approved', isDeleted: false };
  const newsFilter = { status: { $ne: 'deleted' } };
  const campaignFilter = {};

  const [totalUsers, totalVerifiedReporters, totalNewsReported, totalCampaigns] = await Promise.all([
    buildStat(User, userFilter, rangeFilter),
    buildStat(User, reporterFilter, rangeFilter),
    buildStat(News, newsFilter, rangeFilter),
    buildStat(Campaign, campaignFilter, rangeFilter),
  ]);

  return {
    totalUsers,
    totalVerifiedReporters,
    totalWatchHours: {
      total: 0,
      weeklyNew: 0,
      monthlyNew: 0,
      changePercent: 0,
    },
    totalNewsReported,
    totalCampaigns,
  };
};

module.exports = {
  getDashboardStats,
};
