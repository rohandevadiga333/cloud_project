# Database – Student Result Management System

## PostgreSQL Setup

### 1. Create the Database

```sql
CREATE DATABASE student_result_db;
```

### 2. Run the Schema

```bash
psql -U postgres -d student_result_db -f schema.sql
```

### 3. Seed Demo Data

```bash
psql -U postgres -d student_result_db -f seed.sql
```

### 4. Verify

```sql
SELECT * FROM admins;
SELECT * FROM students LIMIT 5;
SELECT * FROM results LIMIT 5;
```

---

## Demo Credentials

| Role    | Login ID   | Password     |
|---------|------------|--------------|
| Admin   | admin      | Admin@123    |
| Student | STU2024001 | Student@123  |
| Student | STU2024002 | Student@123  |
| Student | STU2024003 | Student@123  |
| Faculty | FAC001     | Faculty@123  |
| Faculty | FAC002     | Faculty@123  |
| Faculty | FAC003     | Faculty@123  |

> ⚠️ **Change all passwords before any real deployment.**

---

## Table Summary

| Table            | Purpose                                    |
|------------------|--------------------------------------------|
| admins           | Admin accounts                             |
| departments      | Academic departments                       |
| faculty          | Faculty accounts + dept link               |
| students         | Student accounts + academic info           |
| academic_years   | e.g. 2024-25                               |
| semesters        | Per-academic-year semester definitions     |
| subjects         | Subject catalog with credits + max marks   |
| faculty_subjects | Faculty ↔ Subject assignment per year      |
| grading_scales   | Configurable grade → grade-point mapping   |
| results          | Marks per student/subject/year (w/ status) |
| audit_logs       | All marks changes with old/new JSONB       |

---

## Azure PostgreSQL Migration

When deploying to **Azure Database for PostgreSQL – Flexible Server**:

1. Update `.env`:
   ```
   DB_HOST=your-server.postgres.database.azure.com
   DB_PORT=5432
   DB_NAME=student_result_db
   DB_USER=your_azure_user
   DB_PASSWORD=your_azure_password
   DB_SSL=true
   ```

2. Run schema and seed via Azure Cloud Shell or `psql` with the Azure hostname.

3. The application code **does not need any changes** — it reads all connection
   parameters from environment variables.
