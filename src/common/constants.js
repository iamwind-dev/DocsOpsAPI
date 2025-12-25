module.exports = {
  RISK_LEVELS: {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    CRITICAL: 'Critical',
  },
  ACTION_TYPES: {
    DOWNLOAD: 'download',
    DELETE: 'delete',
    UPLOAD: 'upload',
    VIEW: 'view',
    EDIT: 'edit',
    EXPORT: 'export',
  },
  ANOMALY_TYPES: {
    EXCESSIVE_DOWNLOADS: 'excessive_downloads',
    EXCESSIVE_DELETES: 'excessive_deletes',
    SUSPICIOUS_IPS: 'suspicious_ips',
    BULK_OPERATIONS: 'bulk_operations',
    UNUSUAL_TIME: 'unusual_time',
  },
  THRESHOLDS: {
    DOWNLOAD_LIMIT: 20,
    DELETE_LIMIT: 10,
    BULK_OPERATION_LIMIT: 50,
  },
};
