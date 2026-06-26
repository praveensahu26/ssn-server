const express = require('express');

const { categoryController } = require('../../controllers');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { categoryValidation } = require('../../validations');

const router = express.Router();

router.get('/', categoryController.listCategories);
router.post('/:id/follow', authenticate, validate(categoryValidation.categoryId), categoryController.followCategory);
router.delete('/:id/follow', authenticate, validate(categoryValidation.categoryId), categoryController.unfollowCategory);
router.post('/assign', authenticate, validate(categoryValidation.assignCategories), categoryController.assignCategories);
router.put('/assign', authenticate, validate(categoryValidation.assignCategories), categoryController.assignCategories);

module.exports = router;
