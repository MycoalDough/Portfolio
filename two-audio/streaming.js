const videoForm = document.getElementById('youtube-form');
const spotifyForm = document.getElementById('spotify-form');
const youtubeVolume = document.getElementById('youtube-volume');
const youtubeVolumeValue = document.getElementById('youtube-volume-value');
let youtubePlayer;
let youtubeLoad = 0;
let youtubeApiPromise;

function loadYouTubeApi() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (!youtubeApiPromise) {
        youtubeApiPromise = new Promise((resolve, reject) => {
            window.onYouTubeIframeAPIReady = () => resolve(window.YT);
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            script.onerror = () => reject(new Error('YouTube volume controls could not load.'));
            document.head.append(script);
        });
    }
    return youtubeApiPromise;
}

youtubeVolume.addEventListener('input', () => {
    youtubeVolumeValue.textContent = `${youtubeVolume.value}%`;
    youtubePlayer?.setVolume(Number(youtubeVolume.value));
});

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

videoForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('youtube-status');
    try {
        const id = youtubeId(document.getElementById('youtube-url').value.trim());
        const generation = ++youtubeLoad;
        youtubePlayer?.destroy();
        youtubePlayer = null;
        youtubeVolume.disabled = true;
        const iframe = document.createElement('iframe');
        iframe.id = 'youtube-embed';
        iframe.title = 'YouTube video player';
        const origin = location.protocol === 'https:' || location.protocol === 'http:' ? `&origin=${encodeURIComponent(location.origin)}` : '';
        iframe.src = `https://www.youtube.com/embed/${id}?playsinline=1&enablejsapi=1${origin}`;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        document.getElementById('youtube-frame').replaceChildren(iframe);
        status.textContent = 'Loading YouTube player…';
        window.audioHistory.addLink('youtube', `https://www.youtube.com/watch?v=${id}`, `YouTube video ${id}`);
        try {
            const YT = await Promise.race([
                loadYouTubeApi(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('YouTube API timed out.')), 12000)),
            ]);
            if (generation !== youtubeLoad) return;
            youtubePlayer = new YT.Player(iframe, {
                events: {
                    onReady: (readyEvent) => {
                        if (generation !== youtubeLoad) return;
                        youtubeVolume.disabled = false;
                        readyEvent.target.setVolume(Number(youtubeVolume.value));
                        status.textContent = 'Video ready. Tap Play in the YouTube player.';
                    },
                    onError: () => { if (generation === youtubeLoad) status.textContent = 'YouTube could not play this video here. Try another link or open it on YouTube.'; },
                },
            });
        } catch (_) {
            if (generation === youtubeLoad) status.textContent = 'Video loaded. Tap Play in the YouTube player. Its separate volume slider is unavailable.';
        }
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
        window.audioHistory.addLink('spotify', `https://open.spotify.com/${type}/${id}`, `Spotify ${type} ${id}`);
    } catch (error) {
        status.textContent = error.message;
    }
});

window.audioHistory.registerLoader('youtube', (entry) => {
    document.getElementById('youtube-url').value = entry.url;
    videoForm.requestSubmit();
});
window.audioHistory.registerLoader('spotify', (entry) => {
    document.getElementById('spotify-url').value = entry.url;
    spotifyForm.requestSubmit();
});
