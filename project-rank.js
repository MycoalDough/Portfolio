document.addEventListener('DOMContentLoaded', () => {
    const projectsContainer = document.querySelector('.projects-container');
    const projects = Array.from(projectsContainer.children);

    // Save the original order in a custom data attribute
    projects.forEach((project, index) => {
        project.setAttribute('data-original-order', index);
    });

    toggleSortProjects();
});

function toggleSortProjects() {
    const checkbox = document.getElementById('sortCheckbox');
    const projectsContainer = document.querySelector('.projects-container');
    const projects = Array.from(projectsContainer.children);

    if (checkbox.checked) {
        // Sort projects by rank
        projects.sort((a, b) => {
            const rankA = parseInt(a.getAttribute('data-rank'));
            const rankB = parseInt(b.getAttribute('data-rank'));
            return rankA - rankB;
        });
    } else {
        // Sort projects back to their original order
        projects.sort((a, b) => {
            return a.getAttribute('data-original-order') - b.getAttribute('data-original-order');
        });
    }

    // Reorder the DOM elements
    projects.forEach(project => projectsContainer.appendChild(project));
}

document.addEventListener('DOMContentLoaded', () => {
    const projectsContainer = document.querySelector('.projects-container');
    const projects = Array.from(projectsContainer.children);

    // Save the original order in a custom data attribute
    projects.forEach((project, index) => {
        project.setAttribute('data-original-order', index);
    });

    toggleSortProjects();
});

function toggleSortProjects() {
    const checkbox = document.getElementById('sortCheckbox');
    const projectsContainer = document.querySelector('.projects-container');
    const projects = Array.from(projectsContainer.children);

    if (checkbox.checked) {
        // Sort projects by rank
        projects.sort((a, b) => {
            const rankA = parseInt(a.getAttribute('data-rank'));
            const rankB = parseInt(b.getAttribute('data-rank'));
            return rankA - rankB;
        });
    } else {
        // Sort projects back to their original order
        projects.sort((a, b) => {
            return a.getAttribute('data-original-order') - b.getAttribute('data-original-order');
        });
    }

    // Reorder the DOM elements
    projects.forEach(project => projectsContainer.appendChild(project));
}

document.addEventListener('DOMContentLoaded', () => {
    const projectsContainer = document.querySelector('.projects-container');
    const projects = Array.from(projectsContainer.children);

    // Save the original order in a custom data attribute
    projects.forEach((project, index) => {
        project.setAttribute('data-original-order', index);
    });

    toggleSortProjects();

    // **Set default button colors**
    document.querySelectorAll(".project").forEach(projectDiv => {
        const v1Button = projectDiv.querySelector(".version-button[data-version='v1']");
        const v2Button = projectDiv.querySelector(".version-button[data-version='v2']");
        
        if (v1Button && v2Button) {
            v1Button.classList.add("white");
            v2Button.classList.add("red");
        }
    });
});

function toggleSortProjects() {
    const checkbox = document.getElementById('sortCheckbox');
    const projectsContainer = document.querySelector('.projects-container');
    const projects = Array.from(projectsContainer.children);

    if (checkbox.checked) {
        // Sort projects by rank
        projects.sort((a, b) => {
            const rankA = parseInt(a.getAttribute('data-rank'));
            const rankB = parseInt(b.getAttribute('data-rank'));
            return rankA - rankB;
        });
    } else {
        // Sort projects back to their original order
        projects.sort((a, b) => {
            return a.getAttribute('data-original-order') - b.getAttribute('data-original-order');
        });
    }

    // Reorder the DOM elements
    projects.forEach(project => projectsContainer.appendChild(project));
}

if (window.location.pathname.includes("projects.html")) {
    document.querySelectorAll(".version-button").forEach(button => {
        button.addEventListener("click", () => {
            const projectDiv = button.closest(".project"); 

            const name = button.dataset.name;
            const year = button.dataset.year;
            const description = button.dataset.description;
            const imageSrc = button.dataset.imageSrc;
            const imageLink = button.dataset.imageLink;
            const link1 = button.dataset.youtubeLink;
            const link2 = button.dataset.itchioLink;

            // Update project name and set it as a clickable link to imageLink
            const projectName = projectDiv.querySelector("#project-name");
            projectName.textContent = name;
            projectName.href = imageLink; // Now links to imageLink

            projectDiv.querySelector("#project-year").textContent = year;
            projectDiv.querySelector("#project-description").textContent = description;

            const imageButton = projectDiv.querySelector("#project-image-button");
            imageButton.href = imageLink;
            imageButton.querySelector("img").src = imageSrc;

            const projectLinks = projectDiv.querySelectorAll("#project_link");
            projectLinks[0].href = link1; 
            projectLinks[1].href = link2;  

            // **Fix: Only affect buttons inside this project container**
            projectDiv.querySelectorAll(".version-button").forEach(b => {
                b.classList.remove("white", "red");
            });

            if (button.dataset.version === "v1") {
                button.classList.add("white"); 
                projectDiv.querySelector(".version-button[data-version='v2']").classList.add("red"); 
            } else {
                button.classList.add("white"); 
                projectDiv.querySelector(".version-button[data-version='v1']").classList.add("red");
            }

            // Impact Effect
            const impact = document.createElement("div");
            impact.classList.add("impact-effect");
            projectDiv.appendChild(impact);

            // Get the center of the project div
            const rect = projectDiv.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            impact.style.left = `${centerX}px`;
            impact.style.top = `${centerY}px`;

            // Remove the impact effect after 1 second
            setTimeout(() => {
                impact.remove();
            }, 1000);
        });
    });
}
