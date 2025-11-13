# Multi-Device Development Setup Guide

## Overview

This guide covers setting up both your **PC** and **Laptop** to seamlessly work on:
- Your businesses: **Carolina Lumpers Service** & **House Renovators**
- Client projects: **Kredit-Ya** and future clients
- Cloud infrastructure: **AWS** and **Google Cloud Platform**
- Version control: **GitHub** (GarayInvestments organization)

---

## 🎯 Goals

✅ Work from either device with no friction  
✅ Keep credentials secure (not synced via Git)  
✅ Consistent development environment  
✅ Easy onboarding for future projects  
✅ Scalable for multi-client deployments

---

## 📁 Repository Structure

### Your GitHub Organization: GarayInvestments

```
GarayInvestments/
├── carolina-lumpers-web          # CLS business system
├── HouseRenoAI                   # House Renovators system
├── client-kredit-ya              # Future: Kredit-Ya client project
├── client-[name]                 # Future: Additional client projects
└── aws-infrastructure-shared     # Future: Shared CDK patterns
```

### Each Repo Contains:
```
project-repo/
├── frontend/                     # Static site or React app
├── backend/                      # Lambda, Apps Script, or API code
├── aws-infrastructure/           # CDK project for AWS resources
├── GoogleAppsScripts/           # Apps Script projects (if applicable)
├── .github/
│   ├── copilot-instructions.md  # Project-specific AI guidance
│   └── workflows/               # CI/CD pipelines
└── docs/                        # Project documentation
```

---

## 🖥️ Initial Setup (One-Time Per Device)

### **Step 1: Install Core Tools**

Run these on **both PC and Laptop**:

#### **Windows Package Manager Tools**
```powershell
# Git
winget install Git.Git

# Node.js (includes npm)
winget install OpenJS.NodeJS.LTS

# VS Code
winget install Microsoft.VisualStudioCode

# AWS CLI
winget install Amazon.AWSCLI

# Python (for local servers, clasp)
winget install Python.Python.3.12

# Optional: PowerShell 7
winget install Microsoft.PowerShell
```

#### **Global NPM Packages**
```powershell
# AWS CDK
npm install -g aws-cdk

# Google Apps Script CLI
npm install -g @google/clasp

# TypeScript (for CDK)
npm install -g typescript
```

#### **Google Cloud SDK** (for GCP deployments)
Download from: https://cloud.google.com/sdk/docs/install

---

### **Step 2: Configure Git**

#### **Global Git Config**
```powershell
# Set your identity
git config --global user.name "Steve Garay"
git config --global user.email "your-email@garayinvestments.com"

# Enable credential helper (saves GitHub tokens)
git config --global credential.helper manager

# Set default branch name
git config --global init.defaultBranch main

# Enable helpful features
git config --global pull.rebase false
git config --global core.autocrlf true  # Windows line endings
```

#### **GitHub Authentication**

**Option A: HTTPS with Personal Access Token (Recommended)**

1. Go to: https://github.com/settings/tokens
2. Generate new token (classic)
3. Scopes: `repo`, `workflow`, `admin:org`
4. Copy token
5. First `git push` will prompt for credentials:
   - Username: `GarayInvestments` (or your username)
   - Password: Paste the token

**Option B: SSH Keys (More Secure)**
```powershell
# Generate SSH key
ssh-keygen -t ed25519 -C "your-email@garayinvestments.com"

# Add to GitHub: Settings → SSH and GPG keys → New SSH key
# Copy public key:
Get-Content ~/.ssh/id_ed25519.pub | Set-Clipboard

# Test connection
ssh -T git@github.com
```

---

### **Step 3: Configure AWS CLI**

#### **Get Your AWS Credentials**

1. AWS Console → IAM → Users → `steve-admin`
2. Security Credentials → Access Keys → Create Access Key
3. Use case: "CLI"
4. Download or copy: Access Key ID + Secret Access Key

#### **Configure AWS on Both Devices**
```powershell
aws configure

# Prompts:
# AWS Access Key ID: [paste your key]
# AWS Secret Access Key: [paste your secret]
# Default region: us-east-1
# Default output format: json
```

