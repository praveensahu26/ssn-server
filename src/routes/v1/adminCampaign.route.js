const express = require('express');

const { adminCampaignController } = require('../../controllers');
const { authenticate, requireAdmin } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { adminCampaignValidation } = require('../../validations');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/', validate(adminCampaignValidation.listCampaigns), adminCampaignController.listCampaigns);
// Must be declared before '/:id' or Express would match 'stats' against the :id param route.
router.get('/stats', adminCampaignController.getCampaignStats);
router.get('/:id', validate(adminCampaignValidation.campaignId), adminCampaignController.getCampaign);
router.post('/:id/approve', validate(adminCampaignValidation.campaignId), adminCampaignController.approveCampaign);
router.post('/:id/reject', validate(adminCampaignValidation.rejectCampaign), adminCampaignController.rejectCampaign);
router.post('/:id/suspend', validate(adminCampaignValidation.suspendCampaign), adminCampaignController.suspendCampaign);
router.post('/:id/complete', validate(adminCampaignValidation.campaignId), adminCampaignController.completeCampaign);

module.exports = router;
