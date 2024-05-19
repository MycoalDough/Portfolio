let SHEET_ID = '1nFR59bYCagHk8Hr_bFGLOLiBpILrPv0iIk4LMtH5EY0';
let SHEET_TITLE = 'Feed';
let SHEET_RANGE = 'A:C';

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
            columnALabel.innerHTML = rowData[0].v;

            let columnBLabel = document.createElement('div');
            columnBLabel.className = 'top-right';

            // Parse the date string and format it
            let dateString = rowData[1].v;
            console.log(rowData[1].v);
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
            columnCDescription.innerHTML = '<br>' + rowData[2].v + '<br>'; // Add <br>

            div.appendChild(div_inside);
            div_inside.appendChild(columnALabel);
            div_inside.appendChild(columnBLabel);
            div.appendChild(columnCDescription);

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
    