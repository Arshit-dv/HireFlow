# 🏛️ Comprehensive AWS Cloud Architecture & Commands Reference
## HR Recruitment & Management System

This document serves as your **technical reference handbook** for semester evaluation, teacher viva, and server management. It explains how each AWS service works, how they integrate securely, and provides a cheat sheet of all essential commands.

---

## 1. 🏗️ Complete Cloud Architecture Diagram

```
                                  INTERNET
                                      │
                                      ▼ [Traffic on Port 80 / 443]
                        ┌───────────────────────────────┐
                        │   AWS Security Group          │
                        │   (Inbound: 22 SSH, 80 HTTP)  │
                        └──────────────┬────────────────┘
                                       │
                                       ▼
                        ┌───────────────────────────────┐
                        │     AWS EC2 Instance          │
                        │   (Ubuntu 24.04 LTS)          │
                        │                               │
                        │  ┌─────────────────────────┐  │
                        │  │      Nginx (Port 80)    │  │ ──► Serves React SPA (/home/ubuntu/app/frontend/build)
                        │  └───────────┬─────────────┘  │
                        │              │ (Reverse Proxy)│
                        │  ┌───────────▼─────────────┐  │
                        │  │  Node.js API (Port 5000)│  │ ──► Managed by PM2 Cluster (/backend)
                        │  └─────┬─────────────┬─────┘  │
                        │        │             │        │
                        │        ▼             │        │
                        │    MySQL Server      │        │
                        │ (hr_recruitment_db)  │        │
                        │  20 Relational Tables│        │
                        └──────────────────────┼────────┘
                                               │
                                               │ AWS SDK v3 (@aws-sdk/client-s3)
                                               │ Authenticated via IAM Instance Profile (Zero hardcoded keys!)
                                               ▼
                                ┌───────────────────────────────┐
                                │     AWS S3 Bucket             │
                                │   (hr-proj-resume)            │
                                │   Region: ap-south-1 (Mumbai) │
                                │   Stores candidate PDFs/DOCXs │
                                └───────────────────────────────┘
```

---

## 2. 🧩 Breakdown of AWS Services Used

### 1. Amazon EC2 (Elastic Compute Cloud)
* **Instance Name**: `hr-system-server`
* **Instance Type**: `t2.micro` or `t3.micro` (1 vCPU, 1 GB RAM, Free-Tier eligible).
* **Role in System**: Serves as the central computing server hosting our:
  1. **Nginx Web Server** (acts as frontend host and reverse proxy).
  2. **Node.js Express Backend** (REST API engine running under PM2).
  3. **MySQL 8.0 Database** (stores normalized relational data across 20 tables).
* **Key Engineering Optimization**: We configured **2GB of Linux Swap Memory** via `/swapfile`. This prevents the 1GB RAM on `t2.micro` from running out of memory during frontend builds or concurrent database queries.

---

