-- ============================================================
-- HR Recruitment & Management System — Canonical Database Schema
-- Compatible with MySQL 8.0+ & Relational DBMS Requirements
-- ============================================================

CREATE DATABASE IF NOT EXISTS hr_recruitment_db;
USE hr_recruitment_db;

SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. Users (Authentication & Role Management) ───────────────
CREATE TABLE IF NOT EXISTS users (
  UserID       INT AUTO_INCREMENT PRIMARY KEY,
  Username     VARCHAR(100) NOT NULL UNIQUE,
  PasswordHash VARCHAR(255) NOT NULL,
  Role         ENUM('hr', 'employee') NOT NULL DEFAULT 'employee',
  ReferenceID  INT DEFAULT NULL,   -- Links to EmployeeID for employee logins
  CreatedAt    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── 2. Department ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS department (
  DeptID            INT PRIMARY KEY,
  DeptName          VARCHAR(150) NOT NULL UNIQUE,
  DeptVacancies     INT DEFAULT 0,
  DeptPerformance   VARCHAR(50) DEFAULT 'Good',
  DeptNoOfEmployees INT DEFAULT 0
);

-- ── 3. Designation (Job Roles linked to Department) ───────────
CREATE TABLE IF NOT EXISTS designation (
  DesignationID  INT PRIMARY KEY,
  DeptID         INT,
  Role           VARCHAR(150) NOT NULL,
  Vacancies      INT DEFAULT 0,
  NoOfEmployees  INT DEFAULT 0,
  FOREIGN KEY (DeptID) REFERENCES department(DeptID) ON DELETE SET NULL
);

-- ── 4. Payscale (Pay Grades & Allowance Breakdown) ────────────
CREATE TABLE IF NOT EXISTS payscale (
  PayscaleID INT PRIMARY KEY,
  Grade      VARCHAR(50) NOT NULL,
  BaseSalary DECIMAL(10,2) NOT NULL,
  HRA        DECIMAL(10,2) DEFAULT 0,
  DA         DECIMAL(10,2) DEFAULT 0,
  Others     DECIMAL(10,2) DEFAULT 0
);

-- ── 5. Salary (Salary Structures) ─────────────────────────────
CREATE TABLE IF NOT EXISTS salary (
  SalaryID     INT PRIMARY KEY,
  SalaryAmount DECIMAL(10,2) NOT NULL,
  SalaryDate   DATE
);

-- ── 6. Contract (Contract Terms & Notice Periods) ─────────────
CREATE TABLE IF NOT EXISTS contract (
  ContractID   INT PRIMARY KEY,
  ContractDate DATE,
  NoticePeriod INT NOT NULL
);

-- ── 7. Application (Talent Pool Intake) ───────────────────────
CREATE TABLE IF NOT EXISTS application (
  ApplicationID   INT PRIMARY KEY,
  FirstName       VARCHAR(100) NOT NULL,
  LastName        VARCHAR(100) NOT NULL,
  PreferredRole   VARCHAR(150) NOT NULL,
  ApplicationDate DATE NOT NULL,
  ResumeUrl       VARCHAR(500) DEFAULT NULL
);

-- ── 8. Resume (Applicant Education & Experience) ──────────────
CREATE TABLE IF NOT EXISTS resume (
  ApplicationID      INT PRIMARY KEY,
  Qualification      VARCHAR(150) NOT NULL,
  Specialization     VARCHAR(150) DEFAULT 'General',
  YearsOfExperience  INT DEFAULT 0,
  FOREIGN KEY (ApplicationID) REFERENCES application(ApplicationID) ON DELETE CASCADE
);

-- ── 9. Resume Skills ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resumeskills (
  SkillID       INT AUTO_INCREMENT PRIMARY KEY,
  ApplicationID INT NOT NULL,
  Skill         VARCHAR(100) NOT NULL,
  FOREIGN KEY (ApplicationID) REFERENCES application(ApplicationID) ON DELETE CASCADE
);

-- ── 10. Resume Projects ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS resumeprojects (
  ProjectID     INT AUTO_INCREMENT PRIMARY KEY,
  ApplicationID INT NOT NULL,
  Project       VARCHAR(255) NOT NULL,
  FOREIGN KEY (ApplicationID) REFERENCES application(ApplicationID) ON DELETE CASCADE
);

-- ── 11. Candidate (Qualified Applicants) ──────────────────────
CREATE TABLE IF NOT EXISTS candidate (
  CandidateID    INT PRIMARY KEY,
  ApplicationID  INT,
  ExpectedSalary DECIMAL(10,2) DEFAULT 0,
  Potential      ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
  FOREIGN KEY (ApplicationID) REFERENCES application(ApplicationID) ON DELETE SET NULL
);

-- ── 12. Screening (HR Evaluation & Shortlisting) ──────────────
CREATE TABLE IF NOT EXISTS screening (
  ScreeningID     INT AUTO_INCREMENT PRIMARY KEY,
  ApplicationID   INT NOT NULL,
  CandidateID     INT NOT NULL,
  ScreeningStatus VARCHAR(50) DEFAULT 'Passed',
  ScreeningDate   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ApplicationID) REFERENCES application(ApplicationID) ON DELETE CASCADE,
  FOREIGN KEY (CandidateID)   REFERENCES candidate(CandidateID) ON DELETE CASCADE
);

