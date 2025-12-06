const express = require('express');
const router = express.Router();
const archiveController = require('./archive.controller');

// Secure archiving routes
router.get('/', archiveController.getArchives);
router.get('/:id', archiveController.getArchive);
router.post('/', archiveController.archiveDocument);
router.post('/:id/restore', archiveController.restoreDocument);
router.delete('/:id', archiveController.deleteArchive);

module.exports = router;
