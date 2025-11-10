/**
 * Configuration Constants for Invoice & QBO Sync System
 * Version: 2.0
 * Last Updated: 2015-02-05
 */

const CONFIG = {
  /**
   * AppSheet Configuration
   */
  APP_ID: "4a5b8255-5ee1-4473-bc44-090ac907035b",
  APP_API_KEY: PropertiesService.getScriptProperties().getProperty("APPSHEET_API_KEY"),
  APPSHEET_BASE_URL: "https://api.appsheet.com/api/v2/apps/",
  
  /**
   * QuickBooks Online (QBO) Configuration
   */
  QBO_CLIENT_ID: PropertiesService.getScriptProperties().getProperty("QBO_CLIENT_ID"),
  QBO_CLIENT_SECRET: PropertiesService.getScriptProperties().getProperty("QBO_CLIENT_SECRET"),
  QBO_REALM_ID: PropertiesService.getScriptProperties().getProperty("QBO_REALM_ID"),
  QBO_ACCESS_TOKEN: PropertiesService.getScriptProperties().getProperty("QBO_ACCESS_TOKEN"),
  QBO_BASE_URL: "https://quickbooks.api.intuit.com/v3/company/",
  QBO_REFRESH_TOKEN: PropertiesService.getScriptProperties().getProperty("QBO_REFRESH_TOKEN"),

  /**
   * OAuth Configuration
   */
  OAUTH_REDIRECT_URI: "https://script.google.com/macros/d/1CRk3Bb98FDqs0AfT7f09cJGQfjsxWW8PmpGyouPl_KtxhyYqtFYlCGwi/usercallback",
  OAUTH_AUTHORIZATION_URL: "https://appcenter.intuit.com/connect/oauth2",
  OAUTH_TOKEN_URL: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
  OAUTH_SCOPE: "com.intuit.quickbooks.accounting",
  
  /**
   * Google Sheets Configuration
   */
  SHEET_NAMES: {
    INVOICES: "Invoices",
    LINE_ITEMS: "Invoice LineItems",
    LOG: "Log",
    CLIENTS: "Clients"
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
