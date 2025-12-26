const express = require('express');
const router = express.Router();

const auditRoutes = require('./audit');
const adminRoutes = require('./admin');
const userRoutes = require('./users');
const documentRoutes = require('./documents');

// Mount V2 Routes
router.use('/audit', auditRoutes);
router.use('/admin', adminRoutes);
router.use('/users', userRoutes);
router.use('/documents', documentRoutes);

module.exports = router;
