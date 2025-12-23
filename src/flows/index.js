const { documentRoutes } = require('./documentManagement');
const { classificationRoutes } = require('./autoClassification');
const { eSignatureRoutes, eSignatureExtensionRoutes } = require('./eSignature');
const { auditRoutes } = require('./auditTracking');
const { archiveRoutes } = require('./secureArchiving');

module.exports = {
  documentRoutes,
  classificationRoutes,
  eSignatureRoutes,
  eSignatureExtensionRoutes,
  auditRoutes,
  archiveRoutes,
};
