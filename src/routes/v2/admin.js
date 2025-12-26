const express = require('express');
const router = express.Router();
const userController = require('../../flows/userManagement/user.controller');
// const { apiKeyAuth } = require('../../middlewares'); // Uncomment if needed

// Route: /api/v2/admin/block-user
router.post('/block-user', (req, res, next) => {
    req.body.status = 1;
    userController.toggleBlockUser(req, res, next);
});

// Route: /api/v2/admin/unblock-user
router.post('/unblock-user', (req, res, next) => {
    req.body.status = 0;
    userController.toggleBlockUser(req, res, next);
});

// Route: /api/v2/admin/check-block-status
// Assuming body has userId, mapped to getUserStatus which expects param id? 
// Or generic check. For now let's reuse getUserStatus if method is POST? 
// Re-implementing simplified version based on userController logic for POST body
router.post('/check-block-status', async (req, res, next) => {
    if (req.body.userId) {
        req.params.id = req.body.userId;
        return userController.getUserStatus(req, res, next);
    }
    next();
});


module.exports = router;
