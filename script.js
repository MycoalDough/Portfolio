// Run this as early as possible (inline <script> in <head>)
const DURATION = 12000; // must match animation duration in ms
const elapsed = Date.now() % DURATION;

const style = document.createElement('style');
style.textContent = `body::after { animation-delay: -${elapsed}ms; }`;
document.head.appendChild(style);

function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function spawnCloud() {
    if (document.visibilityState != "visible") {
        return;
    }
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

    var interval = setInterval(function() {
        clearInterval(interval); 
        cloud.remove();

}, 25000);
}



function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomNumberFloat(min, max){
    return Math.random() * (max-min) + min;
}

function spawnRain() {
    if (document.visibilityState != "visible") {
        return;
    }
    var cloud = document.createElement("img");
    cloud.src = "rain.png"; 
    cloud.classList.add("cloud");
    cloud.id = "rain";

    cloud.style.left = getRandomNumber(0, window.innerWidth - 95) + "px";
    cloud.style.top = -30 + "px";
    cloud.style.opacity = getRandomNumberFloat(0.01,0.3).toString(); 
    
    var size = getRandomNumber(50, 150);
    cloud.style.width = size + "px";
    cloud.style.height = "auto";
    
    document.body.appendChild(cloud);

    var interval = setInterval(function() {
            clearInterval(interval); 
            cloud.remove();

    }, 1000);
}

setInterval(spawnCloud, getRandomNumber(10000,20000));
intervalRain = setInterval(spawnRain, getRandomNumber(100, 500)); 
intervalCloud = setInterval(spawnCloud, getRandomNumber(10000, 20000));


  
function filterProjects() {
    const filters = {
        AI: document.getElementById("checkboxAI").checked,
        GAME: document.getElementById("checkboxGAME").checked,
        SWE: document.getElementById("checkboxSWE").checked,
        FULLSTACK: document.getElementById("checkboxFULLSTACK").checked,
        OTHER: document.getElementById("checkboxOTHER").checked
    };

    const selectedTags = Object.keys(filters).filter(tag => filters[tag]);
    const projects = document.querySelectorAll(".project");

    projects.forEach(project => {
        const projectTags = (project.dataset.tags || "")
            .split(" ")
            .filter(Boolean);

        if (selectedTags.length === 0) {
            project.style.display = "block";
            return;
        }

        const matches = selectedTags.some(tag =>
            projectTags.includes(tag)
        );

        project.style.display = matches ? "block" : "none";
    });
}



const letters = "qwertyuiopasdfghjklzxcvbnm234567890!@#$%^&*()";

//let interval = null;

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

