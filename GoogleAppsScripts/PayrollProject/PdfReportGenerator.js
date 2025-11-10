/**
 * Generates a structured PDF report for a worker's payroll using HTML-based formatting.
 * @param {string} workerId - The WorkerID.
 * @param {string} workerName - The name of the worker.
 * @param {string} weekPeriod - The week period (Sunday date).
 * @returns {string|null} - The URL of the generated PDF report.
 */
function generateWorkerPdfReport(workerId, workerName, weekPeriod) {
    logEvent("PDF Generation Start", { workerId, workerName, weekPeriod }, "📄 Generating PDF Report...");

    const { payrollData, preferredLanguage } = getWorkerPayrollData(workerId, weekPeriod);
    if (!payrollData || payrollData.length === 0) {
        logEvent("PDF Generation Failed", { workerId, weekPeriod }, "⚠️ No payroll data found.");
        return null;
    }

    // Fetch the image as a blob from Google Drive
    const imageId = '1JWcy02cP-iRj2LgJPsFE6v7w2u5WaRtL'; // Replace with your image file ID
    const imageBlob = DriveApp.getFileById(imageId).getBlob();
    const imageBase64 = Utilities.base64Encode(imageBlob.getBytes());
    const imageDataUri = `data:${imageBlob.getContentType()};base64,${imageBase64}`;

    // ✅ **Calculate Totals & Average Hourly Pay**
    const totalAmount = payrollData.reduce((sum, item) => sum + parseFloat(item.checkAmount), 0);
    const totalHours = payrollData.reduce((sum, item) => sum + parseFloat(item.qty), 0);
    const avgHourlyPay = totalHours > 0 ? (totalAmount / totalHours).toFixed(2) : "N/A";

    // Sort payrollData by serviceDate
    payrollData.sort((a, b) => new Date(a.serviceDate) - new Date(b.serviceDate));

    // ✅ **Build HTML-based PDF Content**
    let htmlContent = `
        <html>
        <head>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    font-size: 14px; /* Larger base font size for readability */
                    color: #333; 
                    margin: 10px; /* Smaller margins for mobile */
                    padding: 0; 
                }
                h1 { 
                    text-align: center; 
                    font-size: 40px; /* Larger font for headlines */
                    margin-bottom: 20px; 
                }
                h2 { 
                    text-align: center; 
                    font-size: 35px; /* Larger font for subheadings */
                    margin-bottom: 15px; 
                    color: #666; 
                }
                .header, .footer { 
                    text-align: center; 
                    margin: 20px 0; 
                }
                .header img { 
                    width: 100%; 
                    max-width: 200px; /* Optimized image size for mobile */
                    height: auto; 
                }
                .footer { 
                    font-size: 12px; /* Slightly larger footer text for readability */
                    color: #999; 
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 20px; 
                }
                th, td { 
                    border: 1px solid #ddd; 
                    padding: 10px; /* Slightly larger padding for touch-friendly design */
                    text-align: left; 
                    font-size: 14px; /* Larger table font size */
                }
                th { 
                    background-color: #f2f2f2; 
                    color: #333; 
                }
                tr:nth-child(even) { 
                    background-color: #f9f9f9; 
                }
                tr:hover { 
                    background-color: #f1f1f1; 
                }
                .summary { 
                    margin-top: 20px; 
                    padding: 0 10px; /* Add padding for smaller screens */
                }
                .summary p { 
                    margin: 5px 0; 
                    font-size: 16px; /* Larger font for summary text */
                }
                .totals {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: auto; /* Remove fixed height for flexibility */
                    padding: 0 10px; /* Add padding for smaller screens */
                }
                .totals h2 {
                    font-size: 35px; /* Larger font for totals */
                    font-weight: bold;
                    color: #333;
                    margin: 10px 0;
                    text-align: left;
                    width: 100%;
                    max-width: 400px;
                }
                @media (max-width: 768px) {
                    body {
                        font-size: 12px; /* Adjust font size for smaller screens */
                    }
                    h1 {
                        font-size: 30px; /* Adjust headline size for smaller screens */
                    }
                    h2 {
                        font-size: 25px; /* Adjust subheading size for smaller screens */
                    }
                    table {
                        font-size: 12px; /* Adjust table font size for smaller screens */
                    }
                    .totals h2 {
                        font-size: 25px; /* Adjust totals font size for smaller screens */
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="${imageDataUri}" alt="Company Logo">
                <h1>${translateContent('Payroll Report', preferredLanguage)}</h1>
                <h2>${translateContent('Week Period', preferredLanguage)}: ${weekPeriod}</h2>
            </div>
            <div class="summary">
                <p><strong>${translateContent('Worker', preferredLanguage)}:</strong> ${workerName}</p>
                <p><strong>${translateContent('Check #', preferredLanguage)}:</strong> ${payrollData[0].checkNumber}</p>
            </div>
            <div class="totals">
                <h2>${translateContent('Total Amount', preferredLanguage)}: $${totalAmount.toFixed(2)}</h2>
                <h2>${translateContent('Total Hours', preferredLanguage)}: ${totalHours.toFixed(2)}</h2>
                <h2>${translateContent('Average Hourly Pay', preferredLanguage)}: $${avgHourlyPay}</h2>
            </div>
            <table>
                <tr>
                    <th>${translateContent('Service Date', preferredLanguage)}</th>
                    <th>${translateContent('Description', preferredLanguage)}</th>
                    <th>${translateContent('Hours', preferredLanguage)}</th>
                    <th>${translateContent('Amount', preferredLanguage)}</th>
                </tr>`;

    payrollData.forEach((item) => {
        htmlContent += `
                <tr>
                    <td>${formatDateYYYYMMDD(item.serviceDate)}</td>
                    <td>${item.details}</td>
                    <td>${item.qty}</td>
                    <td>$${item.checkAmount}</td>
                </tr>`;
    });

    htmlContent += `
            </table>
            <div class="footer">
                <p>${translateContent('Generated on', preferredLanguage)}: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })}</p>
                <p>Carolina Lumper Service, LLC | info@CarolinaLumpers.com</p>
            </div>
        </body>
        </html>`;

    // ✅ **Convert HTML to Blob for PDF**
    const blob = Utilities.newBlob(htmlContent, "text/html", "PayrollReport.html");

    // ✅ **Save as PDF in Google Drive**
    const folder = DriveApp.getFolderById("1rIyse0m8_vZkwkp-jlllwKuo85JFMeBb");
    const pdfFile = folder.createFile(blob.getAs("application/pdf")).setName(`${payrollData[0].checkNumber}-${weekPeriod}.pdf`);
    const pdfUrl = pdfFile.getUrl();

    logEvent("PDF Generated", { workerId, workerName, weekPeriod, pdfUrl }, "✅ PDF Created Successfully.");

    // 📨 **Send Email with PDF Attachment**
    const recipient = "info@carolinalumpers.com";
    const subject = `Payroll Report for ${workerName} - Week Period: ${weekPeriod}`;
    const body = `
        Dear Team,

        Please find attached the payroll report for ${workerName} for the week period: ${weekPeriod}.

        Best regards,
        Carolina Lumper Service
    `;
    GmailApp.sendEmail(recipient, subject, body, {
        attachments: [pdfFile.getAs("application/pdf")],
        name: "Carolina Lumper Service"
    });

    // 🕒 Allow time for Drive processing before returning the URL
    Utilities.sleep(3000);

    return pdfUrl;
}

