const express = require('express');
const router = express.Router();
const userController = require('./user.controller');

// Block user: /block-user
router.post('/block-user', userController.toggleBlockUser);

module.exports = router;
