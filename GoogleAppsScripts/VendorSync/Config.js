

// Load credentials from Script Properties (secure storage)
const PROPS = PropertiesService.getScriptProperties();

const CONFIG = {
  /**
   * AppSheet Configuration
   */
  APP_ID: "4a5b8255-5ee1-4473-bc44-090ac907035b",
  APP_API_KEY: PROPS.getProperty("APPSHEET_API_KEY"),
  APPSHEET_BASE_URL: "https://api.appsheet.com/api/v2/apps/",
  
  /**
   * QuickBooks Online (QBO) Configuration
   */
  QBO_CLIENT_ID: PROPS.getProperty("QBO_CLIENT_ID"),
  QBO_CLIENT_SECRET: PROPS.getProperty("QBO_CLIENT_SECRET"),
  QBO_REALM_ID: PROPS.getProperty("QBO_REALM_ID"),
  QBO_ACCESS_TOKEN: PROPS.getProperty("QBO_ACCESS_TOKEN"),
  QBO_BASE_URL: "https://quickbooks.api.intuit.com/v3/company/",
  QBO_REFRESH_TOKEN: PROPS.getProperty("QBO_REFRESH_TOKEN"),

  /**
   * OAuth Configuration
   */
  OAUTH_REDIRECT_URI: "https://script.google.com/macros/d/13M5HYsUrxKg_HsHtmcKs1WdUzJWUe3x94oikKEBFJ6LIluQiBuUnwHR8/usercallback",
  OAUTH_AUTHORIZATION_URL: "https://appcenter.intuit.com/connect/oauth2",
  OAUTH_TOKEN_URL: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
  OAUTH_SCOPE: "com.intuit.quickbooks.accounting",
  
  /**
   * Google Sheets Configuration
   */
  SPREADSHEET_ID: PROPS.getProperty('SPREADSHEET_ID'),
  SHEETS: {
    INVOICES: "Invoices",
    LINE_ITEMS: "Invoice LineItems",
    LOG: "Log",
    CLIENTS: "Clients",
    WORKERS: "Workers"
  },

    /**
   * Google Drive Configuration
   */
  DRIVE: {
    INVOICE_FOLDER_ID: PropertiesService.getScriptProperties().getProperty("INVOICE_FOLDER_ID") // 📂 Ensure this is set
  },
  
  /**
   * Column Names
   */
  COLUMNS: {
    INVOICES: {
      INVOICE_NUMBER: "Invoice#",
      CUSTOMER: "Customer",
      DATE: "Date",
      DUE_DATE: "Due Date",
      AMOUNT: "Amount",
      STATUS: "Status",
      SYNCED: "Synced?",
      PUSH_TO_QBO: "Push to QBO",
      LAST_UPDATED: "LastUpdated"
    },
    LINE_ITEMS: {
      LINE_ITEM_ID: "LineItemID",
      INVOICE_NUMBER: "Invoice#",
      CUSTOMER: "Customer",
      DATE: "Date",
      ITEM: "Item",
      DETAIL: "LineItemDetail",
      QUANTITY: "Qty",
      AMOUNT: "Invoice Amount",
      CLIENT_ID: "ClientID",
      SERVICE_ID: "ServiceID",
      TASK_ID: "TaskID",
      WORKER_NAME: "Worker Name",
      LAST_UPDATED: "Last Update",
      START_TIME_SORTING: "Start Time (Sorting)",
      SYNCED: "Synced?"
    },
    CLIENTS: {
      CLIENT_ID: "ClientID",
      CLIENT_NAME: "Client Name",
      CONTACT_NAME: "Contact Name",
      CONTACT_EMAIL: "Contact Email",
      PAYABLES_EMAIL: "Payables Email",
      PAYABLES_EMAIL_CC: "Payables Email CC",
      PAYABLES_EMAIL_BCC: "Payables Email BCC",
      K_NICKNAME: "Knickname",
      QBO_ID: "QBOID",
      PORTAL_ACCESS: "Portal Access"
    },
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
    }
  },
  
  /**
   * Logging Configuration
   */
  LOGGING: {
    ENABLED: true,
    LEVEL: "INFO" // Options: "DEBUG", "INFO", "ERROR"
  },
  
  /**
   * Time & Sync Settings
   */
  SYNC_SETTINGS: {
    RETRY_LIMIT: 1,
    INVOICE_CREATION_TIME: "08:00 AM", // Automated invoice creation time
    TIMEZONE: "America/New_York"
  }
};
