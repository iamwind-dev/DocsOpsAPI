const express = require('express');
const router = express.Router();
const userController = require('./user.controller');

// Route kiểm tra status: /:id/status
router.get('/:id/status', userController.getUserStatus);

module.exports = router;
