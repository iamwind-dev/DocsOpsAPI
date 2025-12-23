const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, updateProfile, uploadAvatar } = require('./auth.controller');
const { authSupabase } = require('../../middlewares');

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authSupabase, getMe); // QUAN TRỌNG: Thêm authSupabase middleware
router.put('/profile', authSupabase, updateProfile);
router.post('/upload-avatar', authSupabase, uploadAvatar);

module.exports = router;

