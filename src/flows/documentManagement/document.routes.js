const express = require('express');
const router = express.Router();
const documentController = require('./document.controller');

// Document routes
router.get('/', documentController.getDocuments);
router.get('/:id', documentController.getDocument);
router.post('/', documentController.createDocument);
router.put('/:id', documentController.updateDocument);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