### 2. Amazon S3 (Simple Storage Service)
* **Bucket Name**: `hr-proj-resume`
* **Region**: `ap-south-1` (Asia Pacific - Mumbai)
* **Role in System**: Dedicated, high-durability cloud object storage for candidate resumes, CVs, and documents.
* **Why S3 instead of local disk?**
  * **Statelessness**: Real-world cloud servers are disposable/ephemeral. If EC2 scales up or restarts, local files would be lost. S3 decouples user asset storage from the compute instance.
  * **Scalability & Durability**: Provides 99.999999999% (11 9's) data durability.

---

### 3. AWS IAM (Identity and Access Management)
* **Role Name**: `hr-ec2-s3-role` (with `AmazonS3FullAccess` policy).
* **Attachment**: Attached as an **IAM Instance Profile** to `hr-system-server`.
* **How Integration Works (The Cloud Security Standard)**:
  * We **never** hardcode `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` in code or `.env` files.
  * When `@aws-sdk/client-s3` in `backend/config/s3.js` runs on EC2, it queries the AWS EC2 Instance Metadata Service (`http://169.254.169.254/latest/meta-data/iam/security-credentials/`) and automatically retrieves short-lived, rotatable STS security tokens.
  * **Result**: Complete defense against credential leakage.

---

### 4. AWS Security Groups (Virtual Stateful Firewall)
* **Role in System**: Controls incoming and outgoing network traffic at the virtual network interface level.
* **Configured Rules**:
  * **Port 22 (SSH)**: Allows secure terminal management from your computer.
  * **Port 80 (HTTP)**: Allows public web browser traffic to load the React app and REST API.
  * **Port 443 (HTTPS)**: Prepared for SSL/TLS encrypted traffic.

---

### 5. Amazon EBS (Elastic Block Store)
* **Storage Type**: **20 GB gp3** General Purpose SSD.
* **Role in System**: Persistent root volume holding the Ubuntu OS, MySQL database tables, Node.js code, and system packages.
* **Persistence**: Data on EBS persists across instance **Stop** and **Start** operations.

---

## 3. 🔄 End-to-End Data Flow

### A. Candidate Submits Application (S3 Upload Flow)
1. User visits `http://<EC2-IP>/apply`, fills the form, attaches `resume.pdf`, and clicks **Submit**.
2. **Nginx** forwards the `multipart/form-data` request to Node.js on port 5000.
3. Node.js backend intercepts the file with `multer` into memory buffer.
4. AWS SDK streams the buffer directly to `s3://hr-proj-resume/resumes/timestamp-resume.pdf`.
5. MySQL records the S3 public URL in `application (ResumeUrl)`.

### B. HR Evaluates Application & Analytics Flow
1. HR logs in (`admin`/`admin123`) $\rightarrow$ JWT token issued and stored in browser localStorage.
2. HR visits **SQL Analytics** page:
   * Node.js executes a **4-table relational JOIN** query across `employee`, `designation`, `department`, and `application`.
   * Node.js executes statistical aggregations (`SUM`, `AVG`, `MAX`, `MIN`) across payroll structures.
3. HR opens applicant dossier $\rightarrow$ clicks **Open Uploaded Resume** $\rightarrow$ browser securely streams the PDF from S3.

---

## 4. ⚡ Essential Commands Cheat Sheet

### 🖥️ Connecting & Navigating on EC2
```bash
# Connect from laptop PowerShell / Terminal
ssh -i "C:\path\to\hr-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>

# Navigate to project folder
cd /home/ubuntu/app
```

---

### ⚙️ PM2 Backend Management (Process Manager)
```bash
# Check status, CPU, and RAM usage of backend
pm2 status

# View live backend logs in real-time
pm2 logs hr-backend-api

# Restart backend process
pm2 restart hr-backend-api

# Stop backend process
pm2 stop hr-backend-api
```

---

### 🌐 Nginx Web Server Commands
```bash
# Test Nginx configuration for syntax errors
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx

# View live Nginx access and error logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

### 🗄️ MySQL Database Management
```bash
# Open MySQL terminal as root
sudo mysql

# Open MySQL terminal as application user (hr_user)
mysql -u hr_user -p"hr_db_secure_pass_2026" hr_recruitment_db

# Useful SQL queries inside MySQL:
SHOW TABLES;
SELECT * FROM users;
SELECT * FROM application;
SELECT * FROM employee;
SELECT COUNT(*) FROM department;

# Re-run Database Seeder (resets all demo data to clean lifecycle)
cd /home/ubuntu/app/backend
node seeder.js
```

---

### 🔍 System Health & S3 Verification
```bash
# Check backend API health endpoint
curl http://localhost:5000/api/health

# Check server RAM and Swap memory usage
free -h

# Check disk space usage
df -h
```

---

## 5. 👨‍🏫 Teacher Viva & Evaluation Q&A Cheat Sheet

### Q1: What architecture does your project use?
> **Answer**: *"We use a decoupled full-stack cloud architecture. The React frontend is compiled to production static assets served via Nginx. Nginx reverse proxies `/api` requests to an Express Node.js REST API running under PM2. The backend connects to a normalized MySQL 8.0 relational database (20 tables) and streams document uploads to an AWS S3 bucket."*

---

### Q2: How do you handle AWS security and credentials?
> **Answer**: *"We adhere strictly to AWS security best practices by never storing AWS Secret Access Keys in our codebase or `.env` files. Instead, our EC2 instance is attached to an IAM Instance Profile (`hr-ec2-s3-role`). The AWS SDK v3 automatically fetches temporary credentials from the EC2 instance metadata service."*

---

### Q3: Why did you choose AWS S3 instead of saving files on the EC2 hard drive?
> **Answer**: *"In enterprise cloud computing, compute servers are stateless and scalable. Saving files locally couples storage to compute. Storing resumes in S3 ensures 99.999999999% durability, unlimited scalability, and allows our compute instances to be restarted, replaced, or load-balanced without data loss."*

---

### Q4: How did you ensure this project stays 100% Free-Tier ($0.00 cost)?
> **Answer**: *"We used a `t2.micro`/`t3.micro` EC2 instance (within 750 free hours/month), 20GB gp3 EBS storage (under the 30GB limit), AWS S3 standard storage (under 5GB limit), and IAM roles which are completely free. We avoided paid services like ALBs, NAT Gateways, or separate Multi-AZ RDS instances by running MySQL on EC2 with 2GB swap memory optimization."*

---

### Q5: What database concepts are demonstrated?
> **Answer**: *"The system demonstrates strict relational integrity across 20 normalized tables with primary/foreign keys (`ON DELETE CASCADE` / `SET NULL`), transactions (`conn.beginTransaction()`), complex 4-table JOINs, subqueries, and statistical aggregations (`SUM`, `AVG`, `MAX`, `MIN`)."*
