/**
 * ======================
 * Config.gs
 * ======================
 * Configuration settings for sheet names, column indices, and time settings.
 */
const CONFIG = {
  SHEET_NAMES: {
    CLOCK_IN: "ClockIn",
    WORKERS: "Workers",
    TASKS: "Tasks",
    LOG: "Log",
  },
  COLUMNS: {
    CLOCK_IN: {
      INDICES: {
        CLOCK_IN_ID: 1,
        WORKER_ID: 2,
        DATE: 3,
        TIME: 4,
        NOTES: 5,
        TASK_ID: 6,
        APPROVE: 7,
        LAST_UPDATED: 9,
      },
    },
    WORKERS: {
      INDICES: {
        WORKER_ID: 1,
        ROLE: 7,
        WORKER_NAME: 19,
        AVAILABILITY: 11, 
      },
    },
    TASKS: {
      INDICES: {
        TASK_ID: 1,
        SERVICE_ID: 5,
        WORKER: 15,
        TIMESTAMP: 19,
        START_TIME: 10,
        END_TIME: 11,
      },
    },
  },
  TIME_SETTINGS: {
    WORK_HOURS: {
      START: 7,
      END: 24,
    },
    DUPLICATE_SCAN_RESTRICTION_MINUTES: 20,
  },
  APPSHEET: {
    API_KEY: 'V2-ZHKXU-KgQG7-2R2G9-sqDXc-lylt9-QGkjy-hQnBI-NHY4x',
    APP_ID: '4a5b8255-5ee1-4473-bc44-090ac907035b',
    TABLE_NAME: 'Tasks'
  },
  DEBUG: true,
};
/**
 * Logs debug messages if DEBUG is enabled.
 * @param {string} message - Debug message to log.
 */
function logDebug(message) {
  if (CONFIG.DEBUG) {
    Logger.log(message);
  }
}