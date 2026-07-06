const httpStatus = require('http-status');

const { adminReporterService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/response');

const listReporters = catchAsync(async (req, res) => {
  const { results, page, limit, total, totalPages } = await adminReporterService.listReporters(req.query);
  sendSuccess(
    res,
    httpStatus.OK,
    'Reporters fetched successfully',
    { reporters: results },
    { page, limit, total, totalPages },
  );
});

const approveReporter = catchAsync(async (req, res) => {
  const user = await adminReporterService.approveReporter(req.params.id);
  sendSuccess(res, httpStatus.OK, 'Reporter approved successfully', { user });
});

const rejectReporter = catchAsync(async (req, res) => {
  const user = await adminReporterService.rejectReporter(req.params.id, req.body.reason);
  sendSuccess(res, httpStatus.OK, 'Reporter rejected successfully', { user });
});

module.exports = { approveReporter, listReporters, rejectReporter };
