const express = require('express');

const { adminCategoryController } = require('../../controllers');
const { authenticate, requireAdmin } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { categoryValidation } = require('../../validations');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/', adminCategoryController.listCategories);
router.post('/', validate(categoryValidation.createCategory), adminCategoryController.createCategory);
router.get('/:id', validate(categoryValidation.categoryId), adminCategoryController.getCategory);
router.put('/:id', validate(categoryValidation.updateCategory), adminCategoryController.updateCategory);
router.delete('/:id', validate(categoryValidation.categoryId), adminCategoryController.deleteCategory);

module.exports = router;
