const admin = require('firebase-admin');
const httpStatus = require('http-status');

const config = require('../config/config');
const ApiError = require('../utils/ApiError');

const isConfigured = () => Boolean(config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey);

const getAdmin = () => {
  if (!isConfigured()) {
    throw new ApiError(httpStatus.NOT_IMPLEMENTED, 'Google login is not configured on the server');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    });
  }

  return admin;
};

/**
 * Verify a Google/Firebase ID token sent by the client and return its decoded
 * claims (uid, email, name, picture, email_verified).
 */
const verifyIdToken = async (idToken) => {
  try {
    return await getAdmin().auth().verifyIdToken(idToken);
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired Google token');
  }
};

module.exports = {
  isConfigured,
  verifyIdToken,
};
