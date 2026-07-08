const express = require('express');

const { adminNewsController, newsController } = require('../../controllers');
const { authenticate, requireAdmin } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { adminNewsValidation, newsValidation } = require('../../validations');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/', validate(adminNewsValidation.listNews), adminNewsController.listNews);
router.get('/:id', validate(adminNewsValidation.newsId), adminNewsController.getNews);
router.delete('/:id', validate(adminNewsValidation.newsId), adminNewsController.deleteNews);
router.get('/:id/comments', validate(newsValidation.listComments), newsController.listComments);
router.get('/:id/reactions', validate(newsValidation.listReactions), newsController.listReactions);

module.exports = router;
