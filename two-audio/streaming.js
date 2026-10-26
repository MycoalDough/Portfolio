const youtubeDecks = Object.fromEntries(['1', '2'].map((key) => [key, {
    key,
    form: document.getElementById(`youtube-form-${key}`),
    urlInput: document.getElementById(`youtube-url-${key}`),
    nameInput: document.getElementById(`youtube-name-${key}`),
    status: document.getElementById(`youtube-status-${key}`),
    frame: document.getElementById(`youtube-frame-${key}`),
    volume: document.getElementById(`youtube-volume-${key}`),
    volumeValue: document.getElementById(`youtube-volume-value-${key}`),
    player: null,
    load: 0,
}]));

let youtubeApiPromise;

window.stopYouTubeForSleep = () => {
    Object.values(youtubeDecks).forEach((deck) => {
        deck.load += 1;
        if (!deck.frame.firstChild) return;
        try { deck.player?.stopVideo?.(); } catch (_) { /* Removing the iframe stops it too. */ }
        try { deck.player?.destroy?.(); } catch (_) { /* The iframe may already be gone. */ }
        deck.player = null;
        deck.frame.replaceChildren();
        deck.volume.disabled = true;
        deck.status.textContent = 'Sleep session ended. Tap Load to play this video again.';
        window.setYouTubePlaybackState?.(deck.key, false);
    });
};

function loadYouTubeApi() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (!youtubeApiPromise) {
        youtubeApiPromise = new Promise((resolve, reject) => {
            window.onYouTubeIframeAPIReady = () => resolve(window.YT);
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            script.onerror = () => reject(new Error('YouTube controls could not load.'));
            document.head.append(script);
        });
    }
    return youtubeApiPromise;
}

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
        throw new Error('Paste a YouTube video link, such as youtube.com/watch?v=...');
    }
    return id;
}

async function loadYouTube(deck, saveHistory = true) {
    try {
        const id = youtubeId(deck.urlInput.value.trim());
        const generation = ++deck.load;
        try { deck.player?.destroy?.(); } catch (_) { /* Replacing the iframe also stops it. */ }
        deck.player = null;
        deck.volume.disabled = true;
        const iframe = document.createElement('iframe');
        iframe.id = `youtube-embed-${deck.key}`;
        iframe.title = `YouTube player ${deck.key}`;
        const origin = ['https:', 'http:'].includes(location.protocol) ? `&origin=${encodeURIComponent(location.origin)}` : '';
        iframe.src = `https://www.youtube.com/embed/${id}?playsinline=1&enablejsapi=1${origin}`;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        deck.frame.replaceChildren(iframe);
        deck.status.textContent = 'Loading video…';
        if (saveHistory) window.audioHistory.addLink('youtube', `https://www.youtube.com/watch?v=${id}`, deck.nameInput.value.trim() || `YouTube video ${id}`);
        deck.nameInput.value = '';

        try {
            const YT = await Promise.race([
                loadYouTubeApi(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('YouTube API timed out.')), 12000)),
            ]);
            if (generation !== deck.load) return;
            deck.player = new YT.Player(iframe, {
                events: {
                    onReady: (event) => {
                        if (generation !== deck.load) return;
                        deck.volume.disabled = false;
                        event.target.setVolume(Number(deck.volume.value));
                        deck.status.textContent = 'Ready. Tap Play in the video.';
                    },
                    onStateChange: (event) => {
                        if (generation !== deck.load) return;
                        if (event.data === YT.PlayerState.PLAYING) window.setYouTubePlaybackState?.(deck.key, true);
                        if ([YT.PlayerState.PAUSED, YT.PlayerState.ENDED].includes(event.data)) window.setYouTubePlaybackState?.(deck.key, false);
                    },
                    onError: () => {
                        if (generation !== deck.load) return;
                        window.setYouTubePlaybackState?.(deck.key, false);
                        deck.status.textContent = 'This video could not play here. Try another link.';
                    },
                },
            });
        } catch (_) {
            if (generation === deck.load) deck.status.textContent = 'Video loaded. Tap Play in the video. Separate volume may be unavailable.';
        }
    } catch (error) {
        deck.status.textContent = error.message;
    }
}

Object.values(youtubeDecks).forEach((deck) => {
    deck.form.addEventListener('submit', (event) => {
        event.preventDefault();
        loadYouTube(deck);
    });
    deck.volume.addEventListener('input', () => {
        deck.volumeValue.textContent = `${deck.volume.value}%`;
        deck.player?.setVolume(Number(deck.volume.value));
    });
    window.audioHistory.registerLoader(`youtube-${deck.key}`, (entry) => {
        deck.urlInput.value = entry.url;
        deck.nameInput.value = entry.label;
        loadYouTube(deck);
    });
});

loadYouTube(youtubeDecks['1'], false);
