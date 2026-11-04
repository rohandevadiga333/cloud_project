# Student Result Management System

A complete, professional **Student Result Management System** built for a Cloud Computing academic project.

## 🚀 Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | HTML5, CSS3, Bootstrap Icons, Chart.js |
| Backend  | Node.js 18+, Express.js |
| Database | PostgreSQL 15+ |
| Auth     | JWT (HTTP-only cookies) + bcrypt |
| PDF      | PDFKit |
| Cloud    | Microsoft Azure (see `/docs/azure-deployment.md`) |

---

## 📋 Prerequisites

- **Node.js** ≥ 18  
- **PostgreSQL** ≥ 15 (running locally)  
- **Git**

---

## ⚡ Quick Start

### 1. Clone / open in workspace

```bash
cd d:\MIT\PROJECTS\student-result-management
```

### 2. Set up the database

Open **pgAdmin** or run `psql` as the postgres user:

```sql
CREATE DATABASE student_result_db;
```

Then seed:

```bash
psql -U postgres -d student_result_db -f database/schema.sql
psql -U postgres -d student_result_db -f database/seed.sql
```

### 3. Configure the backend

```bash
cd backend
copy .env.example .env      # Windows
```

Edit `.env` and set your PostgreSQL password:

```env
DB_PASSWORD=your_postgres_password
```

### 4. Install dependencies

```bash
cd backend
npm install
```

### 5. Start the server

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 🔐 Demo Login Credentials

| Role    | ID / Username | Password    |
|---------|---------------|-------------|
| Admin   | `admin`       | `Admin@123` |
| Student | `STU2024001`  | `Student@123` |
| Student | `STU2024002`  | `Student@123` |
| Faculty | `FAC001`      | `Faculty@123` |
| Faculty | `FAC002`      | `Faculty@123` |

---

## 📁 Project Structure

```
student-result-management/
├── frontend/                 # Static HTML/CSS/JS (served by Express)
│   ├── login.html
│   ├── student-dashboard.html
│   ├── faculty-dashboard.html
│   ├── admin-dashboard.html
│   ├── css/style.css         # Design system
│   └── js/
│       ├── api.js            # Shared fetch helper + toast
│       ├── student.js
│       ├── faculty.js
│       └── admin.js
├── backend/
│   ├── app.js                # Express app
│   ├── server.js             # HTTP server entry point
│   ├── config/db.js          # PostgreSQL pool
│   ├── controllers/          # Business logic
│   ├── routes/               # API route definitions
│   ├── middleware/           # Auth, rate-limit, error-handler
│   ├── services/             # SGPA/CGPA, PDF generation
│   └── .env.example
├── database/
│   ├── schema.sql            # All 11 tables + triggers
│   ├── seed.sql              # Demo data
│   └── README.md
└── docs/
    ├── azure-deployment.md
    └── cloud-architecture.md
```

---

## 🌐 API Endpoints (summary)

| Method | Route | Role | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/login` | All | Login |
| POST | `/api/auth/logout` | All | Logout |
| GET  | `/api/auth/me` | All | Current user |
| GET  | `/api/student/dashboard` | Student | Dashboard data |
| GET  | `/api/student/results` | Student | All results |
| GET  | `/api/student/marksheet/:sem` | Student | PDF download |
| GET  | `/api/faculty/dashboard` | Faculty | Dashboard |
| POST | `/api/faculty/results` | Faculty | Enter marks |
| PUT  | `/api/faculty/results/:id` | Faculty | Update marks |
| PUT  | `/api/faculty/results/:id/publish` | Faculty | Publish |
| GET  | `/api/admin/dashboard` | Admin | System stats |
| POST | `/api/admin/students` | Admin | Create student |
| POST | `/api/admin/faculty` | Admin | Create faculty |
| POST | `/api/admin/subjects` | Admin | Create subject |
| POST | `/api/admin/assign-faculty` | Admin | Assign subject |

Full API documentation: [`docs/api-documentation.md`](docs/api-documentation.md)

---

## 🔒 Security Features

- bcrypt password hashing (cost 12)
- JWT in HTTP-only cookies (8h expiry)
- Role-based access control (admin / faculty / student)
- Rate limiting on login (10 req / 15 min)
- Parameterised SQL queries (no SQL injection)
- Helmet security headers
- Audit logging for all marks changes

---

## ☁️ Azure Deployment

See [`docs/azure-deployment.md`](docs/azure-deployment.md) for zero-cost Azure deployment using:

- **Azure App Service** (Free F1 tier – Node.js)
- **Azure Database for PostgreSQL – Flexible Server** (Burstable B1ms)
- **Azure Static Web Apps** (optional CDN for frontend)

---

## 📊 SGPA / CGPA Calculation

**SGPA** (per semester):

$$SGPA = \frac{\sum (Credits_i \times GradePoints_i)}{\sum Credits_i}$$

**CGPA** (cumulative across all published semesters):

$$CGPA = \frac{\sum_{all\ semesters} (Credits_i \times GradePoints_i)}{\sum_{all\ semesters} Credits_i}$$

---

## ⚠️ Important Notes

- **No public registration** – admin creates all accounts.
- Students only see **published** results.
- Faculty can only modify **draft** results.
- Published result corrections require admin and are **audit-logged**.
- Generated PDFs contain **"DEMO – NOT AN OFFICIAL ACADEMIC RECORD"** watermark.
