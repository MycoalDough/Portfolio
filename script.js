function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function spawnCloud() {
    var cloud = document.createElement("img");
    cloud.src = "images/cloud" + Math.floor(Math.random() * 4) + ".png"; 
    cloud.classList.add("cloud");

    cloud.style.left = "-100px";
    cloud.style.top = getRandomNumber(0, window.innerHeight - 150) + "px";
    cloud.style.opacity = getRandomNumberFloat(0.001,0.3).toString(); 
    
    var size = getRandomNumber(50, 150);
    cloud.style.width = size + "px";
    cloud.style.height = "auto";
    
    document.body.appendChild(cloud);

    // Animation
    var speed = getRandomNumber(20, 100); 
    var endPosition = window.innerWidth - 10;
    var interval = setInterval(function() {
        var currentPosition = parseFloat(cloud.style.left);
        if (currentPosition >= endPosition) {
            clearInterval(interval); 
            cloud.remove();
        } else {
            cloud.style.left = currentPosition + speed / 60 + "px"; 
        }
    }, 1000 / 60);
}

setInterval(spawnCloud, getRandomNumber(10000,20000));

function filterProjects() {
    var checkbox1 = document.getElementById("checkbox1");
    var checkbox2 = document.getElementById("checkbox2");
    var projects = document.querySelectorAll('.project');

    if (checkbox1.checked && !checkbox2.checked) {
        projects.forEach(function(project) {
            if (project.id === "AI") {
                project.style.display = "block";
            } else {
                project.style.display = "none";
            }
        });
    } else if (!checkbox1.checked && checkbox2.checked) {
        projects.forEach(function(project) {
            if (project.id === "GAME") {
                project.style.display = "block";
            } else {
                project.style.display = "none";
            }
        });
    } else {
        projects.forEach(function(project) {
            project.style.display = "block";
        });
    }
}


const letters = "qwertyuiopasdfghjklzxcvbnm234567890!@#$%^&*()";

let interval = null;

/*document.getElementById("main_menu_p").addEventListener("mouseover", event => {
      let iteration = 0;
  
  clearInterval(interval);
  
  interval = setInterval(() => {
    event.target.innerText = event.target.innerText
      .split("")
      .map((letter, index) => {
        if(index < iteration) {
          return event.target.dataset.value[index];
        }
      
        return letters[Math.floor(Math.random() * 40)]
      })
      .join("");
    
    if(iteration >= event.target.dataset.value.length){ 
      clearInterval(interval);
    }
    
    iteration += 1 / 3;
  }, 1);
}); */

var reverseState = 0; // Initial state
let reverse = document.getElementById('reverseButton');

if(reverse){
    document.getElementById('reverseButton').addEventListener('click', function() {
        var rows = document.querySelectorAll('.row');
        var parent = rows[0].parentNode;
        for (var i = rows.length - 1; i >= 0; i--) {
            parent.appendChild(rows[i]);
        }
        
        // Update button text based on reverseState
        if (reverseState % 2 === 0) {
            this.textContent = "SORT: Oldest";
        } else {
            this.textContent = "SORT: Recent";
        }
        
        reverseState++; // Increment reverseState
    });
}

let SHEET_ID = '1nFR59bYCagHk8Hr_bFGLOLiBpILrPv0iIk4LMtH5EY0';
let SHEET_TITLE = 'Feed';
let SHEET_RANGE = 'R3:R3';

let FULL_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${SHEET_TITLE}&range=${SHEET_RANGE}`;

fetch(FULL_URL)
    .then(res => res.text())
    .then(rep => {
        let data = JSON.parse(rep.substr(47).slice(0, -2));
        let descriptionRow = data.table.rows[0].c[0].v;
        descriptionRow = "rain"

        // Process the description and perform actions accordingly
        if (descriptionRow.includes("clear")) {
            // Do nothing
            return;
        } else if (descriptionRow.includes("rain") || descriptionRow.includes("storm")) {
            setInterval(spawnRain, getRandomNumber(100, 500)); 
            setInterval(spawnCloud, getRandomNumber(10000, 20000));
        } else if (descriptionRow.includes("cloud")) {
            setInterval(spawnCloud, getRandomNumber(10000, 20000));
        }
    });

fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${SHEET_TITLE}&range=R1:R1`)
    .then(res => res.text())
    .then(rep => {
        let data = JSON.parse(rep.substr(47).slice(0, -2));
        let time = data.table.rows[0].c[0].v;
        console.log(time)
        let tempTextDiv = document.querySelector('.temp-text');
                // Set its text content

                if(tempTextDiv){
                    tempTextDiv.textContent = "it is currently " + time + " in rancho cucamonga with a temperature of ";

                }

    });

fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${SHEET_TITLE}&range=R2:R2`)
    .then(res => res.text())
    .then(rep => {
        let data = JSON.parse(rep.substr(47).slice(0, -2));
        let time = data.table.rows[0].c[0].v;
        console.log(time + "aidjwioawd")
        let tempTextDiv = document.querySelector('.temp-text');
            if(tempTextDiv){
                tempTextDiv.textContent = tempTextDiv.textContent + Math.round(time * 9/5 + 32) + "° fahrenheit.";

            }

    });

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomNumberFloat(min, max){
    return Math.random() * (max-min) + min;
}

function spawnRain() {
    var cloud = document.createElement("img");
    cloud.src = "rain.png"; 
    cloud.classList.add("cloud");

    cloud.style.left = getRandomNumber(0, window.innerWidth - 95) + "px";
    cloud.style.top = -30 + "px";
    cloud.style.opacity = getRandomNumberFloat(0.01,0.3).toString(); 
    
    var size = getRandomNumber(50, 150);
    cloud.style.width = size + "px";
    cloud.style.height = "auto";
    
    document.body.appendChild(cloud);

    // Animation
    var speed = getRandomNumber(500, 1200); 
    var endPosition = window.innerHeight - 130 + window.scrollY;
    var interval = setInterval(function() {
        var currentPosition = parseFloat(cloud.style.top);
        if (currentPosition >= endPosition) {
            clearInterval(interval); 
            cloud.remove();
        } else {
            cloud.style.top = currentPosition + speed / 60 + "px"; 
        }
    }, 1000 / 60);
}