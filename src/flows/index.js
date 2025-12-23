const { documentRoutes } = require('./documentManagement');
const { classificationRoutes } = require('./autoClassification');
const { eSignatureRoutes } = require('./eSignature');
const { auditRoutes } = require('./auditTracking');
const { archiveRoutes } = require('./secureArchiving');
const { authRoutes } = require('./authentication');
const departmentRoutes = require('./departmentConfig');

module.exports = {
  documentRoutes,
  classificationRoutes,
  eSignatureRoutes,
  auditRoutes,
  archiveRoutes,
  authRoutes,
  departmentRoutes,
};