/**
 * Fetches payroll data for a given worker and week period efficiently.
 * @param {string} workerId - The WorkerID.
 * @param {string} weekPeriod - The week period (yyyy-MM-dd).
 * @returns {object} - An object containing payroll records and the preferred language.
 */
function getWorkerPayrollData(workerId, weekPeriod) {
    try {
        const payrollSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.PAYROLL_LINE_ITEMS);
        const workersSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.WORKERS);

        if (!payrollSheet || !workersSheet) {
            logEvent("Payroll Data Error", { workerId, weekPeriod }, "❌ Error: Sheet not found.");
            return { payrollData: [], preferredLanguage: 'English' };
        }

        const payrollData = payrollSheet.getDataRange().getValues();
        const workersData = workersSheet.getDataRange().getValues();

        if (payrollData.length < 2 || workersData.length < 2) {
            logEvent("Payroll Data Error", { workerId, weekPeriod }, "⚠️ No payroll data found in sheet.");
            return { payrollData: [], preferredLanguage: 'English' };
        }

        // Extract headers and normalize them
        const payrollHeaders = payrollData[0].map(header => header.trim());
        const workersHeaders = workersData[0].map(header => header.trim());

        const weekPeriodIndex = payrollHeaders.indexOf(CONFIG.COLUMNS.PAYROLL_LINE_ITEMS.WEEK_PERIOD);
        const workerIdIndex = payrollHeaders.indexOf(CONFIG.COLUMNS.PAYROLL_LINE_ITEMS.WORKER_ID);
        const languageIndex = workersHeaders.indexOf(CONFIG.COLUMNS.WORKERS.PRIMARY_LANGUAGE);

        // Check if required columns exist
        if (weekPeriodIndex === -1 || workerIdIndex === -1 || languageIndex === -1) {
            logEvent("Payroll Data Error", { workerId, weekPeriod }, "❌ Missing required columns.");
            return { payrollData: [], preferredLanguage: 'English' };
        }

        // ✅ **Filter Data by `Week Period` FIRST**
        const filteredData = payrollData.slice(1).filter(row => {
            const rowWeekPeriod = new Date(row[weekPeriodIndex]).toISOString().split("T")[0];
            return rowWeekPeriod === weekPeriod;
        });

        logEvent("Payroll Data Filtered", { weekPeriod, rowsFound: filteredData.length }, "📊 Filtered by Week Period");

        // ✅ **Now filter by `WorkerID`**
        const workerPayrollData = filteredData
            .filter(row => row[workerIdIndex].trim() === workerId)
            .map(row => ({
                serviceDate: row[payrollHeaders.indexOf(CONFIG.COLUMNS.PAYROLL_LINE_ITEMS.PAYROLL_DATE)],
                details: row[payrollHeaders.indexOf(CONFIG.COLUMNS.PAYROLL_LINE_ITEMS.DETAILS)],
                qty: row[payrollHeaders.indexOf(CONFIG.COLUMNS.PAYROLL_LINE_ITEMS.QTY)],
                checkAmount: row[payrollHeaders.indexOf(CONFIG.COLUMNS.PAYROLL_LINE_ITEMS.CHECK_AMOUNT)],
                checkNumber: row[payrollHeaders.indexOf(CONFIG.COLUMNS.PAYROLL_LINE_ITEMS.CHECK_NUMBER)],
                totalAmount: row[payrollHeaders.indexOf(CONFIG.COLUMNS.PAYROLL_LINE_ITEMS.CHECK_AMOUNT)],
                totalHours: row[payrollHeaders.indexOf(CONFIG.COLUMNS.PAYROLL_LINE_ITEMS.QTY)]
            }));

        // Retrieve the preferred language
        const workerRow = workersData.slice(1).find(row => row[workersHeaders.indexOf(CONFIG.COLUMNS.WORKERS.WORKER_ID)].trim() === workerId);
        const preferredLanguage = workerRow ? workerRow[languageIndex] : 'English';

        if (workerPayrollData.length === 0) {
            logEvent("Payroll Data Not Found", { workerId, weekPeriod }, "⚠️ No matching payroll records.");
        } else {
            logEvent("Payroll Data Retrieved", { workerId, weekPeriod, recordsFound: workerPayrollData.length }, "✅ Payroll data retrieved.");
        }

        return { payrollData: workerPayrollData, preferredLanguage };
    } catch (error) {
        logEvent("Payroll Data Error", { workerId, weekPeriod, error: error.message }, "❌ Error fetching payroll data.");
        return { payrollData: [], preferredLanguage: 'English' };
    }
}

