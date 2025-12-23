const express = require('express');
const router = express.Router();
const departmentController = require('./department.controller');
const { authSupabase } = require('../../middlewares');

// Department config routes
router.get('/', authSupabase, departmentController.getDepartmentConfigs);
router.post('/', authSupabase, departmentController.updateDepartmentConfigs);

module.exports = router;

