# Configuration Directory

## Google OAuth Credentials

### Files
- `credentials.json` - OAuth 2.0 client credentials for Google Sheets API access
- `token.json` - Generated OAuth token (auto-created on first run)

### Project Details
- **Project:** cls-operations-hub
- **Client ID:** 1037251356923-v58eb5dq4k7iluscea5vvtesav8l8r3n.apps.googleusercontent.com
- **Scopes:** Google Sheets API access

### Usage
These credentials allow external scripts (Python/Node.js) to access Google Sheets outside of Google Apps Script.

**Example (Python):**
```python
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

# Load credentials
creds = Credentials.from_authorized_user_file('config/credentials.json', SCOPES)
service = build('sheets', 'v4', credentials=creds)
```

### Security
⚠️ **IMPORTANT:** These files are gitignored and should NEVER be committed to version control.

- Contains sensitive client secrets
- Provides access to your Google account data
- Keep secure and private

### When to Use
- External data validation scripts
- Automated data migration tools
- Backup/export utilities
- Integration with non-Google services

### Alternative
For most operations, use **Google Apps Script** instead (no credentials needed):
- Located in: `GoogleAppsScripts/`
- Built-in Google Sheets access
- No OAuth setup required
