const { DeleteObjectCommand, S3Client } = require('@aws-sdk/client-s3');

const config = require('../config/config');

const s3Client = new S3Client({
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
});

const deleteS3Object = async (key) => {
  if (!key) return;
  await s3Client.send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: key }));
};

module.exports = {
  deleteS3Object,
  s3Client,
};
