// Function to execute the main logic
async function main(input1, input2) {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: 'credentials.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const client = await auth.getClient();

        const googleSheets = google.sheets({ version: 'v4', auth: client });

        const ssID = '1nFR59bYCagHk8Hr_bFGLOLiBpILrPv0iIk4LMtH5EY0';

        // Read spreadsheet data
        const getRows = await googleSheets.spreadsheets.values.get({
            spreadsheetId: ssID,
            range: 'Feed!A:C',
        });

        // Write data to the spreadsheet
        await googleSheets.spreadsheets.values.append({
            spreadsheetId: ssID,
            range: 'Feed!A:C',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[input1, new Date().toLocaleString(), input2]],
            },
        });

        console.log('Data written successfully.');
        console.log('Updated Rows:', getRows.data.values);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Endpoint to trigger the main function
app.get('/run-script', async (req, res) => {
    const input1 = req.query.input1 || 'Test3'; // Default value if input1 is not provided
    const input2 = req.query.input2 || 'This was sent from the script!'; // Default value if input2 is not provided
    await main(input1, input2);
    res.send('Script executed successfully.');
});
