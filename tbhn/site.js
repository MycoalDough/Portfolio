document.documentElement.classList.add('js');

const marqueeRebuilders = Array.from(document.querySelectorAll('.marquee-track'), (track) => {
    const firstGroup = track.querySelector('.marquee-group');
    const sequence = firstGroup.innerHTML;

    return () => {
        track.querySelectorAll('.marquee-group:not(:first-child)').forEach((group) => group.remove());
        firstGroup.innerHTML = sequence;

        // Keep the phrases close together, but repeat enough of them that a
        // complete group is always wider than the viewport.
        const targetWidth = window.innerWidth + 180;
        while (firstGroup.scrollWidth < targetWidth) {
            firstGroup.insertAdjacentHTML('beforeend', sequence);
        }

        const secondGroup = firstGroup.cloneNode(true);
        secondGroup.setAttribute('aria-hidden', 'true');
        track.appendChild(secondGroup);
    };
});

function rebuildMarquees() {
    marqueeRebuilders.forEach((rebuild) => rebuild());
}

rebuildMarquees();
document.fonts?.ready.then(rebuildMarquees);

let marqueeResizeTimer;
window.addEventListener('resize', () => {
    window.clearTimeout(marqueeResizeTimer);
    marqueeResizeTimer = window.setTimeout(rebuildMarquees, 120);
});

const revealItems = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }

            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        });
    }, {
        rootMargin: '0px 0px -6% 0px',
        threshold: 0.06
    });

    revealItems.forEach((item) => revealObserver.observe(item));
} else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
}

const ambientLayer = document.createElement('div');
ambientLayer.className = 'ambient-layer';
ambientLayer.setAttribute('aria-hidden', 'true');

for (let index = 0; index < 12; index += 1) {
    const drop = document.createElement('span');
    drop.className = 'ambient-drop';
    drop.style.left = `${4 + Math.random() * 92}%`;
    drop.style.setProperty('--drop-opacity', (0.08 + Math.random() * 0.16).toFixed(2));
    drop.style.setProperty('--drop-speed', `${8 + Math.random() * 8}s`);
    drop.style.setProperty('--drop-delay', `${-Math.random() * 14}s`);
    ambientLayer.appendChild(drop);
}

for (let index = 0; index < 2; index += 1) {
    const cloud = document.createElement('img');
    cloud.className = 'ambient-cloud';
    cloud.src = `../images/cloud${index + 1}.png`;
    cloud.alt = '';
    cloud.style.top = `${18 + index * 48}%`;
    cloud.style.setProperty('--cloud-size', `${90 + index * 35}px`);
    cloud.style.setProperty('--cloud-opacity', `${0.025 + index * 0.012}`);
    cloud.style.setProperty('--cloud-speed', `${48 + index * 17}s`);
    cloud.style.setProperty('--cloud-delay', `${-index * 26}s`);
    ambientLayer.appendChild(cloud);
}

document.body.prepend(ambientLayer);

const year = document.getElementById('year');
if (year) {
    year.textContent = new Date().getFullYear().toString();
}
