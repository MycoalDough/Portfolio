function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function applyPortfolioPageType() {
    document.body.classList.remove('site-project-detail');

    const breadcrumb = Array.from(document.querySelectorAll('.prompt-container .prompt'))
        .map((item) => item.textContent.toLowerCase())
        .join(' ');

    if (breadcrumb.includes('projects') && document.querySelector('#big-text')) {
        document.body.classList.add('site-project-detail');
    }
}

applyPortfolioPageType();

function initializeBreadcrumbNavigation() {
    const breadcrumb = document.querySelector('.prompt-container');
    if (!breadcrumb) {
        return;
    }

    const clickableItems = breadcrumb.querySelectorAll('.prompt[onclick*="location.href"]');

    clickableItems.forEach((item, index) => {
        const inlineHandler = item.getAttribute('onclick') || '';
        const destinationMatch = inlineHandler.match(/location\.href\s*=\s*['"]([^'"]+)['"]/);
        const destination = destinationMatch ? destinationMatch[1] : 'index.html';
        const isHome = index === 0 || /(^|\/)index\.html(?:$|[?#])/.test(destination);

        if (!isHome && item.id === 'main_button') {
            item.removeAttribute('id');
        }

        item.classList.add('breadcrumb-link');
        item.dataset.tooltip = isHome ? 'back to home' : 'back to projects';
        item.setAttribute('role', 'link');
        item.setAttribute('tabindex', '0');
        item.setAttribute('aria-label', `${item.textContent.trim()}, ${item.dataset.tooltip}`);

        if (item.dataset.keyboardBound !== 'true') {
            item.dataset.keyboardBound = 'true';
            item.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') {
                    return;
                }

                event.preventDefault();
                item.click();
            });
        }
    });

    const homeLink = breadcrumb.querySelector('#main_button');
    if (!homeLink || document.body.classList.contains('portfolio-home')) {
        return;
    }

    const guideKey = 'portfolio-home-navigation-guide-dismissed-v2';

    try {
        if (sessionStorage.getItem(guideKey)) {
            return;
        }
    } catch (_) {
        // The guide can still appear when storage is unavailable.
    }

    if (breadcrumb.querySelector('.home-navigation-guide')) {
        return;
    }

    const guide = document.createElement('aside');
    guide.className = 'home-navigation-guide';
    guide.setAttribute('role', 'note');
    guide.setAttribute('aria-label', 'Homepage navigation tip');
    guide.innerHTML = `
        <div class="home-navigation-guide-copy">
            <strong>↑ return home</strong>
            <span>Click <b>MYCOAL</b> anytime to go back to the homepage.</span>
        </div>
        <button type="button" aria-label="Dismiss navigation tip">×</button>
    `;

    const rememberGuide = () => {
        try {
            sessionStorage.setItem(guideKey, 'true');
        } catch (_) {
            // Dismissing still works when storage is unavailable.
        }
    };

    const closeGuide = () => {
        rememberGuide();
        guide.classList.add('is-closing');
        homeLink.classList.remove('has-home-guide');
        window.setTimeout(() => guide.remove(), 180);
    };

    guide.querySelector('button').addEventListener('click', closeGuide);
    homeLink.addEventListener('click', rememberGuide, { capture: true, once: true });
    homeLink.classList.add('has-home-guide');
    breadcrumb.appendChild(guide);
    requestAnimationFrame(() => guide.classList.add('is-visible'));
}

initializeBreadcrumbNavigation();

