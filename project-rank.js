    const projectsContainer = document.querySelector('.projects-container');
    const sortCheckbox = document.getElementById('sortCheckbox');

    //if (!projectsContainer || !sortCheckbox) return;

    const projects = Array.from(projectsContainer.children);

    // Save the original order in a custom data attribute
    projects.forEach((project, index) => {
        project.setAttribute('data-original-order', index);
    });

    // Initial sort
    toggleSortProjects();

    // Add event listener to checkbox
    sortCheckbox.addEventListener('change', toggleSortProjects);

    // Set default button colors
    document.querySelectorAll(".project").forEach(projectDiv => {
        const v1Button = projectDiv.querySelector(".version-button[data-version='v1']");
        const v2Button = projectDiv.querySelector(".version-button[data-version='v2']");

        if (v1Button && v2Button) {
            v1Button.classList.add("white");
            v2Button.classList.add("red");
        }
    });

    // Add version button logic
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

            const projectName = projectDiv.querySelector("#project-name");
            projectName.textContent = name;
            projectName.href = imageLink;

            projectDiv.querySelector("#project-year").textContent = year;
            projectDiv.querySelector("#project-description").textContent = description;

            const imageButton = projectDiv.querySelector("#project-image-button");
            imageButton.href = imageLink;
            imageButton.querySelector("img").src = imageSrc;

            const projectLinks = projectDiv.querySelectorAll("#project_link");
            projectLinks[0].href = link1;
            projectLinks[1].href = link2;

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

            const impact = document.createElement("div");
            impact.classList.add("impact-effect");
            projectDiv.appendChild(impact);

            const rect = projectDiv.getBoundingClientRect();
            impact.style.left = `${rect.width / 2}px`;
            impact.style.top = `${rect.height / 2}px`;

            setTimeout(() => impact.remove(), 1000);
        });
    });

function toggleSortProjects() {
    const checkbox = document.getElementById('sortCheckbox');
    const projectsContainer = document.querySelector('.projects-container');
    const projects = Array.from(projectsContainer.children);

    if (!checkbox || !projectsContainer) return;

    if (checkbox.checked) {
        projects.sort((a, b) => {
            return parseInt(a.getAttribute('data-rank')) - parseInt(b.getAttribute('data-rank'));
        });
    } else {
        projects.sort((a, b) => {
            return a.getAttribute('data-original-order') - b.getAttribute('data-original-order');
        });
    }

    projects.forEach(project => projectsContainer.appendChild(project));
}
