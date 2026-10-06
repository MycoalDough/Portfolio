let SHEET_ID = '1nFR59bYCagHk8Hr_bFGLOLiBpILrPv0iIk4LMtH5EY0';
let SHEET_TITLE = 'Feed';
let SHEET_RANGE = 'A:O';

let FULL_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${SHEET_TITLE}&range=${SHEET_RANGE}`;
const feedEntries = document.getElementById('feedEntries');

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
                imageElement.className = "feed-image";
                imageElement.hidden = true;
                imageElement.dataset.src = imageUrl;
                imageElement.alt = `${columnALabel.textContent.trim()} attachment`;
                imageElement.decoding = 'async';
                imageElement.referrerPolicy = 'no-referrer';

                let toggleButton = document.createElement('button');
                toggleButton.textContent = 'View Image';
                toggleButton.className = "feed-image-button";
                toggleButton.type = 'button';
                toggleButton.setAttribute('aria-expanded', 'false');
                toggleButton.onclick = function() {
                    if (imageElement.hidden) {
                        if (!imageElement.src) {
                            imageElement.src = imageElement.dataset.src;
                        }

                        imageElement.hidden = false;
                        toggleButton.textContent = 'Hide Image';
                        toggleButton.setAttribute('aria-expanded', 'true');
                    } else {
                        imageElement.hidden = true;
                        toggleButton.textContent = 'View Image';
                        toggleButton.setAttribute('aria-expanded', 'false');
                    }
                };

                imageElement.addEventListener('error', () => {
                    if (imageElement.dataset.fallbackAttempted !== 'true') {
                        imageElement.dataset.fallbackAttempted = 'true';
                        imageElement.src = imageElement.dataset.src.replace('=s1600', '=s800');
                        return;
                    }

                    imageElement.hidden = true;
                    toggleButton.textContent = 'Image unavailable';
                    toggleButton.disabled = true;
                    toggleButton.setAttribute('aria-expanded', 'false');
                });

                div.appendChild(toggleButton);
                div.appendChild(imageElement);
            } else {
                let noImageMessage = document.createElement('div');
                noImageMessage.className = "no-image";
                noImageMessage.innerHTML = 'No image available';
                div.appendChild(noImageMessage);
            }

            // Add views from column O
            let viewsLabel = document.createElement('div');
            viewsLabel.className = 'bottom-right';
            viewsLabel.innerHTML = "views: " + (rowData[14] ? rowData[14].v : '0');
            div.appendChild(viewsLabel);

            if (feedEntries?.isConnected) {
                feedEntries.appendChild(div);
            }
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
    const value = String(driveLink || '').trim();
    const fileIdMatch = value.match(/[?&]id=([^&]+)/) || value.match(/\/d\/([^/?#]+)/);

    if (!fileIdMatch?.[1]) {
        return value;
    }

    // The Drive thumbnail endpoint redirects when embedded and fails in some
    // browsers. Its direct image host works reliably in an <img> element.
    return `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileIdMatch[1])}=s1600`;
}
