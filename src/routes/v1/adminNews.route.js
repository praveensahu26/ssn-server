const express = require('express');

const { adminNewsController } = require('../../controllers');
const { authenticate, requireAdmin } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { adminNewsValidation } = require('../../validations');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/', validate(adminNewsValidation.listNews), adminNewsController.listNews);
router.get('/:id', validate(adminNewsValidation.newsId), adminNewsController.getNews);
router.delete('/:id', validate(adminNewsValidation.newsId), adminNewsController.deleteNews);

module.exports = router;