#### **Verify AWS Access**
```powershell
aws sts get-caller-identity
# Should show:
# Account: 420660210455
# User: steve-admin
```

#### **Optional: Multiple AWS Profiles**

For future client AWS accounts:

```powershell
# Default profile (your development account)
aws configure --profile default

# CLS production (future)
aws configure --profile cls-prod

# Client accounts (future)
aws configure --profile kredity-client
```

**Use profiles:**
```powershell
aws s3 ls --profile cls-prod
cdk deploy --profile kredity-client
```

---

### **Step 4: Configure Google Cloud**

#### **Install gcloud CLI** (if not already installed)
https://cloud.google.com/sdk/docs/install

#### **Authenticate**
```powershell
gcloud auth login
# Opens browser → Sign in with: s.garay@carolinalumpers.com

# Set default project
gcloud config set project cls-operations-hub

# Verify
gcloud config list
```

---

### **Step 5: Configure Google Apps Script**

#### **Login to clasp**
```powershell
clasp login
# Opens browser → Authorize with Google account
```

#### **Test**
```powershell
cd GoogleAppsScripts/EmployeeLogin
clasp pull  # Should download files
```

---

### **Step 6: VS Code Setup**

#### **Install Recommended Extensions**

On both devices, install:

```
# Essential
ms-vscode.vscode-typescript-next
dbaeumer.vscode-eslint
esbenp.prettier-vscode

# AWS Development
amazonwebservices.aws-toolkit-vscode

# Git
eamodio.gitlens
github.vscode-pull-request-github

# Productivity
github.copilot
github.copilot-chat
wakatime.vscode-wakatime

# Optional
ms-python.python
bradlc.vscode-tailwindcss
```

#### **Enable Settings Sync** (Optional but Recommended)

1. VS Code → Settings → Turn on Settings Sync
2. Sign in with GitHub or Microsoft
3. Select what to sync:
   - ✅ Settings
   - ✅ Extensions
   - ✅ Keybindings
   - ✅ Snippets
   - ❌ UI State (optional)

---

## 🔄 Daily Workflow

### **Starting Work (Either Device)**

```powershell
# 1. Navigate to project
cd ~/Desktop/carolina-lumpers-web  # Or wherever you keep it

# 2. Get latest changes
git pull

# 3. Open workspace in VS Code
code Workspace_AppsScriptEmployeeLogin.code-workspace

# 4. Start working!
```

### **Switching Devices Mid-Work**

**From PC:**
```powershell
# Save and commit your work
git add .
git commit -m "WIP: feature description"
git push origin main  # Or feature branch
```

**To Laptop:**
```powershell
cd carolina-lumpers-web
git pull
code Workspace_AppsScriptEmployeeLogin.code-workspace
# Continue where you left off!
```

### **Feature Branch Workflow (Recommended)**

```powershell
# Start new feature
git checkout -b feature/new-feature-name

# Work, commit
git add .
git commit -m "Add feature X"

# Push to GitHub
git push origin feature/new-feature-name

# Switch devices, pull same branch
git fetch
git checkout feature/new-feature-name

# When done, merge to main via PR on GitHub
```

---

## 🏗️ Project-Specific Setup

### **Carolina Lumpers Web**

#### **First Clone (Per Device)**
```powershell
cd ~/Desktop  # Or your preferred location
git clone https://github.com/GarayInvestments/carolina-lumpers-web.git
cd carolina-lumpers-web
```

#### **Install Dependencies**
```powershell
# React Portal
cd react-portal
npm install

# AWS Infrastructure (when created)
cd ../aws-infrastructure
npm install
```

#### **Configure Apps Script Projects**
```powershell
cd GoogleAppsScripts/EmployeeLogin
clasp pull  # First time: creates .clasp.json
```

#### **Test Local Development**
```powershell
# Static frontend
python -m http.server 8010
# Open: http://localhost:8010/employeelogin.html

# React portal
cd react-portal
npm run dev
# Open: http://localhost:5174
```

---

### **House Renovators AI**

#### **First Clone (Per Device)**
```powershell
cd ~/Desktop
git clone https://github.com/GarayInvestments/HouseRenoAI.git
cd HouseRenoAI
npm install
```

