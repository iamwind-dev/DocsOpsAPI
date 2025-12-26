const express = require('express');
const router = express.Router();
const userController = require('../../flows/userManagement/user.controller');

// Route: /api/v2/users/status/:userId
router.get('/status/:userId', (req, res, next) => {
    req.params.id = req.params.userId;
    userController.getUserStatus(req, res, next);
});

module.exports = router;