-- ── 13. Interview (Interview Scheduling & Results) ────────────
CREATE TABLE IF NOT EXISTS interview (
  InterviewID     INT PRIMARY KEY,
  CandidateID     INT NOT NULL,
  InterviewDate   DATE NOT NULL,
  Time            TIME NOT NULL,
  Venue           VARCHAR(255) DEFAULT 'Online',
  InterviewStatus ENUM('Scheduled', 'Passed', 'Failed', 'Cancelled') DEFAULT 'Scheduled',
  FOREIGN KEY (CandidateID) REFERENCES candidate(CandidateID) ON DELETE CASCADE
);

-- ── 14. Offer (Offer Generation) ──────────────────────────────
CREATE TABLE IF NOT EXISTS offer (
  OfferID       INT PRIMARY KEY,
  CandidateID   INT NOT NULL,
  SalaryID      INT NOT NULL,
  ContractID    INT NOT NULL,
  DateGenerated DATE NOT NULL,
  UpdatedDate   DATE DEFAULT NULL,
  OfferStatus   ENUM('Pending', 'Accepted', 'Rejected', 'Expired') DEFAULT 'Pending',
  FOREIGN KEY (CandidateID) REFERENCES candidate(CandidateID) ON DELETE CASCADE,
  FOREIGN KEY (SalaryID)    REFERENCES salary(SalaryID) ON DELETE CASCADE,
  FOREIGN KEY (ContractID)  REFERENCES contract(ContractID) ON DELETE CASCADE
);

-- ── 15. Awarded (Offer Acceptance & Confirmation) ─────────────
CREATE TABLE IF NOT EXISTS awarded (
  AwardID     INT AUTO_INCREMENT PRIMARY KEY,
  OfferID     INT NOT NULL,
  CandidateID INT NOT NULL,
  AwardedDate DATE NOT NULL,
  AwardedTime TIME NOT NULL,
  FOREIGN KEY (OfferID)     REFERENCES offer(OfferID) ON DELETE CASCADE,
  FOREIGN KEY (CandidateID) REFERENCES candidate(CandidateID) ON DELETE CASCADE
);

-- ── 16. Training (Orientation & Preparation) ──────────────────
CREATE TABLE IF NOT EXISTS training (
  TrainingID        INT AUTO_INCREMENT PRIMARY KEY,
  CandidateID       INT NOT NULL UNIQUE,
  TrainingStatus    ENUM('Ongoing', 'Completed', 'Cancelled') DEFAULT 'Ongoing',
  TrainingStartDate DATE NOT NULL,
  TrainingEndDate   DATE DEFAULT NULL,
  Insights          TEXT,
  FOREIGN KEY (CandidateID) REFERENCES candidate(CandidateID) ON DELETE CASCADE
);

-- ── 17. Employee Training Junction (Trainers Assigned) ────────
CREATE TABLE IF NOT EXISTS employeetraining (
  ID          INT AUTO_INCREMENT PRIMARY KEY,
  EmployeeID  INT NOT NULL,
  CandidateID INT NOT NULL,
  Feedback    TEXT,
  FOREIGN KEY (CandidateID) REFERENCES candidate(CandidateID) ON DELETE CASCADE
);

-- ── 18. Employee (Active Full-Time Staff) ─────────────────────
CREATE TABLE IF NOT EXISTS employee (
  EmployeeID    INT PRIMARY KEY,
  CandidateID   INT DEFAULT NULL,
  SalaryID      INT DEFAULT NULL,
  DesignationID INT DEFAULT NULL,
  ContractID    INT DEFAULT NULL,
  JoinDate      DATE NOT NULL,
  Performance   ENUM('Excellent', 'Good', 'Average', 'Poor') DEFAULT 'Good',
  PayscaleID    INT DEFAULT NULL,
  FOREIGN KEY (CandidateID)   REFERENCES candidate(CandidateID) ON DELETE SET NULL,
  FOREIGN KEY (SalaryID)      REFERENCES salary(SalaryID) ON DELETE SET NULL,
  FOREIGN KEY (DesignationID) REFERENCES designation(DesignationID) ON DELETE SET NULL,
  FOREIGN KEY (ContractID)    REFERENCES contract(ContractID) ON DELETE SET NULL,
  FOREIGN KEY (PayscaleID)    REFERENCES payscale(PayscaleID) ON DELETE SET NULL
);