#### **Project-Specific Setup**
```powershell
# Follow project README.md for:
# - Environment variables (.env.local)
# - API keys
# - Database connection
```

---

### **Future Client Projects**

#### **Template for New Client Project**
```powershell
# 1. Create repo on GitHub (GarayInvestments org)
# 2. Clone on both devices
git clone https://github.com/GarayInvestments/client-[name].git

# 3. Initialize structure
cd client-[name]
mkdir frontend backend aws-infrastructure docs

# 4. Add infrastructure as code
cd aws-infrastructure
cdk init app --language typescript
npm install

# 5. Commit base structure
git add .
git commit -m "Initial project structure"
git push
```

---

## 🔐 Security Best Practices

### **Never Commit These Files**

Ensure `.gitignore` includes:
```gitignore
# Credentials
.env
.env.*
*.key
*.pem
credentials.json
service-account-key.json
.clasp.json

# AWS
.aws/
cdk.out/

# Node
node_modules/
package-lock.json  # Use in private repos

# IDE
.vscode/settings.json  # Local settings only
.idea/

# OS
.DS_Store
Thumbs.db
```

### **Credential Storage Locations**

**AWS Credentials:**
```
C:\Users\[Username]\.aws\credentials
C:\Users\[Username]\.aws\config
```

**Google Cloud:**
```
C:\Users\[Username]\AppData\Roaming\gcloud\credentials.db
```

**GitHub Token:**
- Stored by Git Credential Manager
- Windows Credential Manager: `git:https://github.com`

**Apps Script:**
```
~/.clasprc.json  # OAuth token, don't commit
```

---

## 🚀 AWS Infrastructure Deployment

### **Bootstrap AWS (One-Time Per Account/Region)**

```powershell
# Bootstrap your default account
cdk bootstrap aws://420660210455/us-east-1

# Bootstrap client accounts (future)
cdk bootstrap aws://CLIENT_ACCOUNT_ID/us-east-1 --profile kredity-client
```

### **Deploy from Either Device**

```powershell
cd aws-infrastructure

# Deploy to development
cdk deploy --all

# Deploy to specific stack
cdk deploy cls-frontend-stack

# Deploy to client account
cdk deploy --profile kredity-client
```

---

## 🧪 Testing Checklist (New Device)

Run these to verify everything works:

```powershell
# Git
git --version
git config --list

# Node/NPM
node --version
npm --version

# AWS
aws --version
aws sts get-caller-identity

# CDK
cdk --version

# Google Cloud
gcloud --version
gcloud config list

# Apps Script
clasp --version
clasp login --status

# Python
python --version

# Test project clone and run
cd ~/Desktop
git clone https://github.com/GarayInvestments/carolina-lumpers-web.git
cd carolina-lumpers-web
git pull
code .
```

---

## 📂 Recommended Folder Structure

### **On Both Devices:**

```
C:\Users\[Username]\
├── Desktop\
│   ├── carolina-lumpers-web\         # Main CLS project
│   └── HouseRenoAI\                  # House Renovators project
│
├── Documents\
│   └── GitHub\                       # Alternative location
│       ├── client-kredit-ya\
│       └── client-[future]\
│
├── .aws\                             # AWS credentials (local only)
│   ├── credentials
│   └── config
│
└── AppData\Roaming\                  # Tool configs (local only)
    ├── gcloud\
    └── Code\                         # VS Code (synced if enabled)
```

---

## 🔄 Sync Summary

### **What Syncs Automatically via Git:**
✅ All source code  
✅ Documentation  
✅ VS Code workspace files (relative paths)  
✅ Infrastructure definitions (CDK)  
✅ CI/CD configs  
✅ `.gitignore` patterns

### **What's Local Only (Setup Per Device):**
❌ AWS credentials  
❌ GitHub authentication tokens  
❌ Google Cloud credentials  
❌ Node modules (run `npm install`)  
❌ CDK build artifacts (`cdk.out/`)  
❌ Local VS Code settings (unless Settings Sync enabled)

### **What's in Cloud (Accessible Everywhere):**
☁️ AWS infrastructure state (CloudFormation)  
☁️ Deployed applications (S3, Lambda, etc.)  
☁️ Google Sheets databases  
☁️ Apps Script deployments  
☁️ GitHub repositories

