const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Enable CORS
app.use(cors());

// Serve static files (like your HTML file) from the 'public' directory
app.use(express.static('public'));

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Function to execute the main logic
async function main(input1, input2, input3, imagePath) {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: 'credentials.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const client = await auth.getClient();

        const googleSheets = google.sheets({ version: 'v4', auth: client });

        const ssID = '1nFR59bYCagHk8Hr_bFGLOLiBpILrPv0iIk4LMtH5EY0';

        const currentDate = new Date();
        const options = {
            timeZone: 'America/Los_Angeles', // Rancho Cucamonga time zone
        };
        const localDateString = currentDate.toLocaleString(undefined, options);

        // Save image file to a specific directory (e.g., 'uploads/')
        let imageUrl = '';
        if (imagePath) {
            const newImagePath = path.join('uploads', `${Date.now()}_${path.basename(imagePath)}`);
            fs.renameSync(imagePath, newImagePath);
            imageUrl = newImagePath;
        }

        // Write data to the spreadsheet
        await googleSheets.spreadsheets.values.append({
            spreadsheetId: ssID,
            range: 'Feed!A:D',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[input1, localDateString, input2, imageUrl]],
            },
        });

        console.log('Data written successfully.');
        console.log(localDateString);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Endpoint to trigger the main function with optional file upload
app.post('/upload', upload.single('image'), async (req, res) => {
    const input1 = req.body.input1 || 'NA'; // Default value if input1 is not provided
    const input2 = req.body.input2 || 'NA'; // Default value if input2 is not provided
    const input3 = req.body.input3 || 'NA'; // Default value if input3 is not provided
    const imagePath = req.file ? req.file.path : null;

    await main(input1, input2, input3, imagePath);
    res.send('Data sent successfully.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