/**
 * Translates the report content based on the preferred language.
 * @param {string} content - The content to be translated.
 * @param {string} language - The preferred language ('English', 'Spanish', 'Portuguese').
 * @returns {string} - The translated content.
 */
function translateContent(content, language) {
    const translations = {
        'English': {
            'Payroll Report': 'Payroll Report',
            'Worker': 'Worker',
            'Week Period': 'Week Period',
            'Check #': 'Check #',
            'Total Amount': 'Total Amount',
            'Total Hours': 'Total Hours',
            'Average Hourly Pay': 'Average Hourly Pay',
            'Service Date': 'Service Date',
            'Description': 'Description',
            'Hours': 'Hours',
            'Amount': 'Amount',
            'Generated on': 'Generated on'
        },
        'Spanish': {
            'Payroll Report': 'Informe de Nómina',
            'Worker': 'Trabajador',
            'Week Period': 'Periodo de la Semana',
            'Check #': 'Cheque #',
            'Total Amount': 'Monto Total',
            'Total Hours': 'Horas Totales',
            'Average Hourly Pay': 'Pago Promedio por Hora',
            'Service Date': 'Fecha de Servicio',
            'Description': 'Descripción',
            'Hours': 'Horas',
            'Amount': 'Monto',
            'Generated on': 'Generado el'
        },
        'Portuguese': {
            'Payroll Report': 'Relatório de Folha de Pagamento',
            'Worker': 'Trabalhador',
            'Week Period': 'Período da Semana',
            'Check #': 'Cheque #',
            'Total Amount': 'Valor Total',
            'Total Hours': 'Horas Totais',
            'Average Hourly Pay': 'Pagamento Médio por Hora',
            'Service Date': 'Data de Serviço',
            'Description': 'Descrição',
            'Hours': 'Horas',
            'Amount': 'Valor',
            'Generated on': 'Gerado em'
        }
    };

    return translations[language][content] || content;
}