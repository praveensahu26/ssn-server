const express = require('express');

const { profileController } = require('../../controllers');
const { authenticate } = require('../../middlewares/auth');
const { uploadAvatar, uploadCoverPhoto } = require('../../middlewares/upload');
const validate = require('../../middlewares/validate');
const { profileValidation } = require('../../validations');

const router = express.Router();

router.use(authenticate);

// Own profile
router.get('/me', profileController.getOwnProfile);
router.put('/me', validate(profileValidation.updateProfile), profileController.updateProfile);

// Profile photos
router.post('/me/avatar', uploadAvatar, profileController.uploadAvatar);
router.delete('/me/avatar', profileController.deleteAvatar);
router.post('/me/cover-photo', uploadCoverPhoto, profileController.uploadCoverPhoto);
router.delete('/me/cover-photo', profileController.deleteCoverPhoto);

// Own posts
router.get('/me/posts', validate(profileValidation.listPosts), profileController.getMyPosts);

// Favourites (saved posts)
router.get('/me/favourites', validate(profileValidation.savedPosts), profileController.getSavedPosts);
router.post('/favourites/:newsId', validate(profileValidation.newsId), profileController.savePost);
router.delete('/favourites/:newsId', validate(profileValidation.newsId), profileController.unsavePost);

// Follow / followers / following
router.get('/me/following', validate(profileValidation.followingList), profileController.getFollowing);
router.get('/me/followers', validate(profileValidation.followersList), profileController.getFollowers);
router.delete('/me/followers/:userId', validate(profileValidation.userIdParam), profileController.removeFollower);

// Other user's profile — must come after /me routes
router.get('/:userId', validate(profileValidation.getUserProfile), profileController.getUserProfile);
router.get('/:userId/posts', validate(profileValidation.userIdPosts), profileController.getUserPosts);
router.post('/:userId/follow', validate(profileValidation.userIdParam), profileController.followUser);
router.delete('/:userId/follow', validate(profileValidation.userIdParam), profileController.unfollowUser);

module.exports = router;
