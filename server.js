const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Enable CORS
const app = express();
app.use(cors());
app.use(express.static('public'));

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Function to upload image to Google Drive and generate a public URL
async function uploadImageToDrive(auth, imagePath) {
    const drive = google.drive({ version: 'v3', auth });
    const fileMetadata = {
        name: path.basename(imagePath),
        parents: ['1_zC3c5k79ItpB-I9ql42VduSv9k9MhIa'] // Replace with your actual folder ID
    };
    const media = {
        mimeType: 'image/jpeg',
        body: fs.createReadStream(imagePath)
    };
    const file = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
    });

    // Make the file public
    await drive.permissions.create({
        fileId: file.data.id,
        requestBody: {
            role: 'reader',
            type: 'anyone',
        },
    });

    // Generate the public URL
    const result = await drive.files.get({
        fileId: file.data.id,
        fields: 'webViewLink, webContentLink'
    });

    return result.data.webContentLink;
}

// Main function to authenticate and perform actions
async function main(input1, input2, input3, imagePath) {
    try {
        // Load GOOGLE_CREDENTIALS from credentials.json file
        const credentialsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;
        const credentials = JSON.parse(Buffer.from(credentialsBase64, 'base64').toString('utf-8'));
        
        // Set up Google authentication
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'],
        });

        const client = await auth.getClient();
        const googleSheets = google.sheets({ version: 'v4', auth: client });
        const ssID = '1nFR59bYCagHk8Hr_bFGLOLiBpILrPv0iIk4LMtH5EY0';

        const currentDate = new Date();
        const options = { timeZone: 'America/Los_Angeles' };
        const localDateString = currentDate.toLocaleString(undefined, options);

        // Upload image to Google Drive and get the public URL
        let imageUrl = '';
        if (imagePath) {
            imageUrl = await uploadImageToDrive(client, imagePath);
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
    const input1 = req.body.input1 || 'NA';
    const input2 = req.body.input2 || 'NA';
    const input3 = req.body.input3 || 'NA';
    const imagePath = req.file ? req.file.path : null;

    await main(input1, input2, input3, imagePath);
    res.send('Data sent successfully.');
});

app.get('/', (req, res) => {
    res.send('Hello, World!');
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
