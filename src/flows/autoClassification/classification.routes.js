const express = require('express');
const router = express.Router();
const classificationController = require('./classification.controller');

// Classification routes
router.post('/classify', classificationController.classifyDocument);
router.get('/categories', classificationController.getCategories);

module.exports = router;
