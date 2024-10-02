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
async function uploadImageToDrive(auth, imagePath, maxRetries = 5) {
    const drive = google.drive({ version: 'v3', auth });
    console.log('Starting upload process with exponential backoff...');
    console.log('Image path:', imagePath);

    const fileMetadata = {
        name: path.basename(imagePath),
        parents: ['1_zC3c5k79ItpB-I9ql42VduSv9k9MhIa'] // Replace with your actual folder ID
    };

    const media = {
        mimeType: 'image/jpeg',
        body: fs.createReadStream(imagePath)
    };

    let attempt = 0;
    let delay = 1000; // Starting delay of 1 second

    while (attempt < maxRetries) {
        try {
            // Try uploading the file
            const file = await drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id'
            });

            console.log('File uploaded successfully. File ID:', file.data.id);

            // Make the file public
            await drive.permissions.create({
                fileId: file.data.id,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            });

            console.log('Permissions set to public.');

            // Generate the public URL
            const result = await drive.files.get({
                fileId: file.data.id,
                fields: 'webViewLink, webContentLink'
            });

            console.log('File URL:', result.data.webContentLink);
            return result.data.webContentLink;  // Exit function after successful upload

        } catch (error) {
            attempt++;
            console.error(`Attempt ${attempt} failed: ${error.message}`);

            if (attempt >= maxRetries) {
                console.error('Max retries reached. Failing the upload.');
                throw error;  // Rethrow error after max retries
            }

            // Exponential backoff: wait before retrying
            const jitter = Math.random() * 500;  // Optional jitter to avoid thundering herd
            const backoffTime = delay + jitter;
            console.log(`Retrying in ${backoffTime.toFixed(0)}ms...`);

            await new Promise(resolve => setTimeout(resolve, backoffTime));  // Wait before retrying
            delay *= 2;  // Exponentially increase the delay
        }
    }
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
        throw error;
    }
}

// Endpoint to trigger the main function with optional file upload
app.post('/upload', upload.single('image'), async (req, res) => {
    const input1 = req.body.input1 || 'NA';
    const input2 = req.body.input2 || 'NA';
    const input3 = req.body.input3 || 'NA';
    const imagePath = req.file ? req.file.path : null;

    console.log('Received data:', { input1, input2, input3 });

    if (!req.file) {
        console.log('No image file uploaded.');
    } else {
        console.log('Image file uploaded:', imagePath);
    }

    try {
        await main(input1, input2, input3, imagePath);
        res.send('Data sent successfully.');
    } catch (error) {
        console.error('Error while uploading:', error);
        res.status(500).send('Internal Server Error.');
    }
});

app.get('/', (req, res) => {
    res.send('Hello, World!');
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
