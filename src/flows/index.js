const { documentRoutes } = require('./documentManagement');
const { classificationRoutes } = require('./autoClassification');
const { eSignatureRoutes, eSignatureExtensionRoutes } = require('./eSignature');
const { auditRoutes } = require('./auditTracking');
const { archiveRoutes } = require('./secureArchiving');
const { authRoutes } = require('./authentication');
const departmentRoutes = require('./departmentConfig');

module.exports = {
  documentRoutes,
  classificationRoutes,
  eSignatureRoutes,
  eSignatureExtensionRoutes,
  auditRoutes,
  archiveRoutes,
  authRoutes,
  departmentRoutes,
};
