require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('./src/config/config');
const { User } = require('./src/models');

(async () => {
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  const userA = await User.findOne({ _id: '6a3a615c2d5bec3b39bad9f6' });
  const userB = await User.findOne({ _id: { $ne: userA._id } });
  console.log('USER_A', userA._id.toString());
  console.log('USER_B', userB._id.toString());
  console.log('TOKEN_A', jwt.sign({ sub: userA._id.toString(), type: 'access' }, config.jwt.secret, { expiresIn: '1h' }));
  await mongoose.disconnect();
})();
