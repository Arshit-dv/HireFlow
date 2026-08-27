const pool = require('../config/db');

// GET /api/dashboard/hr — HR summary statistics
const getHRDashboard = async (req, res, next) => {
  try {
    const [[appStats]]  = await pool.query('SELECT COUNT(*) AS total FROM application');
    const [[candStats]] = await pool.query('SELECT COUNT(*) AS total FROM candidate');
    const [[empStats]]  = await pool.query('SELECT COUNT(*) AS total FROM employee');
    const [[intStats]]  = await pool.query("SELECT COUNT(*) AS total FROM interview WHERE InterviewStatus='Scheduled'");
    const [[intPassed]] = await pool.query("SELECT COUNT(*) AS total FROM interview WHERE InterviewStatus='Passed'");
    const [[offerPend]] = await pool.query("SELECT COUNT(*) AS total FROM offer WHERE OfferStatus='Pending'");
    const [[trainPend]] = await pool.query("SELECT COUNT(*) AS total FROM training WHERE TrainingStatus='Ongoing'");
    const [[complOpen]] = await pool.query("SELECT COUNT(*) AS total FROM complaint WHERE ComplaintStatus='Open'");

    const [recentApps] = await pool.query(
      `SELECT a.ApplicationID, a.FirstName, a.LastName, a.PreferredRole, a.ApplicationDate,
              r.Qualification, r.Specialization,
              sc.CandidateID
       FROM application a
       LEFT JOIN resume r ON a.ApplicationID = r.ApplicationID
       LEFT JOIN screening sc ON a.ApplicationID = sc.ApplicationID
       ORDER BY a.ApplicationDate DESC, a.ApplicationID DESC LIMIT 5`
    );

    const [recentEmployees] = await pool.query(
      `SELECT e.EmployeeID, e.JoinDate, e.Performance, d.Role, dept.DeptName, a.FirstName, a.LastName
       FROM employee e
       LEFT JOIN designation d   ON e.DesignationID = d.DesignationID
       LEFT JOIN department dept ON d.DeptID = dept.DeptID
       LEFT JOIN candidate c     ON e.CandidateID = c.CandidateID
       LEFT JOIN application a   ON c.ApplicationID = a.ApplicationID
       ORDER BY e.JoinDate DESC, e.EmployeeID DESC LIMIT 5`
    );

    const [deptStats] = await pool.query(
      `SELECT d.DeptID, d.DeptName, COUNT(DISTINCT e.EmployeeID) AS emp_count, COALESCE(AVG(s.SalaryAmount), 0) AS avg_salary
       FROM department d
       LEFT JOIN designation des ON d.DeptID = des.DeptID
       LEFT JOIN employee e ON des.DesignationID = e.DesignationID
       LEFT JOIN salary s ON e.SalaryID = s.SalaryID
       GROUP BY d.DeptID, d.DeptName
       ORDER BY d.DeptID`
    );

    res.json({
      success: true,
      data: {
        stats: {
          total_applications: appStats.total,
          total_candidates: candStats.total,
          total_employees: empStats.total,
          scheduled_interviews: intStats.total,
          passed_interviews: intPassed.total,
          pending_offers: offerPend.total,
          ongoing_training: trainPend.total,
          open_complaints: complOpen.total,
        },
        recent_applications: recentApps,
        recent_employees: recentEmployees,
        department_distribution: deptStats,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/employee/:id — Employee self-service overview
const getEmployeeDashboard = async (req, res, next) => {
  try {
    const id = req.params.id;

    // Security check: Employee can only view their own dashboard
    if (req.user && req.user.Role === 'employee' && String(req.user.ReferenceID) !== String(id)) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own employee dashboard' });
    }

    const [[emp]] = await pool.query(
      `SELECT e.*, s.SalaryAmount, s.SalaryDate,
              d.Role, d.Vacancies, d.NoOfEmployees,
              dept.DeptID, dept.DeptName, dept.DeptPerformance, dept.DeptNoOfEmployees,
              ct.ContractDate, ct.NoticePeriod,
              p.Grade, p.BaseSalary, p.HRA, p.DA, p.Others,
              a.FirstName, a.LastName, a.PreferredRole, a.ResumeUrl
       FROM employee e
       LEFT JOIN salary s        ON e.SalaryID = s.SalaryID
       LEFT JOIN designation d   ON e.DesignationID = d.DesignationID
       LEFT JOIN department dept ON d.DeptID = dept.DeptID
       LEFT JOIN contract ct     ON e.ContractID = ct.ContractID
       LEFT JOIN payscale p      ON e.PayscaleID = p.PayscaleID
       LEFT JOIN candidate c     ON e.CandidateID = c.CandidateID
       LEFT JOIN application a   ON c.ApplicationID = a.ApplicationID
       WHERE e.EmployeeID = ?`,
      [id]
    );
    if (!emp) return res.status(404).json({ success: false, message: 'Employee record not found' });

    const [complaints]  = await pool.query('SELECT * FROM complaint WHERE EmployeeID=? ORDER BY ComplaintDateTime DESC LIMIT 10', [id]);
    const [attendance]  = await pool.query('SELECT * FROM attendance WHERE EmployeeID=? ORDER BY Date DESC LIMIT 10', [id]);
    const [trainingSup] = await pool.query(
      `SELECT et.*, t.TrainingStatus, t.TrainingStartDate, t.Insights, app.FirstName, app.LastName 
       FROM employeetraining et 
       LEFT JOIN training t ON et.CandidateID=t.CandidateID 
       LEFT JOIN candidate c ON et.CandidateID=c.CandidateID
       LEFT JOIN application app ON c.ApplicationID=app.ApplicationID
       WHERE et.EmployeeID=?`,
      [id]
    );

    res.json({
      success: true,
      data: {
        profile: emp,
        complaints,
        attendance,
        trainingSupervised: trainingSup,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getHRDashboard, getEmployeeDashboard };
