const express = require('express');
const router = express.Router();
const userController = require('../../flows/userManagement/user.controller');

// Route: /api/v2/users/:userId/status
router.get('/:userId/status', (req, res, next) => {
    req.params.id = req.params.userId;
    userController.getUserStatus(req, res, next);
});

module.exports = router;
