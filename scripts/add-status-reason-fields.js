const mongoose = require('mongoose');
const User = require('../src/models/user.model');
const config = require('../src/config/config');

// Add the new fields to all existing users
async function addStatusReasonFields() {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB');

    const result = await User.updateMany(
      {},
      {
        $set: {
          statusReasonTitle: null,
          statusReasonDescription: null,
        },
      },
      { upsert: false }
    );

    console.log(`Updated ${result.modifiedCount} user documents`);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

addStatusReasonFields();
