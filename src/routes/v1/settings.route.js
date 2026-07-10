const express = require('express');

const { settingsController } = require('../../controllers');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { settingsValidation } = require('../../validations');

const router = express.Router();

router.use(authenticate);

// Edit Profile
router.get('/profile', settingsController.getProfile);
router.put('/profile', validate(settingsValidation.updateProfile), settingsController.updateProfile);

// Account Settings
router.get('/account', settingsController.getAccountInfo);
router.put('/account/change-password', validate(settingsValidation.changePassword), settingsController.changePassword);
router.delete('/account', validate(settingsValidation.deleteAccount), settingsController.deleteAccount);

// Privacy Settings
router.get('/privacy', settingsController.getPrivacySettings);
router.put('/privacy', validate(settingsValidation.updatePrivacy), settingsController.updatePrivacySettings);

// Blocked Profiles
router.get('/blocked', settingsController.getBlockedUsers);
router.post('/blocked/:id', validate(settingsValidation.blockUser), settingsController.blockUser);
router.delete('/blocked/:id', validate(settingsValidation.unblockUser), settingsController.unblockUser);

// Content & Preferences
router.get('/preferences', settingsController.getPreferences);
router.put('/preferences', validate(settingsValidation.updatePreferences), settingsController.updatePreferences);

module.exports = router;
