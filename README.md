# 🚀 HR Recruitment & Management System

A comprehensive full-stack Human Resource management platform designed to automate the recruitment lifecycle, payroll, attendance, and organizational governance. Backed by a normalized **MySQL** relational database and built for **Zero-Cost AWS EC2 & S3 Deployment**.

---

## 📂 Project Overview
The **HR Recruitment & Management System** digitizes the entire journey of talent—from their initial application and resume ingestion to active employee payroll and internal grievances.

### Core Lifecycle Flow:
1. **Application**: Job seekers submit credentials and upload resumes (stored via AWS S3 / Cloud Storage).
2. **Screening**: HR reviews talent dossiers and qualifies applicants into Candidates.
3. **Interviewing**: HR schedules interviews and records outcomes (Pass/Fail) with assigned employee interviewers.
4. **Offer Generation**: Creating formal salary offers linked to contract notice periods.
5. **Training**: Tracking orientation milestones with assigned employee mentors.
6. **Employment**: Converting successful trainees into active Employees with dynamic payroll and grievance tracking.

---

## ✨ Key Features
- **Recruitment Funnel**: Visual tracking of applicants through Screening, Interview, Offer, and Training stages.
- **Dynamic Payroll**: Generate monthly salary slips based on Payscale grades, HRA, DA, and allowances.
- **Org Management**: Department hierarchy and role definitions with live vacancy and headcount tracking.
- **SQL Analytics**: Live multi-table relational JOINs, aggregations, and subquery filters.
- **Employee Self-Service**: Dedicated portal for employees to view payslips, check attendance logs, and log grievances.
- **Cloud Resume Storage**: AWS S3 integration with IAM Role support and local disk fallback.
- **Enterprise Security**: Role-based access control (RBAC), bcrypt password hashing, JWT authentication, helmet headers, and rate limiting.

---

## 🛠️ Technology Stack
- **Frontend**: React.js, React Router v6, Axios, React Hot Toast.
- **Backend**: Node.js, Express.js, JWT, Helmet, Express Rate Limit, Multer, AWS SDK v3.
- **Database**: MySQL 8.0+ (20-table normalized relational schema with constraints).
- **Cloud & Deployment**: AWS EC2 (Free Tier `t2.micro`/`t3.micro`), AWS S3, AWS IAM Role, Nginx, PM2.

---

## 🚀 Getting Started Locally

### 1. Database Setup
1. Open MySQL and create a database:
   ```sql
   CREATE DATABASE hr_recruitment_db;
   ```
2. Import the canonical schema:
   ```bash
   mysql -u root -p hr_recruitment_db < database/schema.sql
   ```
3. Populate demo data with complete lifecycle records:
   ```bash
   cd backend
   node seeder.js
   ```

### 2. Backend Setup
1. In `backend/`, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Update your MySQL credentials (`DB_USER`, `DB_PASSWORD`).
3. Start the API server:
   ```bash
   npm install
   npm start
   ```

### 3. Frontend Setup
1. In `frontend/`:
   ```bash
   npm install
   npm start
   ```
2. Open `http://localhost:3000` in your browser.

---

## 🔑 Default Demo Credentials

| Role | Username | Password | Dashboard Access |
| :--- | :--- | :--- | :--- |
| **HR Administrator** | `admin` | `admin123` | Full HR Console (`/hr`) & Analytics |
| **Active Employee** | `eva` | `user123` | Employee Self-Service Portal (`/employee`) |

---

## ☁️ Zero-Cost AWS EC2 Deployment

Follow our student-friendly deployment guide in **[`docs/AWS_DEPLOYMENT_GUIDE.md`](docs/AWS_DEPLOYMENT_GUIDE.md)** to deploy the full stack on AWS Free Tier:
1. Launch an Ubuntu `t2.micro` or `t3.micro` EC2 instance with an IAM Role attached for S3.
2. Clone this repository on EC2.
3. Run the one-click provisioning script:
   ```bash
   chmod +x setup_ec2.sh
   ./setup_ec2.sh
   ```

---

## 📝 License
Developed for educational purposes in Relational Database Management Systems and Cloud Computing.
