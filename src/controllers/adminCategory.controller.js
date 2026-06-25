const httpStatus = require('http-status');

const { categoryService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/response');

const listCategories = catchAsync(async (req, res) => {
  const categories = await categoryService.listCategories();
  sendSuccess(res, httpStatus.OK, 'Categories fetched successfully', { categories });
});

const getCategory = catchAsync(async (req, res) => {
  const category = await categoryService.getCategoryById(req.params.id);
  sendSuccess(res, httpStatus.OK, 'Category fetched successfully', { category });
});

const createCategory = catchAsync(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  sendSuccess(res, httpStatus.CREATED, 'Category created successfully', { category });
});

const updateCategory = catchAsync(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  sendSuccess(res, httpStatus.OK, 'Category updated successfully', { category });
});

const deleteCategory = catchAsync(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  sendSuccess(res, httpStatus.OK, 'Category deleted successfully');
});

module.exports = {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
};
