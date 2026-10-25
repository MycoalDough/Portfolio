const videoForm = document.getElementById('youtube-form');
const spotifyForm = document.getElementById('spotify-form');

function youtubeId(value) {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    let id;

    if (host === 'youtu.be' || host === 'www.youtu.be') {
        id = url.pathname.split('/')[1];
    } else if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
        const parts = url.pathname.split('/').filter(Boolean);
        id = parts[0] === 'watch' ? url.searchParams.get('v')
            : ['shorts', 'live', 'embed'].includes(parts[0]) ? parts[1] : null;
    }

    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) {
        throw new Error('Use a YouTube video link, such as youtube.com/watch?v=...');
    }
    return id;
}

function spotifyEntity(value) {
    const url = new URL(value);
    if (url.hostname.toLowerCase() !== 'open.spotify.com') {
        throw new Error('Use a link from open.spotify.com.');
    }

    const parts = url.pathname.split('/').filter(Boolean);
    if (/^intl-[a-z-]+$/i.test(parts[0] || '')) parts.shift();
    const [type, id] = parts;
    if (!['track', 'album', 'playlist', 'episode', 'show', 'artist'].includes(type) || !/^[A-Za-z0-9]{22}$/.test(id || '')) {
        throw new Error('Use a Spotify track, album, playlist, episode, show, or artist link.');
    }
    return { type, id };
}

videoForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const status = document.getElementById('youtube-status');
    try {
        const id = youtubeId(document.getElementById('youtube-url').value.trim());
        const iframe = document.createElement('iframe');
        iframe.title = 'YouTube video player';
        iframe.src = `https://www.youtube.com/embed/${id}?playsinline=1`;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        document.getElementById('youtube-frame').replaceChildren(iframe);
        status.textContent = 'Video loaded. Tap Play in the YouTube player.';
    } catch (error) {
        status.textContent = error.message;
    }
});

spotifyForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const status = document.getElementById('spotify-status');
    try {
        const { type, id } = spotifyEntity(document.getElementById('spotify-url').value.trim());
        const iframe = document.createElement('iframe');
        iframe.title = 'Spotify player';
        iframe.src = `https://open.spotify.com/embed/${type}/${id}`;
        iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.loading = 'lazy';
        document.getElementById('spotify-frame').replaceChildren(iframe);
        status.textContent = 'Music loaded. Tap Play in the Spotify player.';
    } catch (error) {
        status.textContent = error.message;
    }
});
