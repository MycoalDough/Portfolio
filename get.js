let SHEET_ID = '1nFR59bYCagHk8Hr_bFGLOLiBpILrPv0iIk4LMtH5EY0';
let SHEET_TITLE = 'Feed';
let SHEET_RANGE = 'A:D';

let FULL_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${SHEET_TITLE}&range=${SHEET_RANGE}`;

fetch(FULL_URL)
    .then(res => res.text())
    .then(rep => {
        let data = JSON.parse(rep.substr(47).slice(0, -2));

        for (let i = data.table.rows.length - 1; i >= 0; i--) {
            let rowData = data.table.rows[i].c;

            let div = document.createElement('div');
            div.className = 'row';

            let div_inside = document.createElement('div');
            div_inside.className = "blog_inside";

            let columnALabel = document.createElement('div');
            columnALabel.className = 'top-left';
            columnALabel.innerHTML = rowData[0] ? rowData[0].v : 'No Name';

            let columnBLabel = document.createElement('div');
            columnBLabel.className = 'top-right';

            // Parse the date string and format it
            let dateString = rowData[1] ? rowData[1].v : 'No Date';
            let dateParams = dateString.match(/\d+/g); // Extract numerical values
            if (dateParams && dateParams.length >= 6) {
                let year = dateParams[0];
                let month = parseInt(dateParams[1]) + 1; // Months are zero-indexed, so add 1
                let day = dateParams[2];
                let hour = parseInt(dateParams[3]);
                let minute = parseInt(dateParams[4]);
                let second = parseInt(dateParams[5]);
                
                columnBLabel.innerHTML = convertDate([year, month, day, hour, minute, second]);
            } else {
                columnBLabel.innerHTML = "Invalid Date";
            }

            let columnCDescription = document.createElement('div');
            columnCDescription.className = 'bottom';
            columnCDescription.innerHTML = '<br>' + (rowData[2] ? rowData[2].v : 'No Description') + '<br>'; // Add <br>

            div.appendChild(div_inside);
            div_inside.appendChild(columnALabel);
            div_inside.appendChild(columnBLabel);
            div.appendChild(columnCDescription);

            // Check for image URL
            if (rowData[3] && rowData[3].v) {
                let imageUrl = convertToThumbnailLink(rowData[3].v);
                let imageElement = document.createElement('img');
                imageElement.style.display = "none";
                imageElement.id = "image-feed";
                imageElement.src = imageUrl;
                imageElement.alt = 'Image';

                let toggleButton = document.createElement('button');
                toggleButton.innerHTML = 'View Image';
                toggleButton.id = "image-button-feed";
                toggleButton.onclick = function() {
                    if (imageElement.style.display === 'none') {
                        imageElement.style.display = 'block';
                        toggleButton.innerHTML = 'Hide Image';
                    } else {
                        imageElement.style.display = 'none';
                        toggleButton.innerHTML = 'View Image';
                    }
                };

                div.appendChild(toggleButton);
                div.appendChild(imageElement);
            } else {
                let noImageMessage = document.createElement('div');
                noImageMessage.className = "no-image";
                noImageMessage.innerHTML = 'No image available';
                div.appendChild(noImageMessage);
            }

            document.body.appendChild(div);
        }
    });

function convertDate(inputDate) {
    // Create a new Date object with the input parameters
    let dtObj = new Date(...inputDate);

    // Format the time as desired
    let formattedTime = dtObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Increment the month by 1
    let month = (dtObj.getMonth()) <= 12 ? (dtObj.getMonth()) : 1;

    // Concatenate the month, day, year, and formatted time
    let convertedDate = `${month}/${dtObj.getDate()}/${dtObj.getFullYear()} ${formattedTime}`;

    return convertedDate;
}

function convertToThumbnailLink(driveLink) {
    // Extract the file ID from the Google Drive link
    let fileIdMatch = driveLink.match(/id=([^&]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}`;
    } else {
        return driveLink; // Return the original link if it doesn't match the expected pattern
    }
}
