# Azure Deployment Guide – Student Result Management System

> **⚠️ Zero-Cost Requirement Notice**  
> This guide only uses Azure services with a verified free or near-zero-cost tier.  
> The **Azure for Students** subscription ($100 credit) is used as a fallback.  
> No paid upgrades are performed. Services are stopped when not in use during development.

---

## Recommended Zero-Cost Architecture

| Component | Azure Service | Tier | Monthly Cost |
|-----------|--------------|------|--------------|
| Node.js Backend | **Azure App Service** | Free F1 (60 CPU min/day) | **$0** |
| PostgreSQL Database | **Azure Database for PostgreSQL – Flexible Server** | Burstable B1ms (~$13/mo from credit) | **From student credit** |
| Frontend (static) | Served by App Service | Included | **$0** |
| Secrets | **Azure App Service Environment Variables** | Built-in | **$0** |

> **Azure for Students note**: The $100 credit covers ~7 months of a B1ms PostgreSQL instance.  
> The free F1 App Service plan is always free (no credit consumed).

---

## Step-by-Step Deployment

### Prerequisites
- Azure Student account activated at [azure.microsoft.com/free/students](https://azure.microsoft.com/en-us/free/students/)
- Azure CLI installed: `winget install Microsoft.AzureCLI`
- Node.js 18+ installed
- Git installed

---

### Step 1: Login to Azure

```bash
az login
az account show   # Confirm subscription
```

---

### Step 2: Create Resource Group

```bash
az group create \
  --name srms-resource-group \
  --location eastus
```

---

### Step 3: Create Azure PostgreSQL – Flexible Server

```bash
az postgres flexible-server create \
  --name srms-db-server \
  --resource-group srms-resource-group \
  --location eastus \
  --admin-user srmsadmin \
  --admin-password "YourSecureP@ss123" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15 \
  --yes
```

Create the database:

```bash
az postgres flexible-server db create \
  --resource-group srms-resource-group \
  --server-name srms-db-server \
  --database-name student_result_db
```

Allow connections from App Service:

```bash
az postgres flexible-server firewall-rule create \
  --resource-group srms-resource-group \
  --name srms-db-server \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

---

### Step 4: Run Schema & Seed on Azure DB

```bash
# From your local machine (or Azure Cloud Shell)
psql "host=srms-db-server.postgres.database.azure.com port=5432 dbname=student_result_db user=srmsadmin sslmode=require" \
  -f database/schema.sql

psql "host=srms-db-server.postgres.database.azure.com port=5432 dbname=student_result_db user=srmsadmin sslmode=require" \
  -f database/seed.sql
```

---

### Step 5: Create App Service (Free F1 Tier)

```bash
# Create App Service Plan (Free F1)
az appservice plan create \
  --name srms-app-plan \
  --resource-group srms-resource-group \
  --sku F1 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group srms-resource-group \
  --plan srms-app-plan \
  --name srms-webapp \
  --runtime "NODE:18-lts"
```

---

### Step 6: Configure Environment Variables on App Service

```bash
az webapp config appsettings set \
  --resource-group srms-resource-group \
  --name srms-webapp \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    DB_HOST=srms-db-server.postgres.database.azure.com \
    DB_PORT=5432 \
    DB_NAME=student_result_db \
    DB_USER=srmsadmin \
    DB_PASSWORD="YourSecureP@ss123" \
    DB_SSL=true \
    JWT_SECRET="your-very-long-random-jwt-secret-here" \
    COLLEGE_NAME="Your Institution Name"
```

---

### Step 7: Deploy via Git

```bash
# Set deployment user
az webapp deployment user set \
  --user-name srmsdeployuser \
  --password "DeployP@ss123"

# Get Git remote URL
az webapp deployment source config-local-git \
  --name srms-webapp \
  --resource-group srms-resource-group

# Push code
git remote add azure <URL from above>
git push azure main
```

---

### Step 8: Configure Startup Command

```bash
az webapp config set \
  --resource-group srms-resource-group \
  --name srms-webapp \
  --startup-file "cd backend && node server.js"
```

---

### Step 9: Verify

Open: `https://srms-webapp.azurewebsites.net`

---

## Cost Monitoring

- Set spending alerts in Azure Cost Management.
- Stop the PostgreSQL server when not in use:

```bash
az postgres flexible-server stop \
  --resource-group srms-resource-group \
  --name srms-db-server
```

---

## Free Tier Limitations (F1 App Service)

| Limitation | Value |
|------------|-------|
| CPU per day | 60 minutes |
| Memory | 1 GB |
| Storage | 1 GB |
| Custom domain | Not supported |
| HTTPS | Provided via `.azurewebsites.net` |
| Always On | Not supported |

> For a demo / academic project presentation, F1 is perfectly sufficient.  
> The app will sleep after inactivity (cold starts ~30s).

---

## HTTPS

Azure App Service automatically provides HTTPS on the  
`*.azurewebsites.net` subdomain at no extra cost.

---

## Security Checklist Before Deployment

- [ ] Change all demo passwords in `seed.sql`
- [ ] Set a strong `JWT_SECRET` (min 64 chars, random)
- [ ] Enable SSL for PostgreSQL (`DB_SSL=true`)
- [ ] Restrict PostgreSQL firewall to App Service only
- [ ] Enable Azure Defender for PostgreSQL (free tier)
- [ ] Review Helmet CSP headers in `app.js`
