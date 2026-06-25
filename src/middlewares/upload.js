const httpStatus = require('http-status');
const multer = require('multer');
const multerS3 = require('multer-s3');

const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const { s3Client } = require('../services/s3.service');

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024; // covers video; images are far smaller, so one ceiling is enough

const sanitizeFilename = (filename) => filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');

const storage = multerS3({
  s3: s3Client,
  // Resolved lazily (not read at require-time) so the app/tests can boot before AWS env vars are set.
  bucket: (req, file, cb) => cb(null, config.s3.bucket),
  contentType: multerS3.AUTO_CONTENT_TYPE,
  // Buckets with Object Ownership "Bucket owner enforced" (the default since 2023) reject
  // any ACL value, even 'private' — omitting the field entirely (cb(null, undefined)) avoids that.
  acl: (req, file, cb) => cb(null, undefined),
  key: (req, file, cb) => {
    cb(null, `news/${req.user.id}/${Date.now()}-${sanitizeFilename(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(
      new ApiError(
        httpStatus.BAD_REQUEST,
        'Unsupported media type. Allowed: jpeg/png/webp/gif images or mp4/mov/webm videos',
      ),
    );
    return;
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE_BYTES } });

const uploadMedia = (req, res, next) => {
  upload.single('media')(req, res, (err) => {
    if (err) {
      if (err instanceof ApiError) {
        return next(err);
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(httpStatus.BAD_REQUEST, 'File too large. Max size is 200MB'));
      }
      return next(new ApiError(httpStatus.BAD_REQUEST, err.message));
    }
    if (!req.file) {
      return next(new ApiError(httpStatus.BAD_REQUEST, 'Media file is required'));
    }
    return next();
  });
};

const MAX_CAMPAIGN_ATTACHMENTS = 5;

const campaignStorage = multerS3({
  s3: s3Client,
  bucket: (req, file, cb) => cb(null, config.s3.bucket),
  contentType: multerS3.AUTO_CONTENT_TYPE,
  acl: (req, file, cb) => cb(null, undefined),
  key: (req, file, cb) => {
    cb(null, `campaigns/${req.user.id}/${Date.now()}-${sanitizeFilename(file.originalname)}`);
  },
});

const campaignUpload = multer({
  storage: campaignStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

// Attachments are optional (0-5 files) — the "Start a Campaign" mockup shows no required marker on them.
const uploadCampaignAttachments = (req, res, next) => {
  campaignUpload.array('attachments', MAX_CAMPAIGN_ATTACHMENTS)(req, res, (err) => {
    if (err) {
      if (err instanceof ApiError) {
        return next(err);
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(httpStatus.BAD_REQUEST, 'File too large. Max size is 200MB'));
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new ApiError(httpStatus.BAD_REQUEST, `Maximum ${MAX_CAMPAIGN_ATTACHMENTS} attachments allowed`));
      }
      return next(new ApiError(httpStatus.BAD_REQUEST, err.message));
    }
    return next();
  });
};

module.exports = { uploadCampaignAttachments, uploadMedia };
