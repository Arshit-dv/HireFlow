const express = require('express');
const router = express.Router();
const {
  submitApplication,
  getAllApplications,
  getApplicationById,
  screenApplication,
  updateApplication,
  deleteApplication,
} = require('../controllers/applicationController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { upload } = require('../config/s3');

// Public application submission with optional resume upload
router.post('/', upload.single('resume'), submitApplication);

// HR protected routes
router.get('/',           protect, requireRole('hr'), getAllApplications);
router.get('/:id',        protect, requireRole('hr'), getApplicationById);
router.patch('/:id',      protect, requireRole('hr'), updateApplication);
router.delete('/:id',     protect, requireRole('hr'), deleteApplication);
router.post('/:id/screen',protect, requireRole('hr'), screenApplication);

module.exports = router;