function initializeFirstVisitIntro() {
    const root = document.documentElement;

    if (
        !document.body.classList.contains('portfolio-home') ||
        !root.classList.contains('portfolio-intro-pending') ||
        window.__portfolioHomeIntroStarted
    ) {
        return;
    }

    window.__portfolioHomeIntroStarted = true;
    root.classList.add('portfolio-intro-running');

    const logo = document.querySelector('.home-header .prompt-container');
    const directoryLinks = document.querySelectorAll('.home-directory .nav a');

    if (logo) {
        const logoRect = logo.getBoundingClientRect();
        const destinationX = window.innerWidth * 0.5;
        const destinationY = window.innerHeight * 0.46;
        logo.style.setProperty('--intro-logo-x', `${destinationX - (logoRect.left + logoRect.width / 2)}px`);
        logo.style.setProperty('--intro-logo-y', `${destinationY - (logoRect.top + logoRect.height / 2)}px`);
    }

    directoryLinks.forEach((link, index) => {
        const irregularOffset = [0, 34, 12, 46][index % 4];
        link.style.setProperty('--intro-row-delay', `${720 + index * 45 + irregularOffset}ms`);
    });

    const stage = document.createElement('div');
    stage.className = 'portfolio-intro-stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = `
        <span class="portfolio-intro-scan portfolio-intro-scan--horizontal"></span>
        <span class="portfolio-intro-scan portfolio-intro-scan--vertical"></span>
        <span class="portfolio-intro-lock"></span>
    `;

    const skipButton = document.createElement('button');
    skipButton.className = 'portfolio-intro-skip';
    skipButton.type = 'button';
    skipButton.textContent = 'skip intro';

    document.body.append(stage, skipButton);

    let finished = false;
    const finishIntro = () => {
        if (finished) {
            return;
        }

        finished = true;
        window.clearTimeout(window.__portfolioIntroFallback);
        window.clearTimeout(window.__portfolioIntroTimer);

        try {
            localStorage.setItem('portfolio-home-intro-seen-v1', 'true');
        } catch (_) {
            // The animation still completes when storage is unavailable.
        }

        root.classList.remove('portfolio-intro-pending', 'portfolio-intro-running');
        logo?.style.removeProperty('--intro-logo-x');
        logo?.style.removeProperty('--intro-logo-y');
        directoryLinks.forEach((link) => link.style.removeProperty('--intro-row-delay'));
        stage.remove();
        skipButton.remove();
        document.removeEventListener('keydown', handleIntroKeydown);
    };

    const handleIntroKeydown = (event) => {
        if (event.key === 'Escape') {
            finishIntro();
        }
    };

    skipButton.addEventListener('click', finishIntro, { once: true });
    document.addEventListener('keydown', handleIntroKeydown);
    window.__portfolioIntroTimer = window.setTimeout(finishIntro, 1850);
}

initializeFirstVisitIntro();

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
    const projects = document.querySelectorAll('.projects-container .project');
    if (!projects.length) {
        return;
    }

    const filters = {
        AI: document.getElementById('checkboxAI')?.checked || false,
        GAME: document.getElementById('checkboxGAME')?.checked || false,
        SWE: document.getElementById('checkboxSWE')?.checked || false,
        FULLSTACK: document.getElementById('checkboxFULLSTACK')?.checked || false,
        OTHER: document.getElementById('checkboxOTHER')?.checked || false
    };

    const selectedTags = Object.keys(filters).filter(tag => filters[tag]);
    const searchValue = (document.getElementById('projectSearch')?.value || '').trim().toLowerCase();
    const selectedTech = (document.getElementById('techFilter')?.value || '').toLowerCase();
    let visibleCount = 0;

    projects.forEach(project => {
        const projectTags = (project.dataset.tags || "")
            .split(" ")
            .filter(Boolean);
        const projectTech = (project.dataset.tech || '')
            .split('|')
            .map((tech) => tech.trim().toLowerCase())
            .filter(Boolean);
        const categoryMatches = selectedTags.length === 0 || selectedTags.some(tag =>
            projectTags.includes(tag)
        );
        const techMatches = !selectedTech || projectTech.includes(selectedTech);
        const textMatches = !searchValue || `${project.textContent} ${project.dataset.tech || ''}`
            .toLowerCase()
            .includes(searchValue);
        const isVisible = categoryMatches && techMatches && textMatches;

        project.style.display = isVisible ? '' : 'none';
        visibleCount += isVisible ? 1 : 0;
    });

    const resultCount = document.getElementById('projectResultCount');
    if (resultCount) {
        resultCount.textContent = `${visibleCount} ${visibleCount === 1 ? 'file' : 'files'}`;
    }
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
            this.textContent = "sort / oldest";
        } else {
            this.textContent = "sort / recent";
        }
        
        reverseState++; // Increment reverseState
        });
    }
}

function initializeProjectsPage() {
    const projectsContainer = document.querySelector('.projects-container');
    const sortCheckbox = document.getElementById('sortCheckbox');

    if (!projectsContainer || !sortCheckbox) {
        return;
    }

    const projects = Array.from(projectsContainer.children).filter((project) =>
        project.classList.contains('project')
    );

    projects.forEach((project, index) => {
        if (!project.dataset.originalOrder) {
            project.dataset.originalOrder = String(index);
        }

        const projectInfo = project.querySelector('.project-info');
        if (projectInfo && !projectInfo.querySelector('.project-tech')) {
            const technologies = (project.dataset.tech || '')
                .split('|')
                .map((technology) => technology.trim())
                .filter(Boolean);

            if (technologies.length) {
                const techList = document.createElement('div');
                techList.className = 'project-tech';
                techList.setAttribute('aria-label', 'Technology stack');
                technologies.forEach((technology) => {
                    const label = document.createElement('span');
                    label.textContent = technology;
                    techList.appendChild(label);
                });
                projectInfo.appendChild(techList);
            }
        }
    });

    const techFilter = document.getElementById('techFilter');
    if (techFilter && techFilter.options.length <= 1) {
        const technologies = [...new Set(projects.flatMap((project) =>
            (project.dataset.tech || '').split('|').map((technology) => technology.trim()).filter(Boolean)
        ))].sort((a, b) => a.localeCompare(b));

        technologies.forEach((technology) => {
            const option = document.createElement('option');
            option.value = technology;
            option.textContent = technology;
            techFilter.appendChild(option);
        });
    }

    ['projectSearch', 'techFilter'].forEach((id) => {
        const control = document.getElementById(id);
        if (control && control.dataset.bound !== 'true') {
            control.dataset.bound = 'true';
            control.addEventListener(id === 'projectSearch' ? 'input' : 'change', filterProjects);
        }
    });

    const clearFilters = document.getElementById('clearProjectFilters');
    if (clearFilters && clearFilters.dataset.bound !== 'true') {
        clearFilters.dataset.bound = 'true';
        clearFilters.addEventListener('click', () => {
            document.querySelectorAll('.projects-filter-controls input[type="checkbox"]')
                .forEach((checkbox) => { checkbox.checked = false; });
            const search = document.getElementById('projectSearch');
            if (search) search.value = '';
            if (techFilter) techFilter.value = '';
            filterProjects();
        });
    }

    const sortProjects = () => {
        const sortedProjects = [...projects].sort((a, b) => {
            if (sortCheckbox.checked) {
                return Number(a.dataset.rank) - Number(b.dataset.rank);
            }

            return Number(a.dataset.originalOrder) - Number(b.dataset.originalOrder);
        });

        sortedProjects.forEach((project) => projectsContainer.appendChild(project));
    };

    if (sortCheckbox.dataset.bound !== 'true') {
        sortCheckbox.dataset.bound = 'true';
        sortCheckbox.addEventListener('change', sortProjects);
    }

    sortProjects();
    filterProjects();

    document.querySelectorAll('.version-button').forEach((button) => {
        const project = button.closest('.project');

        if (!project) {
            return;
        }

        const isActive = button.dataset.version === 'v1';
        button.classList.toggle('white', isActive);
        button.classList.toggle('red', !isActive);
        button.setAttribute('aria-pressed', String(isActive));

        if (button.dataset.bound === 'true') {
            return;
        }

        button.dataset.bound = 'true';
        button.addEventListener('click', () => {
            const projectName = project.querySelector('#project-name');
            const projectYear = project.querySelector('#project-year');
            const projectDescription = project.querySelector('#project-description');
            const imageButton = project.querySelector('#project-image-button');
            const projectLinks = project.querySelectorAll('#project_link');

            if (projectName) {
                projectName.textContent = button.dataset.name;
                projectName.href = button.dataset.imageLink;
            }

            if (projectYear) {
                projectYear.textContent = button.dataset.year;
            }

            if (projectDescription) {
                projectDescription.textContent = button.dataset.description;
            }

            if (imageButton) {
                imageButton.href = button.dataset.imageLink;
                const image = imageButton.querySelector('img');
                if (image) {
                    image.src = button.dataset.imageSrc;
                }
            }

            if (projectLinks[0]) {
                projectLinks[0].href = button.dataset.youtubeLink;
            }

            if (projectLinks[1]) {
                projectLinks[1].href = button.dataset.itchioLink;
            }

            project.querySelectorAll('.version-button').forEach((versionButton) => {
                const selected = versionButton === button;
                versionButton.classList.toggle('white', selected);
                versionButton.classList.toggle('red', !selected);
                versionButton.setAttribute('aria-pressed', String(selected));
            });
        });
    });
}

initializeProjectsPage();

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

function initializeDraggableWindows() {
    document.querySelectorAll('[data-draggable-window]').forEach((windowElement) => {
        if (windowElement.dataset.dragBound === 'true') {
            return;
        }

        windowElement.dataset.dragBound = 'true';
        windowElement.tabIndex = 0;
        if (!windowElement.getAttribute('aria-label')) {
            windowElement.setAttribute('aria-label', 'Moveable illustration');
        }

        windowElement.querySelectorAll('img').forEach((image) => {
            image.draggable = false;
            image.addEventListener('dragstart', (event) => event.preventDefault());
        });

        let activePointer = null;
        let startPointerX = 0;
        let startPointerY = 0;
        let startWindowX = 0;
        let startWindowY = 0;

        function readPosition() {
            return {
                x: Number(windowElement.dataset.windowX || 0),
                y: Number(windowElement.dataset.windowY || 0)
            };
        }

        function moveWindow(nextX, nextY) {
            const current = readPosition();
            const rect = windowElement.getBoundingClientRect();
            const baseLeft = rect.left - current.x;
            const baseTop = rect.top - current.y;
            const edge = 12;
            const minX = edge - baseLeft;
            const maxX = window.innerWidth - edge - rect.width - baseLeft;
            const minY = edge - baseTop;
            const maxY = Math.max(minY, window.innerHeight - edge - 48 - baseTop);
            const x = Math.min(Math.max(nextX, minX), maxX);
            const y = Math.min(Math.max(nextY, minY), maxY);

            windowElement.dataset.windowX = String(x);
            windowElement.dataset.windowY = String(y);
            windowElement.style.setProperty('--window-x', `${x}px`);
            windowElement.style.setProperty('--window-y', `${y}px`);
        }

        windowElement.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) {
                return;
            }

            if (event.target.closest('a, button, input, select, textarea')) {
                return;
            }

            const current = readPosition();
            activePointer = event.pointerId;
            startPointerX = event.clientX;
            startPointerY = event.clientY;
            startWindowX = current.x;
            startWindowY = current.y;
            windowElement.setPointerCapture(event.pointerId);
            windowElement.classList.add('is-dragging');
            event.preventDefault();
        });

        windowElement.addEventListener('pointermove', (event) => {
            if (event.pointerId !== activePointer) {
                return;
            }

            moveWindow(
                startWindowX + event.clientX - startPointerX,
                startWindowY + event.clientY - startPointerY
            );
        });

        function endDrag(event) {
            if (event.pointerId !== activePointer) {
                return;
            }

            activePointer = null;
            windowElement.classList.remove('is-dragging');
        }

        windowElement.addEventListener('pointerup', endDrag);
        windowElement.addEventListener('pointercancel', endDrag);
        windowElement.addEventListener('dblclick', () => moveWindow(0, 0));
        windowElement.addEventListener('keydown', (event) => {
            const distance = event.shiftKey ? 30 : 10;
            const current = readPosition();
            const directions = {
                ArrowLeft: [-distance, 0],
                ArrowRight: [distance, 0],
                ArrowUp: [0, -distance],
                ArrowDown: [0, distance]
            };

            if (!directions[event.key]) {
                return;
            }

            event.preventDefault();
            moveWindow(current.x + directions[event.key][0], current.y + directions[event.key][1]);
        });
    });
}

initializeDraggableWindows();

function initializeHomeMarquee() {
    const marquee = document.querySelector('.home-marquee');
    if (!marquee) {
        return;
    }

    const groups = marquee.querySelectorAll('.home-marquee-group');
    if (groups.length < 2) {
        return;
    }

    const firstGroup = groups[0];
    const secondGroup = groups[1];
    const originalMarkup = firstGroup.dataset.originalMarkup || firstGroup.innerHTML;
    firstGroup.dataset.originalMarkup = originalMarkup;
    firstGroup.innerHTML = originalMarkup;

    while (firstGroup.scrollWidth < marquee.clientWidth + 120) {
        firstGroup.insertAdjacentHTML('beforeend', originalMarkup);
    }

    secondGroup.innerHTML = firstGroup.innerHTML;
}

initializeHomeMarquee();

if (!window.__portfolioMarqueeResizeBound) {
    window.__portfolioMarqueeResizeBound = true;
    let marqueeResizeFrame = null;
    window.addEventListener('resize', () => {
        cancelAnimationFrame(marqueeResizeFrame);
        marqueeResizeFrame = requestAnimationFrame(initializeHomeMarquee);
    });
}

document.addEventListener('portfolio:page-loaded', () => {
    applyPortfolioPageType();
    initializeBreadcrumbNavigation();
    initializeReverseButton();
    initializeLofiEasterEgg();
    initializeCopyButton();
    initializeDraggableWindows();
    initializeHomeMarquee();
    initializeProjectsPage();

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
    pageSwapper.src = '/page-swapper.js?v=16';
    pageSwapper.defer = true;
    document.body.appendChild(pageSwapper);
}






