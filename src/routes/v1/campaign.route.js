const express = require('express');

const { campaignController } = require('../../controllers');
const { authenticate, optionalAuthenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { uploadCampaignAttachments } = require('../../middlewares/upload');
const { campaignValidation } = require('../../validations');

const router = express.Router();

router.post(
  '/',
  authenticate,
  uploadCampaignAttachments,
  validate(campaignValidation.createCampaign),
  campaignController.createCampaign,
);
router.get('/', optionalAuthenticate, validate(campaignValidation.listCampaigns), campaignController.listCampaigns);
router.get('/:id', optionalAuthenticate, validate(campaignValidation.campaignId), campaignController.getCampaign);
router.post('/:id/share', authenticate, validate(campaignValidation.campaignId), campaignController.shareCampaign);
router.patch('/:id', authenticate, validate(campaignValidation.editCampaign), campaignController.editCampaign);
router.delete('/:id', authenticate, validate(campaignValidation.campaignId), campaignController.deleteCampaign);
router.post('/:id/redrive', authenticate, validate(campaignValidation.campaignId), campaignController.redriveCampaign);
router.post('/:id/complete', authenticate, validate(campaignValidation.campaignId), campaignController.completeCampaign);
router.post('/:id/mute', authenticate, validate(campaignValidation.campaignId), campaignController.toggleMute);
router.post(
  '/:id/not-interested',
  authenticate,
  validate(campaignValidation.campaignId),
  campaignController.toggleNotInterested,
);
router.post('/:id/report', authenticate, validate(campaignValidation.reportCampaign), campaignController.reportCampaign);
router.post('/:id/donate', authenticate, validate(campaignValidation.donate), campaignController.donate);
router.get('/:id/support', validate(campaignValidation.listSupportFeed), campaignController.listSupportFeed);

module.exports = router;