-- ── 19. Employee Candidate Junction (History & Interviewers) ──
CREATE TABLE IF NOT EXISTS employeecandidate (
  ID          INT AUTO_INCREMENT PRIMARY KEY,
  EmployeeID  INT NOT NULL,
  CandidateID INT NOT NULL,
  FOREIGN KEY (EmployeeID) REFERENCES employee(EmployeeID) ON DELETE CASCADE,
  FOREIGN KEY (CandidateID) REFERENCES candidate(CandidateID) ON DELETE CASCADE
);

-- ── 20. Attendance (Daily Check-ins & Leaves) ─────────────────
CREATE TABLE IF NOT EXISTS attendance (
  AttendanceID INT PRIMARY KEY,
  EmployeeID   INT NOT NULL,
  Date         DATE NOT NULL,
  Status       ENUM('Present', 'Absent', 'Leave', 'Half-Day') DEFAULT 'Present',
  CheckIn      TIME DEFAULT NULL,
  CheckOut     TIME DEFAULT NULL,
  FOREIGN KEY (EmployeeID) REFERENCES employee(EmployeeID) ON DELETE CASCADE
);

-- ── 21. Complaint (Employee Grievance Portal) ─────────────────
CREATE TABLE IF NOT EXISTS complaint (
  ComplaintID       INT PRIMARY KEY,
  EmployeeID        INT NOT NULL,
  ComplaintDateTime DATETIME NOT NULL,
  Description       TEXT NOT NULL,
  ComplaintStatus   ENUM('Open', 'Under Review', 'Resolved', 'Closed') DEFAULT 'Open',
  Priority          ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
  FOREIGN KEY (EmployeeID) REFERENCES employee(EmployeeID) ON DELETE CASCADE
);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- BASE SEED DATA (Admin, Departments, Designations, Payscales)
-- ============================================================

-- Default HR Admin (Username: admin, Password: admin123)
INSERT INTO users (UserID, Username, PasswordHash, Role)
VALUES (1, 'admin', '$2a$10$mQpBVQESkwpQrFnqVgC1AeHzMdRXCPEJ4qLGqf.3r7cxbKAT3w.vy', 'hr')
ON DUPLICATE KEY UPDATE PasswordHash=VALUES(PasswordHash);

-- Departments
INSERT IGNORE INTO department (DeptID, DeptName, DeptVacancies, DeptPerformance, DeptNoOfEmployees) VALUES
(1, 'Engineering',     5, 'Good', 12),
(2, 'Marketing',       3, 'Good', 8),
(3, 'Sales',           4, 'Medium', 10),
(4, 'Human Resources', 2, 'Excellent', 6),
(5, 'Finance',         2, 'Good', 5);

-- Designations
INSERT IGNORE INTO designation (DesignationID, DeptID, Role, Vacancies, NoOfEmployees) VALUES
(1, 1, 'Software Developer',  3, 8),
(2, 1, 'Senior Engineer',     2, 4),
(3, 2, 'Marketing Lead',      1, 4),
(4, 3, 'Sales Manager',       2, 6),
(5, 4, 'HR Specialist',       1, 4),
(6, 5, 'Financial Analyst',   1, 3);

-- Payscales
INSERT IGNORE INTO payscale (PayscaleID, Grade, BaseSalary, HRA, DA, Others) VALUES
(1, 'Grade A (Executive)', 120000, 25000, 15000, 10000),
(2, 'Grade B (Senior)',     90000, 18000, 10000,  7000),
(3, 'Grade C (Mid-Level)',  65000, 13000,  7000,  5000),
(4, 'Grade D (Associate)',  45000,  9000,  5000,  3000),
(5, 'Grade E (Junior)',     32000,  6000,  3000,  2000);

-- Initial Salaries
INSERT IGNORE INTO salary (SalaryID, SalaryAmount, SalaryDate) VALUES
(1, 170000, '2026-03-01'),
(2, 125000, '2026-03-01'),
(3,  90000, '2026-03-01'),
(4,  62000, '2026-03-01'),
(5,  43000, '2026-03-01');

-- Initial Contracts
INSERT IGNORE INTO contract (ContractID, ContractDate, NoticePeriod) VALUES
(1, '2026-01-01', 30),
(2, '2026-01-01', 45),
(3, '2026-01-01', 60),
(4, '2026-01-01', 90),
(5, '2026-01-01', 30);
