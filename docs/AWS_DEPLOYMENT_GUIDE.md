# 🎓 AWS Cloud Deployment & Teacher Presentation Guide
## HR Recruitment & Management System (100% Free-Tier Architecture)

This guide walks you through deploying your full-stack project to **AWS EC2** with **AWS S3** and **IAM Role** integration without incurring any charges (**$0.00 Cost Guarantee**).

---

## 🏛️ System Architecture

```
                            INTERNET
                               │
                               ▼
                        ┌─────────────┐
                        │  AWS EC2    │ (Free Tier: t2.micro / t3.micro)
                        │             │
                        │ Nginx (80)  │ ──► Serves React Production Build
                        │ Backend API │ ──► Node.js / Express (PM2 on :5000)
                        │ MySQL DB    │ ──► Relational Schema (20 Tables)
                        └──────┬──────┘
                               │
                               │ AWS SDK v3 (IAM Instance Profile)
                               ▼
                        ┌─────────────┐
                        │   AWS S3    │ (Free Tier: 5GB Standard Storage)
                        │   Bucket    │ ──► Candidate Resumes / CV Uploads
                        └─────────────┘
```

---

## 💰 1. Free-Tier Rules & Zero-Cost Checklist

| Service | Free Tier Allocation | How We Use It Safely |
| :--- | :--- | :--- |
| **EC2** | 750 hours/month | 1 instance of `t2.micro` or `t3.micro` (runs 24/7 for free) |
| **EBS Storage**| Up to 30 GB | Set volume to **20 GB gp3** |
| **S3 Storage** | 5 GB standard storage | Resume PDF uploads |
| **IAM** | 100% Free | Roles and instance profiles have no cost |
| **MySQL** | Inside EC2 | Running MySQL on EC2 avoids separate billable RDS instances |

> [!CAUTION]
> **Services to AVOID:** Do NOT create Application Load Balancers (ALBs), NAT Gateways, or Multi-AZ RDS databases, as they are billable.

---

## 🚀 2. Step-by-Step AWS Setup

### Step A: Create an S3 Bucket for Resumes
1. Open the [AWS Management Console](https://console.aws.amazon.com/) and navigate to **S3**.
2. Click **Create bucket**.
3. **Bucket name**: Choose a globally unique name (e.g., `hr-resumes-yourname-2026`).
4. **AWS Region**: Select `us-east-1` (N. Virginia) or your closest region.
5. Leave **Block all public access** enabled (our backend accesses it securely via IAM).
6. Click **Create bucket**.

---

### Step B: Create an IAM Role for EC2
*(This allows EC2 to talk to S3 without saving secret keys in your code!)*
1. Navigate to **IAM** $\rightarrow$ **Roles** $\rightarrow$ **Create role**.
2. **Trusted entity type**: Select **AWS service** $\rightarrow$ Common use case: **EC2**. Click **Next**.
3. **Add permissions**: Search for `AmazonS3FullAccess` and select the checkbox. Click **Next**.
4. **Role name**: Name it `EC2-HR-S3-Role`.
5. Click **Create role**.

---

### Step C: Launch the Free-Tier EC2 Instance
1. Navigate to **EC2** $\rightarrow$ **Launch Instance**.
2. **Name**: `HR-System-Server`.
3. **AMI**: **Ubuntu Server 22.04 LTS (HVM)** or **24.04 LTS**, SSD Volume Type (64-bit x86).
4. **Instance Type**: `t2.micro` or `t3.micro` (*Free tier eligible*).
5. **Key pair**: Select or create a new key pair (e.g. `hr-key.pem`) and download it to your laptop.
6. **Network / Security Group**:
   * ✅ **Allow SSH traffic from**: `My IP` (Port 22).
   * ✅ **Allow HTTP traffic from the internet** (Port 80).
   * ✅ **Allow HTTPS traffic from the internet** (Port 443).
7. **Storage**: Configure **20 GiB** gp3.
8. **Advanced details** $\rightarrow$ **IAM instance profile**: Select `EC2-HR-S3-Role`.
9. Click **Launch Instance**.

---

## 💻 3. Deploying Your Project to EC2

### 1. Connect via SSH
Open your terminal (PowerShell or Mac/Linux Terminal) where your `.pem` key is located:
```bash
# On Mac/Linux: chmod 400 hr-key.pem
ssh -i hr-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```

### 2. Clone Your Code Repository
```bash
git clone https://github.com/YourUsername/HR-Recruitment-and-managment.git app
cd app
```

### 3. Run the Automated Setup Script
```bash
chmod +x setup_ec2.sh
./setup_ec2.sh
```

The script will automatically:
* Setup 2GB Swap memory (preventing memory issues on `t2.micro`).
* Install Node.js, Nginx, MySQL, and PM2.
* Initialize the database schema and professional seed data.
* Build the React frontend bundle.
* Configure Nginx reverse proxy and firewall.

---

## 👨‍🏫 4. How to Present This to Your Teacher (Demo Script)

### 🌟 Key Points to Highlight During Evaluation:

1. **Live Cloud Access**:
   * Open your browser and go to `http://<YOUR_EC2_PUBLIC_IP>`.
   * Show that the application is running live on AWS cloud infrastructure.

2. **Demonstrate Role-Based Access Control (RBAC)**:
   * **HR Admin Demo**: Log in with `admin` / `admin123` $\rightarrow$ Show the HR Dashboard, Pipeline Funnel, and SQL Analytics page.
   * **Employee Portal Demo**: Log in with `eva` / `user123` $\rightarrow$ Show the personalized Employee Self-Service portal, salary payslip generation, and grievance ticketing.

3. **Demonstrate Relational DBMS Integrity**:
   * Go to **Applications** $\rightarrow$ **+ Create Application** or public `/apply`.
   * Upload a candidate resume (stores in S3 / local storage).
   * Go to **Screening** $\rightarrow$ Screen candidate $\rightarrow$ Schedule **Interview** $\rightarrow$ Mark **Passed** $\rightarrow$ Generate & Award **Offer Letter** $\rightarrow$ Start & Complete **Training** $\rightarrow$ Convert to **Employee**.
   * Show that data flows consistently through foreign keys across all 20 relational tables.

4. **Demonstrate Advanced SQL & Analytics**:
   * Navigate to **SQL Analytics** in the sidebar.
   * Explain the 3 query types:
     1. **4-Table Relational JOIN** (`employee` + `designation` + `department` + `application`).
     2. **Statistical Aggregations** (`SUM`, `AVG`, `MAX`, `MIN` for department payroll).
     3. **Subquery Filtering** (Querying candidates who passed but have not yet converted).

5. **Demonstrate AWS Cloud Security**:
   * Open AWS EC2 Console and show the **IAM Instance Profile** attached to your instance.
   * Point out: *"We follow AWS security best practices by never storing AWS Secret Keys in code or environment variables; instead, our EC2 instance assumes an IAM Role."*

---

## 🛑 5. Teardown / Cleanup (When Semester Ends)

To ensure you never get billed after the assignment is graded:
1. In the EC2 Console, select your instance $\rightarrow$ **Instance state** $\rightarrow$ **Terminate instance**.
2. In the S3 Console, empty and delete your resume bucket.
3. In the IAM Console, delete the `EC2-HR-S3-Role`.
