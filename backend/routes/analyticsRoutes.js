const express = require('express');
const router = express.Router();
const { getOrgView, getSalaryStats, getReadyToHire } = require('../controllers/analyticsController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.get('/org-view', protect, requireRole('hr'), getOrgView);
router.get('/salary-stats', protect, requireRole('hr'), getSalaryStats);
router.get('/ready-to-hire', protect, requireRole('hr'), getReadyToHire);

module.exports = router;
