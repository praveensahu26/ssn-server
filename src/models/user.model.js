const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const validator = require('validator');

const toJSON = require('./plugins/toJSON.plugin');

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    password: {
      type: String,
      required: true,
      private: true,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'operator', 'user'],
      default: 'user',
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    otp: {
      type: String,
      default: null,
      private: true,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
      private: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    permissions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

userSchema.plugin(toJSON);

userSchema.statics.isEmailTaken = async function isEmailTaken(email, excludeUserId) {
  const user = await this.findOne({ email: email.toLowerCase() });
  return !!user && (!excludeUserId || user.id !== excludeUserId);
};

userSchema.methods.isPasswordMatch = async function isPasswordMatch(password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};

userSchema.methods.isOperator = function isOperator() {
  return ['admin', 'manager', 'operator'].includes(this.role);
};

userSchema.methods.hasPermission = function hasPermission(permission) {
  if (this.isSuperAdmin) {
    return true;
  }
  return this.permissions.includes(permission);
};

userSchema.methods.hasAllPermissions = function hasAllPermissions(permissions) {
  if (this.isSuperAdmin) {
    return true;
  }
  return permissions.every((permission) => this.permissions.includes(permission));
};

userSchema.methods.hasAnyPermission = function hasAnyPermission(permissions) {
  if (this.isSuperAdmin) {
    return true;
  }
  return permissions.some((permission) => this.permissions.includes(permission));
};

userSchema.pre('save', async function save(next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
