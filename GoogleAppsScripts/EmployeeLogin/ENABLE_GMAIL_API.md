# Enable Gmail API for W-9 Email Notifications

## Why Gmail API?
The standard `GmailApp.sendEmail()` does not properly encode UTF-8 emojis in email subject lines, causing them to display as `��` replacement characters. The Gmail API with proper MIME encoding handles emojis correctly.

## Steps to Enable Gmail API

### 1. Open Apps Script Editor
- Go to: https://script.google.com
- Open the **CLS_EmployeeLogin** project

### 2. Enable Gmail API (Advanced Service)
1. Click the **⚙️ Project Settings** (gear icon) in left sidebar
2. Scroll down to **"Services"** section
3. Click **"+ Add a service"**
4. Find and select **"Gmail API"** (v1)
5. Click **"Add"**

### 3. Verify in Code
The code now uses `Gmail.Users.Messages.send()` which requires the Gmail API to be enabled.

## Code Changes Made

### New Helper Function
Added `sendEmailWithGmailAPI_()` function at the end of `CLS_EmployeeLogin_W9.js`:
- Builds proper MIME message with UTF-8 encoding
- Base64 encodes subject line with `=?utf-8?B?` prefix
- Sends via `Gmail.Users.Messages.send()`
- Falls back to `GmailApp` if Gmail API fails

### Updated Email Functions
All three email notification functions now use the new helper:
1. `sendW9SubmissionNotification_()` - Admin notification
2. `sendW9ApprovalNotification_()` - Worker approval
3. `sendW9RejectionNotification_()` - Worker rejection

### Emojis Restored
- Subject lines: `🆕`, `✅`, `⚠️`
- HTML body: `📋`, `⚡`, `📄`, `🎉`, `🔗`, `📞`, `📧`, `📱`, `❌`, `💡`, `⏰`

## Testing
After enabling Gmail API, test by:
1. Submitting a W-9 (check admin email subject)
2. Approving a W-9 (check worker email subject)
3. Rejecting a W-9 (check worker email subject)

All subject lines should display emojis correctly (not `��`).

## Fallback Behavior
If Gmail API is not enabled or fails:
- Code automatically falls back to `GmailApp.sendEmail()`
- Emojis are stripped from subject line (regex removes Unicode emojis)
- HTML body still contains emojis (those work in GmailApp)

## References
- [Google Apps Script Gmail API](https://developers.google.com/apps-script/advanced/gmail)
- [MIME Message Format](https://www.rfc-editor.org/rfc/rfc2045)
- [UTF-8 Encoding in Email](https://www.rfc-editor.org/rfc/rfc2047)
