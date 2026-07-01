const httpStatus = require('http-status');

const { dashboardService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/response');

const getStats = catchAsync(async (req, res) => {
  const stats = await dashboardService.getDashboardStats(req.query);
  sendSuccess(res, httpStatus.OK, 'Dashboard stats fetched successfully', { stats });
});

module.exports = {
  getStats,
};
