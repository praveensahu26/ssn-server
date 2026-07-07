const express = require('express');

const { newsController } = require('../../controllers');
const { authenticate, optionalAuthenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { uploadMedia } = require('../../middlewares/upload');
const { newsValidation } = require('../../validations');

const router = express.Router();

const parseJsonCategories = (req, res, next) => {
  if (req.body.categories && typeof req.body.categories === 'string' && req.body.categories.trim().startsWith('[')) {
    try {
      req.body.categories = JSON.parse(req.body.categories);
    } catch (_) {
      // Validation will report invalid category input later in the request pipeline.
    }
  }
  next();
};

router.post(
  '/',
  authenticate,
  uploadMedia,
  parseJsonCategories,
  validate(newsValidation.createNews),
  newsController.createNews,
);
router.get('/', authenticate, validate(newsValidation.listNews), newsController.listNews);
router.get(
  '/categories/:categoryId',
  authenticate,
  validate(newsValidation.listNewsByCategory),
  newsController.listNewsByCategory,
);
router.get('/:id', optionalAuthenticate, validate(newsValidation.newsId), newsController.getNews);
router.patch('/:id', authenticate, validate(newsValidation.updateNews), newsController.updateNews);
router.delete('/:id', authenticate, validate(newsValidation.newsId), newsController.deleteNews);
router.post('/:id/report', authenticate, validate(newsValidation.reportNews), newsController.reportNews);
router.post('/:id/like', authenticate, validate(newsValidation.newsId), newsController.likeNews);
router.post('/:id/dislike', authenticate, validate(newsValidation.newsId), newsController.dislikeNews);
router.delete('/:id/reaction', authenticate, validate(newsValidation.newsId), newsController.removeReaction);
router.post('/:id/share', authenticate, validate(newsValidation.newsId), newsController.shareNews);
router.get('/:id/reactions', authenticate, validate(newsValidation.listReactions), newsController.listReactions);
router.get('/:id/comments', authenticate, validate(newsValidation.listComments), newsController.listComments);
router.post('/:id/comments', authenticate, validate(newsValidation.addComment), newsController.addComment);
router.post('/:id/comments/:commentId/like', authenticate, validate(newsValidation.commentReaction), newsController.likeComment);
router.post('/:id/comments/:commentId/dislike', authenticate, validate(newsValidation.commentReaction), newsController.dislikeComment);
router.delete('/:id/comments/:commentId', authenticate, validate(newsValidation.commentReaction), newsController.deleteComment);
router.post('/:id/comments/:commentId/replies', authenticate, validate(newsValidation.addReply), newsController.addReply);
router.post(
  '/:id/comments/:commentId/replies/:replyId/like',
  authenticate,
  validate(newsValidation.replyReaction),
  newsController.likeReply,
);
router.post(
  '/:id/comments/:commentId/replies/:replyId/dislike',
  authenticate,
  validate(newsValidation.replyReaction),
  newsController.dislikeReply,
);
router.get(
  '/:id/comments/:commentId/replies',
  authenticate,
  validate(newsValidation.listReplies),
  newsController.listReplies,
);

module.exports = router;
