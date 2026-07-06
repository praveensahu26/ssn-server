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
router.get('/', authenticate, validate(campaignValidation.listCampaigns), campaignController.listCampaigns);
router.get('/:id', optionalAuthenticate, validate(campaignValidation.campaignId), campaignController.getCampaign);
router.post('/:id/share', authenticate, validate(campaignValidation.campaignId), campaignController.shareCampaign);
router.post('/:id/donate', authenticate, validate(campaignValidation.donate), campaignController.donate);
router.get('/:id/support', validate(campaignValidation.listSupportFeed), campaignController.listSupportFeed);

module.exports = router;
