/* eslint-disable no-console */
const mongoose = require('mongoose');

const config = require('../src/config/config');
const { User } = require('../src/models');

const seedSuperAdmin = async () => {
  const { email, password, name } = config.superAdmin;

  if (!email || !password || !name) {
    throw new Error('SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, and SUPER_ADMIN_NAME are required');
  }

  await mongoose.connect(config.mongoose.url);

  const existingSuperAdmin = await User.findOne({ isSuperAdmin: true, isDeleted: false });
  if (existingSuperAdmin) {
    console.log('Non-deleted super admin already exists. No changes made.');
    return;
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error('Configured super admin email is already used by another account');
  }

  await User.create({
    name,
    email,
    password,
    role: 'admin',
    isSuperAdmin: true,
    isVerified: true,
    status: 'active',
    isDeleted: false,
    permissions: [],
  });

  console.log('Super admin created successfully.');
};

seedSuperAdmin()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
