const { google } = require("googleapis");

async function main() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: "credentials.json",
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        const client = await auth.getClient();

        const googleSheets = google.sheets({ version: "v4", auth: client });

        const ssID = "1nFR59bYCagHk8Hr_bFGLOLiBpILrPv0iIk4LMtH5EY0";

        // Read spreadsheet data
        const getRows = await googleSheets.spreadsheets.values.get({
            spreadsheetId: ssID,
            range: "Feed!A:C",
        });

        // Write data to the spreadsheet
        await googleSheets.spreadsheets.values.append({
            spreadsheetId: ssID,
            range: "Feed!A:C",
            valueInputOption: "USER_ENTERED",
            resource: {
                values: [["Test3", new Date().toLocaleString(), "This was sent from the script!"]],
            },
        });

        console.log("Data written successfully.");
        console.log("Updated Rows:", getRows.data.values);
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
