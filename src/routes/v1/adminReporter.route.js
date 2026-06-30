const express = require('express');

const { adminReporterController } = require('../../controllers');
const validate = require('../../middlewares/validate');
const { adminReporterValidation } = require('../../validations');

const router = express.Router();

router.get('/', validate(adminReporterValidation.listReporters), adminReporterController.listReporters);
router.post('/:id/approve', validate(adminReporterValidation.reporterId), adminReporterController.approveReporter);
router.post('/:id/reject', validate(adminReporterValidation.rejectReporter), adminReporterController.rejectReporter);

module.exports = router;
