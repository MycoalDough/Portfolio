const express = require("express");
const {google, GoogleApis} = require("googleapis");

const app = express();

app.get("/", async (req, res) =>{

    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    const client = await auth.getClient();

    const googleSheets = google.sheets({version: "v4", auth:client});


    //get ss data

    const ssID = "1nFR59bYCagHk8Hr_bFGLOLiBpILrPv0iIk4LMtH5EY0";

    const metaData = await googleSheets.spreadsheets.get({
        auth: auth,
        spreadsheetId:ssID
    });

    //read spreadsheet
    const getRows = await googleSheets.spreadsheets.values.get({
        auth:auth,
        spreadsheetId: ssID,
        range: "Feed!A:C",
    });

    //write rows to the spreadsheet
    await googleSheets.spreadsheets.values.append({
        auth:auth,
        spreadsheetId:ssID,
        range: "Feed!A:C",
        valueInputOption: "USER_ENTERED",
        resource: {
            values:[
                ["Test3","4/21/24 12:25 PM", "this was sent from the server!"]
            ]
        },
    });

    res.send(getRows);
});

app.listen(1337, (req, res) => console.log("running on 1337"));