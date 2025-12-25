const { documentRoutes } = require('./documentManagement');
const { classificationRoutes } = require('./autoClassification');
const { eSignatureRoutes, eSignatureExtensionRoutes } = require('./eSignature');
const { auditRoutes } = require('./auditTracking');
const { archiveRoutes } = require('./secureArchiving');
const { authRoutes } = require('./authentication');
const { userRoutes, adminRoutes } = require('./userManagement');
const departmentRoutes = require('./departmentConfig');

module.exports = {
  documentRoutes,
  classificationRoutes,
  eSignatureRoutes,
  eSignatureExtensionRoutes,
  auditRoutes,
  archiveRoutes,
  authRoutes,
  userRoutes,
  adminRoutes,
  departmentRoutes,
};
