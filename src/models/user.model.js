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
    mobile: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      // Only local accounts have a password; social (e.g. Google) accounts don't.
      required: function requiredPassword() {
        return this.authProvider === 'local';
      },
      private: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'operator', 'user', 'reporter', 'reporter_pending'],
      default: 'user',
    },
    avatar: {
      type: String,
      default: null,
    },
    followedCategories: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'Category',
      },
    ],
    reporterProfile: {
      documents: {
        type: [String],
        default: [],
      },
      approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      appliedAt: {
        type: Date,
        default: null,
      },
      rejectionReason: {
        type: String,
        default: null,
      },
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
      enum: ['active', 'inactive', 'suspended', 'blocked'],
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

userSchema.statics.isMobileTaken = async function isMobileTaken(mobile, excludeUserId) {
  const user = await this.findOne({ mobile });
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
