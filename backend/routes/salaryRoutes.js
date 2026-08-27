const express = require('express');
const router = express.Router();
const { 
  getAllSalary, getSalaryById, getPayscales, calculateTotalSalary, 
  generateBill, createSalary, updateSalary, deleteSalary, deletePayscale
} = require('../controllers/salaryController');
const { protect, requireRole } = require('../middleware/authMiddleware');

// HR-only salary view & management
router.get('/',               protect, requireRole('hr'), getAllSalary);
router.get('/payscales',      protect, getPayscales);
router.get('/:id',            protect, requireRole('hr'), getSalaryById);
router.post('/calculate',     protect, calculateTotalSalary);
router.get('/bill/:id',       protect, generateBill); // Protected inside controller (self or HR)
router.post('/',              protect, requireRole('hr'), createSalary);
router.patch('/:id',          protect, requireRole('hr'), updateSalary);
router.delete('/payscales/:id', protect, requireRole('hr'), deletePayscale);
router.delete('/:id',         protect, requireRole('hr'), deleteSalary);

module.exports = router;
