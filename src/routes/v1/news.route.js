const express = require('express');

const { newsController } = require('../../controllers');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { uploadMedia } = require('../../middlewares/upload');
const { newsValidation } = require('../../validations');

const router = express.Router();

router.post('/', authenticate, uploadMedia, validate(newsValidation.createNews), newsController.createNews);
router.get('/', authenticate, validate(newsValidation.listNews), newsController.listNews);
router.get(
  '/categories/:categoryId',
  authenticate,
  validate(newsValidation.listNewsByCategory),
  newsController.listNewsByCategory,
);
router.get('/:id', validate(newsValidation.newsId), newsController.getNews);
router.delete('/:id', authenticate, validate(newsValidation.newsId), newsController.deleteNews);
router.post('/:id/like', authenticate, validate(newsValidation.newsId), newsController.likeNews);
router.post('/:id/dislike', authenticate, validate(newsValidation.newsId), newsController.dislikeNews);
router.delete('/:id/reaction', authenticate, validate(newsValidation.newsId), newsController.removeReaction);
router.get('/:id/comments', authenticate, validate(newsValidation.listComments), newsController.listComments);
router.post('/:id/comments', authenticate, validate(newsValidation.addComment), newsController.addComment);
router.delete('/comments/:commentId', authenticate, validate(newsValidation.commentId), newsController.deleteComment);

module.exports = router;
