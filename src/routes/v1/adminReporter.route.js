const express = require('express');

const { adminReporterController } = require('../../controllers');
const { authenticate, requireAdmin } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { adminReporterValidation } = require('../../validations');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/', validate(adminReporterValidation.listReporters), adminReporterController.listReporters);
router.post('/:id/approve', validate(adminReporterValidation.reporterId), adminReporterController.approveReporter);
router.post('/:id/reject', validate(adminReporterValidation.rejectReporter), adminReporterController.rejectReporter);

module.exports = router;
