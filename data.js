const { google } = require('googleapis');

// Set up OAuth2 client
const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json', // Path to your credentials file
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Create Google Sheets API client
const sheets = google.sheets({ version: 'v4', auth });

// Define function to find the next available row
async function getNextAvailableRow(sheets, spreadsheetId, sheetName) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });
  const values = response.data.values;
  return values ? values.length + 1 : 1;
}

// Define data to be written
const rowData = [
  'Value1', 
  new Date().toLocaleString(), // Current date and time
  'Value3'
];

// Write data to the next available row in the spreadsheet
async function writeToNextRow() {
  const spreadsheetId = '1nFR59bYCagHk8Hr_bFGLOLiBpILrPv0iIk4LMtH5EY0';
  const sheetName = 'Feed';
  const nextRow = await getNextAvailableRow(sheets, spreadsheetId, sheetName);

  const requestData = {
    spreadsheetId,
    range: `${sheetName}!A${nextRow}:C${nextRow}`, // Append to the next empty row
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [rowData],
    },
  };

  try {
    const response = await sheets.spreadsheets.values.update(requestData);
    console.log('Data written successfully:', response.data);
  } catch (err) {
    console.error('Error writing data:', err);
  }
}

// Call the function to write data to the next row
writeToNextRow();