---

## 🎓 Quick Reference Commands

### **Git**
```powershell
git pull                              # Get latest changes
git status                            # Check what's changed
git add .                             # Stage all changes
git commit -m "message"               # Commit with message
git push                              # Push to GitHub
git checkout -b feature/name          # Create feature branch
```

### **AWS**
```powershell
aws sts get-caller-identity           # Verify logged in
aws s3 ls                             # List S3 buckets
aws configure --profile [name]        # Add profile
cdk deploy                            # Deploy infrastructure
cdk diff                              # Preview changes
```

### **Google Cloud**
```powershell
gcloud auth login                     # Login
gcloud projects list                  # List projects
gcloud config set project [id]        # Set active project
gsutil ls                             # List storage buckets
```

### **Apps Script**
```powershell
clasp login                           # Authenticate
clasp push                            # Deploy to Google
clasp pull                            # Download from Google
clasp open                            # Open in browser
```

### **Node/NPM**
```powershell
npm install                           # Install dependencies
npm install -g [package]              # Install globally
npm run dev                           # Run dev server (if configured)
npm run build                         # Build for production
```

---

## 🆘 Troubleshooting

### **Git Push Fails: Authentication Error**
```powershell
# Clear credentials and re-authenticate
git credential-manager erase git:https://github.com
git push  # Will prompt for new token
```

### **AWS CLI: Access Denied**
```powershell
# Verify credentials
aws sts get-caller-identity
# If error, reconfigure:
aws configure
```

### **CDK Deploy Fails: Not Bootstrapped**
```powershell
cdk bootstrap aws://ACCOUNT_ID/REGION
```

### **clasp Push Fails: Not Logged In**
```powershell
clasp login
clasp logout && clasp login  # If still fails
```

### **Node Modules Missing**
```powershell
npm install  # In project folder
```

### **VS Code Extensions Not Working**
1. Check Settings Sync is enabled and signed in
2. Manually install extensions from Extensions panel
3. Reload VS Code: `Ctrl+Shift+P` → "Reload Window"

---

## 🔮 Future: Multi-Client Architecture

### **Planned Structure**

```
AWS Organization (Root Account)
├── steve-admin (Management)
│   └── Development & testing for all projects
│
├── CLS Production Account
│   └── carolina-lumpers.com infrastructure
│
├── House Renovators Production Account
│   └── House Renovators app infrastructure
│
└── Client OU (Organizational Unit)
    ├── Kredit-Ya Client Account
    │   └── Their dedicated AWS resources
    │
    └── [Future Client] Account
        └── Their dedicated AWS resources
```

### **Deployment Model**

```powershell
# Develop in your account
cdk deploy --profile default

# Export to client account (when ready)
cdk deploy --profile kredity-client

# Maintain separate stacks per client
# Infrastructure as code lives in your Git repos
# Client gets their own isolated AWS environment
```

---

## ✅ Setup Verification Checklist

Use this when setting up a new device:

- [ ] Git installed and configured
- [ ] GitHub authentication working (push/pull successful)
- [ ] Node.js and npm installed
- [ ] AWS CLI installed and configured
- [ ] AWS credentials verified (`aws sts get-caller-identity`)
- [ ] Google Cloud SDK installed and authenticated
- [ ] clasp installed and logged in
- [ ] VS Code installed with extensions
- [ ] VS Code Settings Sync enabled (optional)
- [ ] All repositories cloned
- [ ] Dependencies installed (`npm install` in each project)
- [ ] Can deploy Apps Script (`clasp push`)
- [ ] Can deploy to AWS (`cdk diff`)
- [ ] Local development servers work
- [ ] WakaTime configured (for time tracking)

---

## 📞 Support

**Documentation Locations:**
- This file: `.github/MULTI_DEVICE_SETUP.md`
- Project-specific: `.github/copilot-instructions.md`
- Database schema: `.github/DATABASE_SCHEMA.md`

**For questions:**
- Check project README.md first
- Review error messages carefully
- Google the specific error
- Ask GitHub Copilot in VS Code

---

**Last Updated:** November 13, 2025  
**Version:** 1.0  
**Applies To:** PC (Windows 11) + Laptop (Windows)
