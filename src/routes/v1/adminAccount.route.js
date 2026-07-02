const express = require('express');

const { adminAccountController } = require('../../controllers');
const { authenticate, requireAdmin } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { adminAccountValidation } = require('../../validations');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/stats', validate(adminAccountValidation.accountStats), adminAccountController.getAccountStats);
router.get('/', validate(adminAccountValidation.listAccounts), adminAccountController.listAccounts);
router.get('/:id/followers', validate(adminAccountValidation.paginatedAccountId), adminAccountController.listFollowers);
router.get('/:id/following', validate(adminAccountValidation.paginatedAccountId), adminAccountController.listFollowing);
router.get('/:id/posts', validate(adminAccountValidation.listPosts), adminAccountController.listPosts);
router.get('/:id/campaigns', validate(adminAccountValidation.listCampaigns), adminAccountController.listCampaigns);
router.get('/:id', validate(adminAccountValidation.accountId), adminAccountController.getAccount);

router.post('/:id/warn', validate(adminAccountValidation.moderationAction), adminAccountController.warnAccount);
router.post('/:id/block', validate(adminAccountValidation.moderationAction), adminAccountController.blockAccount);
router.post('/:id/suspend', validate(adminAccountValidation.moderationAction), adminAccountController.suspendAccount);
router.post('/:id/restore', validate(adminAccountValidation.moderationAction), adminAccountController.restoreAccount);
router.post('/:id/deactivate', validate(adminAccountValidation.moderationAction), adminAccountController.deactivateAccount);
router.delete('/:id', validate(adminAccountValidation.accountId), adminAccountController.deleteAccount);

module.exports = router;
