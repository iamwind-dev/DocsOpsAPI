const { documentRoutes } = require('./documentManagement');
const { classificationRoutes } = require('./autoClassification');
const { eSignatureRoutes } = require('./eSignature');
const { auditRoutes } = require('./auditTracking');
const { archiveRoutes } = require('./secureArchiving');

module.exports = {
  documentRoutes,
  classificationRoutes,
  eSignatureRoutes,
  auditRoutes,
  archiveRoutes,
};
