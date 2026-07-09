const httpStatus = require('http-status');

const { Category, User } = require('../models');
const ApiError = require('../utils/ApiError');

const listCategories = () => Category.find().sort({ name: 1 });

const getCategoryById = async (id) => {
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }
  return category;
};

const createCategory = async ({ name, description }) => {
  const exists = await Category.findOne({ name: name.trim() });
  if (exists) {
    throw new ApiError(httpStatus.CONFLICT, 'Category name already exists');
  }
  return Category.create({ name: name.trim(), description: description || null });
};

const updateCategory = async (id, updates) => {
  const category = await getCategoryById(id);
  const payload = { ...updates };
  if (payload.name) {
    payload.name = payload.name.trim();
    const conflict = await Category.findOne({ name: payload.name, _id: { $ne: id } });
    if (conflict) {
      throw new ApiError(httpStatus.CONFLICT, 'Category name already exists');
    }
  }
  category.set(payload);
  await category.save();
  return category;
};

const deleteCategory = async (id) => {
  const category = await getCategoryById(id);
  await category.deleteOne();
};

const followCategory = async (user, categoryId) => {
  await getCategoryById(categoryId);
  const alreadyFollowing = user.followedCategories.some((c) => c.toString() === categoryId);
  if (!alreadyFollowing) {
    user.followedCategories.push(categoryId);
    await user.save();
  }
  return User.findById(user.id);
};

const unfollowCategory = async (user, categoryId) => {
  await getCategoryById(categoryId);
  user.set({ followedCategories: user.followedCategories.filter((c) => c.toString() !== categoryId) });
  await user.save();
  return User.findById(user.id);
};

const getAssignedCategories = async (userId) => {
  const user = await User.findById(userId).populate('followedCategories', 'name description');
  if (!user || user.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user.followedCategories;
};

const assignCategoriesToUser = async (userId, categoryIds) => {
  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const categories = await Category.find({ _id: { $in: categoryIds } });
  if (categories.length !== categoryIds.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'One or more category IDs are invalid');
  }

  user.followedCategories = categoryIds;
  user.isTopicsSelected = true;
  await user.save();

  return User.findById(userId).populate('followedCategories', 'name description');
};

module.exports = {
  assignCategoriesToUser,
  createCategory,
  deleteCategory,
  followCategory,
  getAssignedCategories,
  getCategoryById,
  listCategories,
  unfollowCategory,
  updateCategory,
};
