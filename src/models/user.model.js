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
      enum: ['local', 'google', 'apple', 'facebook'],
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
    isReporter: {
      type: Boolean,
      default: false,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: null,
    },
    bio: {
      type: String,
      trim: true,
      default: null,
    },
    avatar: {
      type: String,
      default: null,
    },
    coverPhoto: {
      type: String,
      default: null,
    },
    liveCaption: {
      type: String,
      trim: true,
      default: null,
    },
    liveUrl: {
      type: String,
      trim: true,
      default: null,
    },
    location: {
      type: String,
      trim: true,
      default: null,
    },
    privacySettings: {
      profileVisibility: {
        type: String,
        enum: ['everyone', 'connections_only', 'private'],
        default: 'everyone',
      },
      whoCanComment: {
        type: String,
        enum: ['public', 'connections_only', 'private'],
        default: 'public',
      },
      commentsEnabled: {
        type: Boolean,
        default: true,
      },
      whoCanSharePosts: {
        type: String,
        enum: ['public', 'connections_only', 'private'],
        default: 'public',
      },
    },
    preferences: {
      language: {
        type: String,
        default: 'en',
      },
    },
    blockedUsers: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
      },
    ],
    followedCategories: [
      {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'Category',
      },
    ],
    isTopicsSelected: {
      type: Boolean,
      default: false,
    },
    reporterProfile: {
      journalistId: {
        type: String,
        default: null,
      },
      documents: {
        type: [String],
        default: [],
      },
      approvalStatus: {
        type: String,
        enum: [null, 'pending', 'approved', 'rejected'],
        default: null,
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
