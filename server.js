const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();

// Enable CORS
app.use(cors());

// Serve static files (like your HTML file) from the 'public' directory
app.use(express.static('public'));

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

        const currentDate = new Date();
        const options = {
            timeZone: 'America/Los_Angeles', // Rancho Cucamonga time zone
            // Other options can be added if needed, such as weekday, year, month, day, hour, minute, second, etc.
          };
        const localDateString = currentDate.toLocaleString(undefined, options);


        // Write data to the spreadsheet
        await googleSheets.spreadsheets.values.append({
            spreadsheetId: ssID,
            range: 'Feed!A:C',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[input1, localDateString, input2]],
            },
        });

        console.log('Data written successfully.');
        console.log(localDateString);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Endpoint to trigger the main function
app.get('/run-script', async (req, res) => {
    const input1 = req.query.input1 || 'NA'; // Default value if input1 is not provided
    const input2 = req.query.input2 || 'NA'; // Default value if input2 is not provided
    await main(input1, input2);
    res.send('Script executed successfully.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