function initializeReverseButton() {
    const reverse = document.getElementById('reverseButton');

    if(reverse && reverse.dataset.bound !== 'true'){
        reverse.dataset.bound = 'true';
        reverse.addEventListener('click', function() {
        var rows = document.querySelectorAll('.row');
        if (!rows.length) {
            return;
        }
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
}

initializeReverseButton();

let SHEET_ID = '1nFR59bYCagHk8Hr_bFGLOLiBpILrPv0iIk4LMtH5EY0';
let SHEET_TITLE = 'Feed';
let SHEET_RANGE = 'R3:R3';

let FULL_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${SHEET_TITLE}&range=${SHEET_RANGE}`;



// Add event listener for visibility change

// Initial call in case the tab is already active when the page loads
document.addEventListener("DOMContentLoaded", function() {
    // Check if screen width is greater than 768px (not a phone size)
        let text = "";

        fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${SHEET_TITLE}&range=R1:R1`)
            .then(res => res.text())
            .then(rep => {
                let data = JSON.parse(rep.substr(47).slice(0, -2));
                let time = data.table.rows[0].c[0].v;
                if (window.innerWidth < 900) {
                    text += "its " + time + " and ";
                }else{
                    text += "it is currently " + time + " in san bernardino county with a temperature of ";
                }
                return fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${SHEET_TITLE}&range=R2:R2`);
            })
            .then(res => res.text())
            .then(rep => {
                let data = JSON.parse(rep.substr(47).slice(0, -2));
                let temperature = data.table.rows[0].c[0].v;
                text += Math.round(temperature * 9/5 + 32) + "° fahrenheit";
                if(window.innerWidth < 900){
                    text += " in sbc";
                }
                
                let tempTextDiv = document.querySelector('.temp-text');
                window.__portfolioTemperatureText = text;
                if (tempTextDiv) {
                    tempTextDiv.textContent = text;
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
});



const hoverSound = new Audio('/hover.mp3');
const unhoverSound = new Audio('/unhover.mp3');
const loadPageSound = new Audio('/loadpage.mp3');

hoverSound.preload = 'auto';
unhoverSound.preload = 'auto';
loadPageSound.preload = 'auto';

let portfolioAudioUnlocked = false;

window.unlockPortfolioAudio = function() {
    if (portfolioAudioUnlocked) {
        return;
    }

    portfolioAudioUnlocked = true;

    [hoverSound, unhoverSound, loadPageSound].forEach((audio) => {
        const previousVolume = audio.volume;
        audio.volume = 0;

        const playAttempt = audio.play();
        if (playAttempt) {
            playAttempt
                .then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = previousVolume;
                })
                .catch(() => {
                    portfolioAudioUnlocked = false;
                    audio.volume = previousVolume;
                });
        }
    });
};

document.addEventListener('pointerdown', window.unlockPortfolioAudio, { once: true, capture: true });
document.addEventListener('keydown', window.unlockPortfolioAudio, { once: true, capture: true });

window.addEventListener('DOMContentLoaded', (event) => {
    hoverSound.load();
    unhoverSound.load();
    loadPageSound.load();
});
function playHoverSound() {
    hoverSound.currentTime = 0;
    hoverSound.play().catch(() => {});
}

// Function to play unhover sound
function playUnhoverSound() {
    unhoverSound.currentTime = 0;
    unhoverSound.play().catch(() => {});
}

window.playLoadPageSound = function() {
    loadPageSound.currentTime = 0;
    loadPageSound.play().catch(() => {});
};


function playHover(){
    playHoverSound();
}

function playUNHover(){
    playUnhoverSound();
}


function filterContent() {
    const searchValue = document.getElementById('searchBox').value.toLowerCase();
    const rows = document.querySelectorAll('.row'); // Adjust this selector to target the correct rows

    rows.forEach(row => {
        const topText = row.querySelector('.top-left').textContent.toLowerCase();
        const bottomText = row.querySelector('.bottom').textContent.toLowerCase();
        const textContent = topText + ' ' + bottomText;
        
        if (!searchValue || textContent.includes(searchValue)) {
            row.style.display = '';
            highlightText(row, searchValue);
        } else {
            row.style.display = 'none';
        }
    });
}

function highlightText(row, searchValue) {
    const highlightClass = 'highlight';
    const innerHTMLs = [row.querySelector('.top-left'), row.querySelector('.bottom')];

    innerHTMLs.forEach(element => {
        let innerHTML = element.textContent;
        if (searchValue) {
            const re = new RegExp(searchValue, 'gi');
            innerHTML = innerHTML.replace(re, match => `<span class="${highlightClass}">${match}</span>`);
        }
        element.innerHTML = innerHTML;
    });
}


// Change text on hover and click


function initializeLofiEasterEgg() {
    let lofiImageDrawer = document.getElementById("lofi_image_drawer");
    
    if (lofiImageDrawer) {
        let randomChance = Math.random();

        if (randomChance <= 0.07) {
            lofiImageDrawer.src = "sans.png";
        }
    }

    let lofi_image_desk = document.getElementById("lofi_image_desk");
    
    if (lofi_image_desk) {
        let randomChance = Math.random();

        if (randomChance <= 0.07) {
            lofi_image_desk.src = "sans.png";
        }
    }
}

document.addEventListener("DOMContentLoaded", initializeLofiEasterEgg);


function initializeCopyButton() {
    const copyButton = document.getElementById('copyButton');
    const popup = document.getElementById('popup');

    if(copyButton && popup && copyButton.dataset.bound !== 'true'){
        copyButton.dataset.bound = 'true';
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText("mycoaldough@gmail.com").catch(function(error) {
                console.error("Failed to copy text: ", error);
            });
            popup.textContent = 'Copied!';
        });

        // Reset popup text when unhovered
        copyButton.addEventListener('mouseleave', () => {
            popup.textContent = 'Copy to clipboard';
        });
    }
}

initializeCopyButton();

document.addEventListener('portfolio:page-loaded', () => {
    initializeReverseButton();
    initializeLofiEasterEgg();
    initializeCopyButton();

    const tempText = document.querySelector('.temp-text');
    if (tempText && window.__portfolioTemperatureText) {
        tempText.textContent = window.__portfolioTemperatureText;
    }
});

// Every main page loads script.js, so this bootstraps seamless navigation
// even when a visitor lands directly on a subpage instead of the homepage.
if (!window.__portfolioPageSwapperRequested) {
    window.__portfolioPageSwapperRequested = true;
    const pageSwapper = document.createElement('script');
    pageSwapper.src = '/page-swapper.js?v=11';
    pageSwapper.defer = true;
    document.body.appendChild(pageSwapper);
}






