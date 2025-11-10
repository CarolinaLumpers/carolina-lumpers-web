function testCheckFailureReason() {
    const failureReason = checkFailureReason();
    Logger.log(failureReason);
}

/**
 * Checks the logs for the most recent failure and provides a summary of the potential causes.
 * @returns {string} - A summary of the potential causes for the most recent failure.
 */
function checkFailureReason() {
    const sheet = getLogSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const statusIndex = headers.indexOf("Status");
    const detailsIndex = headers.indexOf("Details");

    for (let i = data.length - 1; i > 0; i--) {
        if (data[i][statusIndex] === "Failed") {
            const failureDetails = data[i][detailsIndex];
            return `Most recent failure reason: ${failureDetails}`;
        }
    }
    return "No failures found in the logs.";
}