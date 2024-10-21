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

