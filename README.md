# 🚀 HR Recruitment & Management System

A comprehensive full-stack Human Resource management platform designed to automate the recruitment lifecycle and organize organizational data. This system bridges the gap between manual job applications and complex enterprise HR suites.

---

## 📂 Project Overview
The **HR Recruitment & Management System** digitizes the entire journey of a talent—from their initial application to their management as an active employee. It features a robust **React** frontend for HR managers and a high-performance **Node.js/Express** backend backed by a relational **MySQL** database.

### Core Lifecycle Flow:
1.  **Application**: New job seekers submit their details and resumes.
2.  **Screening**: HR reviews applications and "Qualifies" them to become Candidates.
3.  **Interviewing**: Scheduling and tracking interview outcomes (Pass/Fail).
4.  **Hiring**: Generating salary offers and contract templates.
5.  **Training**: Managing orientation and training progress for new hires.
6.  **Employment**: Converting successful trainees into full-time employees with automated payroll and complaint tracking.

---

## 🖼️ Animated Preview
<p align="center">
  <video src="screenshots/hr_demo.mp4" width="100%" autoplay loop muted></video>
</p>

---

## ✨ Features
- **Recruitment Funnel**: Visual tracking of applicants through Screening, Interview, and Offer stages.
- **Dynamic Payroll**: Generate monthly salary bills based on Payscale grades and performance.
- **Org Management**: Hierarchical view of Departments and Designations with live vacancy tracking.
- **Training Module**: Track training progress and assign senior employees as trainers.
- **Complaint System**: Employee grievance portal with priority and status management.
- **Live Search & Analytics**: Instant filtering of salaries, candidates, and organizational metrics.
- **Modern UI**: Polished, dark-themed dashboard built for high usability.

---

## 🛠️ Technology Stack
- **Frontend**: React.js (Vite), Axios, React Hot Toast (Notifications), Lucide Icons.
- **Backend**: Node.js, Express.js, JWT (Authentication), MySQL2/Promise.
- **Database**: MySQL 8.0+ (Relational Schema with constraints).
- **Styling**: Vanilla CSS (Modern CSS variables, Flexbox/Grid).

---

## 📊 Database Schema Explanation
The system relies on a normalized relational schema to ensure strict data integrity.

### Key Entities:
- **`application`**: Master record of everyone who applies.
- **`candidate`**: High-potential applicants who have cleared initial screening.
- **`employee`**: Finalized hires linked to their original application via an `EmployeeID`.
- **`department` & `designation`**: Define the organizational hierarchy and vacancies.
- **`salary` & `payscale`**: Manage pay grades, monthly amounts, and structure history.
- **`training`**: Tracks the orientation phase of candidates who accepted offers.
- **`employeecandidate`**: A many-to-many junction table used for linking interviewers and trainers to recruits.

---

## 🚀 Getting Started

### 1. Database Setup
1.  Install MySQL and create a database named `hr_recruitment_db`.
2.  Run the script located in `database/create_db.sql` to initialize the tables.
3.  (Optional) Run `node backend/seeder.js` to populate the system with professional demo data.

### 2. Backend Config
1.  Navigate to `backend/`.
2.  Create a `.env` file from the `.env.example`.
3.  Update your `DB_USER`, `DB_PASSWORD`, and `DB_NAME`.
4.  Run `npm install` and then `npm start`.

### 3. Frontend Config
1.  Navigate to `frontend/`.
2.  Run `npm install`.
3.  Run `npm run dev` to launch the dashboard.

---

## 📂 Directory Structure
- `backend/`: Node.js API, controllers, and database configuration.
- `frontend/`: React source code, components, and styling.
- `database/`: SQL scripts for schema initialization.
- `docs/`: Supplementary documentation and report content.

---

## 📝 License
This project is developed for educational purposes in HR Management and Database Systems.
