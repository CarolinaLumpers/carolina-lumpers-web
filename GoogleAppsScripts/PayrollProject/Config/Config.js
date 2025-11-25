const scriptProperties = PropertiesService.getScriptProperties();

const CONFIG = {
  // QuickBooks API Configuration
  CLIENT_ID: scriptProperties.getProperty('QBO_CLIENT_ID'),
  CLIENT_SECRET: scriptProperties.getProperty('QBO_CLIENT_SECRET'),
  REALM_ID: scriptProperties.getProperty('QBO_REALM_ID'),
  REDIRECT_URI: scriptProperties.getProperty('QBO_REDIRECT_URI'),
  QBO_BASE_URL: scriptProperties.getProperty('QBO_BASE_URL'),
  TOKEN_URL: scriptProperties.getProperty('QBO_TOKEN_URL'),
  AUTHORIZATION_URL: scriptProperties.getProperty('QBO_AUTHORIZATION_URL'),
  SCOPE: scriptProperties.getProperty('QBO_SCOPE'),



  // AppSheet API Configuration
  APP_ID: scriptProperties.getProperty('APP_ID'),
  API_KEY: scriptProperties.getProperty('API_KEY'),

  // Sheets Configuration
  SPREADSHEET_ID: scriptProperties.getProperty('SPREADSHEET_ID') || 'DEFAULT_SPREADSHEET_ID',
  SHEETS: {
    WORKERS: "Workers",
    LOG: "Log",
    PAYROLL_LINE_ITEMS: "Payroll LineItems",
    INVOICE_LINE_ITEMS: "Invoice LineItems"
  },
  COLUMNS: {
    WORKERS: {
      WORKER_ID: "WorkerID",
      EMPLOYEE_ID: "Employee ID",
      FIRST_NAME: "First Name",
      LAST_NAME: "Last Name",
      EMAIL: "Email",
      PHONE: "Phone",
      ROLE: "Role",
      SERVICE_ITEM: "ServiceItem",
      HOURLY_RATE: "Hourly Rate",
      FLAT_RATE_BONUS: "Flat Rate Bonus",
      AVAILABILITY: "Availability",
      APP_ACCESS: "App Access",
      APPLICATION_ID: "ApplicationID",
      PRIMARY_LANGUAGE: "Primary Language",
      WORK_HISTORY: "Work History",
      PHOTO: "Photo",
      DOCS: "Docs",
      COLUMN_1: "Column 1",
      DISPLAY_NAME: "Display Name",
      QBO_VENDOR_ID: "QBOID"
    },
    PAYROLL_LINE_ITEMS: {
      LINE_ITEM_ID: "LineItemID",
      PAYROLL_DATE: "Date",
      WORKER_ID: "WorkerID",
      CLIENT_ID: "ClientID",
      SERVICE_ID: "ServiceID",
      TASK_ID: "TaskID",
      WORKER_NAME: "Worker Name",
      DETAILS: "LineItemDetail",
      QTY: "Qty",
      CHECK_AMOUNT: "Check Amount",
      CHECK_NUMBER: "Check #",
      WEEK_PERIOD: "Week Period",
      LAST_UPDATE: "Last Update"

    }
  },
  ACCOUNTS: {
    EXPENSE_ACCOUNT: {
      value: "142",
      name: "Subcontractor Expense"
    },
    AP_ACCOUNT: {
      value: "7",
      name: "Accounts Payable (A/P)"
    }
  }
};

