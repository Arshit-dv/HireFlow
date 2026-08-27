const pool = require('../config/db');

const nextID = async (table, pkCol, conn = pool) => {
  const [[row]] = await conn.query(`SELECT COALESCE(MAX(${pkCol}), 0) + 1 AS n FROM ${table}`);
  return row.n;
};

// GET /api/salary — HR
const getAllSalary = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM salary ORDER BY SalaryDate DESC, SalaryID DESC');
    const [[metrics]] = await pool.query('SELECT COALESCE(SUM(SalaryAmount), 0) AS total_expenditure, COALESCE(AVG(SalaryAmount), 0) AS average_salary FROM salary');

    // Dept-wise metrics (LEFT JOIN to show all departments)
    const [deptMetrics] = await pool.query(`
      SELECT d.DeptName, COALESCE(SUM(s.SalaryAmount), 0) AS total_dept_salary, COALESCE(AVG(s.SalaryAmount), 0) AS avg_dept_salary
      FROM department d
      LEFT JOIN designation des ON d.DeptID = des.DeptID
      LEFT JOIN employee e ON des.DesignationID = e.DesignationID
      LEFT JOIN salary s ON e.SalaryID = s.SalaryID
      GROUP BY d.DeptID, d.DeptName
      ORDER BY d.DeptName
    `);

    res.json({ success: true, count: rows.length, metrics, deptMetrics, data: rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/salary/:id
const getSalaryById = async (req, res, next) => {
  try {
    const [[row]] = await pool.query('SELECT * FROM salary WHERE SalaryID = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Salary record not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
};

// GET /api/salary/payscales
const getPayscales = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM payscale ORDER BY BaseSalary DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/salary/calculate
const calculateTotalSalary = async (req, res, next) => {
  try {
    const { PayscaleID } = req.body;
    if (!PayscaleID) return res.status(400).json({ success: false, message: 'PayscaleID is required' });

    const [[scale]] = await pool.query('SELECT * FROM payscale WHERE PayscaleID = ?', [PayscaleID]);
    if (!scale) return res.status(404).json({ success: false, message: 'Payscale not found' });

    const total = parseFloat(scale.BaseSalary || 0) + parseFloat(scale.HRA || 0) + parseFloat(scale.DA || 0) + parseFloat(scale.Others || 0);
    res.json({ success: true, data: { ...scale, TotalSalary: total } });
  } catch (err) {
    next(err);
  }
};

// GET /api/salary/bill/:id (Payslip generation)
const generateBill = async (req, res, next) => {
  try {
    const employeeId = req.params.id;
    const { month = 'Current', year = new Date().getFullYear().toString() } = req.query;

    // Security check: Employee can only view their own bill, HR can view all
    if (req.user && req.user.Role === 'employee' && String(req.user.ReferenceID) !== String(employeeId)) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own salary bill' });
    }

    const [[emp]] = await pool.query(
      `SELECT e.*, s.SalaryAmount, d.Role, dept.DeptName, 
              p.Grade, p.BaseSalary, p.HRA, p.DA, p.Others, 
              a.FirstName, a.LastName
       FROM employee e
       LEFT JOIN salary s ON e.SalaryID = s.SalaryID
       LEFT JOIN designation d ON e.DesignationID = d.DesignationID
       LEFT JOIN department dept ON d.DeptID = dept.DeptID
       LEFT JOIN payscale p ON e.PayscaleID = p.PayscaleID
       LEFT JOIN candidate c ON e.CandidateID = c.CandidateID
       LEFT JOIN application a ON c.ApplicationID = a.ApplicationID
       WHERE e.EmployeeID = ?`,
      [employeeId]
    );

    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });
    const fullName = emp.FirstName ? `${emp.FirstName} ${emp.LastName}` : `Employee #${emp.EmployeeID}`;

    const base = parseFloat(emp.BaseSalary || emp.SalaryAmount || 0);
    const hra = parseFloat(emp.HRA || 0);
    const da = parseFloat(emp.DA || 0);
    const others = parseFloat(emp.Others || 0);
    const totalEarnings = base + hra + da + others;
    const deductions = 0;
    const netPay = totalEarnings - deductions;

    const bill = {
      EmployeeID: emp.EmployeeID,
      EmployeeName: fullName,
      Designation: emp.Role || 'Staff',
      Department: emp.DeptName || 'Operations',
      Grade: emp.Grade || 'Standard',
      Month: month,
      Year: year,
      Earnings: {
        Base: base,
        HRA: hra,
        DA: da,
        Others: others,
      },
      TotalEarnings: totalEarnings,
      Deductions: deductions,
      NetPay: netPay,
      GeneratedDate: new Date().toISOString().split('T')[0],
    };

    res.json({ success: true, data: bill });
  } catch (err) {
    next(err);
  }
};

// POST /api/salary — HR
const createSalary = async (req, res, next) => {
  try {
    const { SalaryAmount, SalaryDate } = req.body;
    if (!SalaryAmount) return res.status(400).json({ success: false, message: 'SalaryAmount is required' });
    const SalaryID = await nextID('salary', 'SalaryID');
    const date = SalaryDate || new Date().toISOString().split('T')[0];
    await pool.query('INSERT INTO salary (SalaryID, SalaryAmount, SalaryDate) VALUES (?, ?, ?)', [SalaryID, SalaryAmount, date]);
    res.status(201).json({ success: true, message: 'Salary structure created successfully', SalaryID });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/salary/:id — HR
const updateSalary = async (req, res, next) => {
  try {
    const { SalaryAmount, SalaryDate } = req.body;
    await pool.query(
      'UPDATE salary SET SalaryAmount=COALESCE(?,SalaryAmount), SalaryDate=COALESCE(?,SalaryDate) WHERE SalaryID=?',
      [SalaryAmount, SalaryDate, req.params.id]
    );
    res.json({ success: true, message: 'Salary record updated successfully' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/salary/:id — HR
const deleteSalary = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM salary WHERE SalaryID = ?', [req.params.id]);
    res.json({ success: true, message: 'Salary structure deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/salary/payscales/:id — HR
const deletePayscale = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM payscale WHERE PayscaleID = ?', [req.params.id]);
    res.json({ success: true, message: 'Payscale grade deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllSalary,
  getSalaryById,
  getPayscales,
  calculateTotalSalary,
  generateBill,
  createSalary,
  updateSalary,
  deleteSalary,
  deletePayscale,
};
