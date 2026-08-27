const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hr_recruitment_db',
};

(async () => {
  const pool = mysql.createPool(dbConfig);
  console.log('🚀 Seeding 5 Complete Recruitment Life-Cycle Records...');

  try {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');

    const tables = [
      'complaint', 'employeetraining', 'training', 'awarded', 'offer', 'interview', 
      'attendance', 'employeecandidate', 'employee', 'contract', 'salary', 
      'screening', 'candidate', 'resumeprojects', 'resumeskills', 'resume', 
      'application', 'payscale', 'designation', 'department'
    ];
    for (const t of tables) await pool.query(`DELETE FROM ${t}`);

    // Seed Demo Users (1 HR Admin + 1 Employee)
    const hrPassHash = bcrypt.hashSync('admin123', 10);
    const empPassHash = bcrypt.hashSync('user123', 10);
    await pool.query('INSERT INTO users (UserID, Username, PasswordHash, Role, ReferenceID) VALUES (1, "admin", ?, "hr", NULL) ON DUPLICATE KEY UPDATE PasswordHash=?, Role="hr"', [hrPassHash, hrPassHash]);
    await pool.query('INSERT INTO users (UserID, Username, PasswordHash, Role, ReferenceID) VALUES (2, "eva", ?, "employee", 5) ON DUPLICATE KEY UPDATE PasswordHash=?, Role="employee", ReferenceID=5', [empPassHash, empPassHash]);

    // 🏗️ Step 1: Base Infrastructure (5 Departments, 6 Designations, 5 Payscales)
    const depts = ['Engineering', 'Marketing', 'Sales', 'Human Resources', 'Finance'];
    const roles = ['Software Developer', 'Marketing Lead', 'Sales Manager', 'HR Specialist', 'Financial Analyst'];
    for (let i = 1; i <= 5; i++) {
      await pool.query('INSERT INTO department (DeptID, DeptName, DeptVacancies, DeptPerformance, DeptNoOfEmployees) VALUES (?, ?, ?, ?, ?)', [i, depts[i-1], 5, 'Good', 10]);
      await pool.query('INSERT INTO designation (DesignationID, DeptID, Role, Vacancies, NoOfEmployees) VALUES (?, ?, ?, ?, ?)', [i, i, roles[i-1], 2, 8]);
      await pool.query('INSERT INTO payscale (PayscaleID, Grade, BaseSalary, HRA, DA, Others) VALUES (?, ?, ?, ?, ?, ?)', [i, `Grade ${i}`, 30000 + (i*10000), 7000, 4000, 3000]);
      await pool.query('INSERT INTO salary (SalaryID, SalaryAmount, SalaryDate) VALUES (?, ?, ?)', [i, 40000 + (i*10000), '2026-03-01']);
      const noticePeriods = [30, 45, 60, 90, 30];
      await pool.query('INSERT INTO contract (ContractID, ContractDate, NoticePeriod) VALUES (?, ?, ?)', [i, '2026-01-01', noticePeriods[i-1]]);
    }

    // 👤 Life-Cycle 1: Fresh Applicant (Arunjit)
    await pool.query('INSERT INTO application (ApplicationID, FirstName, LastName, PreferredRole, ApplicationDate, ResumeUrl) VALUES (1, "Arunjit", "Singh", "Software Developer", "2026-03-20", NULL)');
    await pool.query('INSERT INTO resume (ApplicationID, Qualification, Specialization, YearsOfExperience) VALUES (1, "B.Tech", "Computer Science", 2)');
    await pool.query('INSERT INTO resumeskills (ApplicationID, Skill) VALUES (1, "React"), (1, "Node.js"), (1, "MySQL")');
    await pool.query('INSERT INTO resumeprojects (ApplicationID, Project) VALUES (1, "E-commerce Platform"), (1, "Cloud Inventory")');

    // 👥 Life-Cycle 2: Screened Candidate (Bob)
    await pool.query('INSERT INTO application (ApplicationID, FirstName, LastName, PreferredRole, ApplicationDate, ResumeUrl) VALUES (2, "Bob", "Smith", "Marketing Lead", "2026-03-15", NULL)');
    await pool.query('INSERT INTO resume (ApplicationID, Qualification, Specialization, YearsOfExperience) VALUES (2, "MBA", "Marketing", 4)');
    await pool.query('INSERT INTO candidate (CandidateID, ApplicationID, ExpectedSalary, Potential) VALUES (2, 2, 85000, "High")');
    await pool.query('INSERT INTO screening (ApplicationID, CandidateID, ScreeningStatus) VALUES (2, 2, "Passed")');

    // 🗓️ Life-Cycle 3: Interviewed & Passed (Charlie)
    await pool.query('INSERT INTO application (ApplicationID, FirstName, LastName, PreferredRole, ApplicationDate, ResumeUrl) VALUES (3, "Charlie", "Davis", "Sales Manager", "2026-03-10", NULL)');
    await pool.query('INSERT INTO resume (ApplicationID, Qualification, Specialization, YearsOfExperience) VALUES (3, "BBA", "Business", 6)');
    await pool.query('INSERT INTO candidate (CandidateID, ApplicationID, ExpectedSalary, Potential) VALUES (3, 3, 95000, "High")');
    await pool.query('INSERT INTO screening (ApplicationID, CandidateID, ScreeningStatus) VALUES (3, 3, "Passed")');
    await pool.query('INSERT INTO interview (InterviewID, CandidateID, InterviewDate, Time, Venue, InterviewStatus) VALUES (3, 3, "2026-03-25", "14:00:00", "Room 402", "Passed")');

    // 📄 Life-Cycle 4: Offer Awarded - In Training (Deepa)
    await pool.query('INSERT INTO application (ApplicationID, FirstName, LastName, PreferredRole, ApplicationDate, ResumeUrl) VALUES (4, "Deepa", "Verma", "HR Specialist", "2026-03-01", NULL)');
    await pool.query('INSERT INTO resume (ApplicationID, Qualification, Specialization, YearsOfExperience) VALUES (4, "MA", "Psychology", 3)');
    await pool.query('INSERT INTO candidate (CandidateID, ApplicationID, ExpectedSalary, Potential) VALUES (4, 4, 60000, "Medium")');
    await pool.query('INSERT INTO screening (ApplicationID, CandidateID, ScreeningStatus) VALUES (4, 4, "Passed")');
    await pool.query('INSERT INTO interview (InterviewID, CandidateID, InterviewDate, Time, Venue, InterviewStatus) VALUES (4, 4, "2026-03-05", "11:00:00", "Online", "Passed")');
    await pool.query('INSERT INTO offer (OfferID, CandidateID, SalaryID, ContractID, DateGenerated, OfferStatus) VALUES (4, 4, 4, 4, "2026-03-06", "Accepted")');
    await pool.query('INSERT INTO awarded (OfferID, CandidateID, AwardedDate, AwardedTime) VALUES (4, 4, "2026-03-10", "10:00:00")');
    await pool.query('INSERT INTO training (CandidateID, TrainingStatus, TrainingStartDate, Insights) VALUES (4, "Ongoing", "2026-03-15", "Active participation in orientation program")');

    // 🏢 Life-Cycle 5: Full Employee (Eva)
    await pool.query('INSERT INTO application (ApplicationID, FirstName, LastName, PreferredRole, ApplicationDate, ResumeUrl) VALUES (5, "Eva", "Jain", "Financial Analyst", "2026-02-01", NULL)');
    await pool.query('INSERT INTO resume (ApplicationID, Qualification, Specialization, YearsOfExperience) VALUES (5, "CA", "Accounting", 8)');
    await pool.query('INSERT INTO candidate (CandidateID, ApplicationID, ExpectedSalary, Potential) VALUES (5, 5, 120000, "High")');
    await pool.query('INSERT INTO screening (ApplicationID, CandidateID, ScreeningStatus) VALUES (5, 5, "Passed")');
    await pool.query('INSERT INTO interview (InterviewID, CandidateID, InterviewDate, Time, Venue, InterviewStatus) VALUES (5, 5, "2026-02-10", "10:00:00", "Head Office", "Passed")');
    await pool.query('INSERT INTO offer (OfferID, CandidateID, SalaryID, ContractID, DateGenerated, OfferStatus) VALUES (5, 5, 5, 5, "2026-02-11", "Accepted")');
    await pool.query('INSERT INTO awarded (OfferID, CandidateID, AwardedDate, AwardedTime) VALUES (5, 5, "2026-02-15", "09:30:00")');
    await pool.query('INSERT INTO training (CandidateID, TrainingStatus, TrainingStartDate, TrainingEndDate, Insights) VALUES (5, "Completed", "2026-02-16", "2026-03-01", "Ready for financial auditing and deployment")');
    await pool.query('INSERT INTO employee (EmployeeID, CandidateID, SalaryID, DesignationID, ContractID, JoinDate, Performance, PayscaleID) VALUES (5, 5, 5, 5, 5, "2026-03-02", "Excellent", 5)');
    await pool.query('INSERT INTO employeecandidate (EmployeeID, CandidateID) VALUES (5, 5)');
    
    // Log attendance for employee 5
    for (let d = 20; d <= 26; d++) {
      await pool.query('INSERT INTO attendance (AttendanceID, EmployeeID, Date, Status, CheckIn, CheckOut) VALUES (?, 5, ?, "Present", "09:00:00", "18:00:00")', [500+d, `2026-03-${d}`]);
    }
    // Raise a sample grievance for the employee
    await pool.query("INSERT INTO complaint (ComplaintID, EmployeeID, ComplaintDateTime, Description, ComplaintStatus, Priority) VALUES (2, 5, '2026-03-26 14:15:00', 'Access to the financial analytics portal requires additional permissions.', 'Open', 'Medium')");

    console.log('✅ DATABASE SEEDED: 5 Complete Life-Cycle Chains Created.');
    console.log('🔑 Credentials:');
    console.log('   HR Admin : Username: admin | Password: admin123');
    console.log('   Employee : Username: eva   | Password: user123');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    await pool.end();
  }
})();
