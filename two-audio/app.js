const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const statusElement = document.getElementById('status');
const playBothButton = document.getElementById('play-both');
const pauseBothButton = document.getElementById('pause-both');
const restartBothButton = document.getElementById('restart-both');

let audioContext;

const decks = Object.fromEntries(['a', 'b'].map((key) => [key, {
    key,
    buffer: null,
    source: null,
    gain: null,
    offset: 0,
    startedAt: 0,
    playing: false,
    generation: 0,
    loadGeneration: 0,
    name: '',
    fileInput: document.getElementById(`file-${key}`),
    urlInput: document.getElementById(`url-${key}`),
    loadUrlButton: document.getElementById(`load-url-${key}`),
    nameElement: document.getElementById(`name-${key}`),
    durationElement: document.getElementById(`duration-${key}`),
    seekInput: document.getElementById(`seek-${key}`),
    currentElement: document.getElementById(`current-${key}`),
    totalElement: document.getElementById(`total-${key}`),
    toggleButton: document.getElementById(`toggle-${key}`),
    volumeInput: document.getElementById(`volume-${key}`),
    volumeValue: document.getElementById(`volume-value-${key}`),
}]));

function setStatus(message) {
    statusElement.textContent = message;
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    const whole = Math.floor(Math.max(0, seconds));
    const minutes = Math.floor(whole / 60);
    return `${minutes}:${String(whole % 60).padStart(2, '0')}`;
}

function ensureContext() {
    if (!AudioContextClass) throw new Error('This browser does not support Web Audio.');
    if (!audioContext) {
        audioContext = new AudioContextClass();
        Object.values(decks).forEach((deck) => {
            deck.gain = audioContext.createGain();
            deck.gain.gain.value = Number(deck.volumeInput.value) / 100;
            deck.gain.connect(audioContext.destination);
        });
    }
    return audioContext;
}

function positionOf(deck) {
    if (!deck.buffer) return 0;
    if (!deck.playing || !audioContext) return deck.offset;
    const elapsed = Math.max(0, audioContext.currentTime - deck.startedAt);
    return Math.min(deck.buffer.duration, deck.offset + elapsed);
}

function pauseDeck(deck) {
    if (!deck.playing) return;
    const position = positionOf(deck);
    deck.playing = false;
    deck.generation += 1;
    if (deck.source) {
        deck.source.onended = null;
        try { deck.source.stop(); } catch (_) { /* It may have already ended. */ }
        deck.source.disconnect();
        deck.source = null;
    }
    deck.offset = position;
}

function startDeck(deck, when) {
    if (!deck.buffer) return;
    if (deck.playing) pauseDeck(deck);
    if (deck.offset >= deck.buffer.duration - 0.01) deck.offset = 0;

    const source = audioContext.createBufferSource();
    source.buffer = deck.buffer;
    source.connect(deck.gain);
    deck.source = source;
    deck.playing = true;
    deck.startedAt = when;
    const generation = ++deck.generation;
    source.onended = () => {
        if (deck.generation !== generation || !deck.playing) return;
        source.disconnect();
        deck.source = null;
        deck.playing = false;
        deck.offset = 0;
        renderControls();
    };
    source.start(when, deck.offset);
}

function unlockAudio() {
    const context = ensureContext();
    // resume() is called from the tap handler, as required on iPhone.
    context.resume().catch(() => setStatus('Audio could not start. Tap Play again.'));
    return context;
}

function renderControls() {
    const bothReady = Boolean(decks.a.buffer && decks.b.buffer);
    const anyPlaying = decks.a.playing || decks.b.playing;
    playBothButton.disabled = !bothReady;
    restartBothButton.disabled = !bothReady;
    pauseBothButton.disabled = !anyPlaying;

    Object.values(decks).forEach((deck) => {
        deck.toggleButton.disabled = !deck.buffer;
        deck.toggleButton.textContent = `${deck.playing ? 'Pause' : 'Play'} ${deck.key.toUpperCase()}`;
        deck.seekInput.disabled = !deck.buffer;
        deck.nameElement.textContent = deck.name || 'No audio loaded';
        deck.durationElement.textContent = deck.buffer
            ? `${formatTime(deck.buffer.duration)} · ready to mix`
            : 'MP3, M4A, or another format your browser supports';
        deck.totalElement.textContent = formatTime(deck.buffer?.duration || 0);
    });
}

function renderProgress() {
    Object.values(decks).forEach((deck) => {
        const position = positionOf(deck);
        deck.currentElement.textContent = formatTime(position);
        if (deck.buffer && document.activeElement !== deck.seekInput) {
            deck.seekInput.value = String(Math.round(position / deck.buffer.duration * 1000));
        }
    });
    requestAnimationFrame(renderProgress);
}

async function loadBytes(deck, bytes, name, generation) {
    const context = ensureContext();
    const buffer = await context.decodeAudioData(bytes);
    if (deck.loadGeneration !== generation) return;
    if (!Number.isFinite(buffer.duration) || buffer.duration <= 0) throw new Error('The audio has no playable duration.');
    pauseDeck(deck);
    deck.buffer = buffer;
    deck.offset = 0;
    deck.name = name;
    renderControls();
    setStatus(`Loaded ${name}. ${decks.a.buffer && decks.b.buffer ? 'Tap Play both to mix them.' : 'Choose audio for the other track.'}`);
}

function reportLoadError(deck, error) {
    console.error(error);
    setStatus(`Could not load track ${deck.key.toUpperCase()}: ${error.message}`);
}

Object.values(decks).forEach((deck) => {
    deck.fileInput.addEventListener('change', async () => {
        const file = deck.fileInput.files?.[0];
        if (!file) return;
        const generation = ++deck.loadGeneration;
        setStatus(`Loading ${file.name}…`);
        try {
            await loadBytes(deck, await file.arrayBuffer(), file.name, generation);
        } catch (error) {
            if (deck.loadGeneration === generation) reportLoadError(deck, error);
        }
    });

    deck.loadUrlButton.addEventListener('click', async () => {
        let url;
        try {
            url = new URL(deck.urlInput.value.trim());
            if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an http or https audio link.');
        } catch (_) {
            setStatus(`Track ${deck.key.toUpperCase()}: paste a complete direct audio URL first.`);
            return;
        }

        const generation = ++deck.loadGeneration;
        setStatus(`Loading track ${deck.key.toUpperCase()} from its URL…`);
        try {
            const response = await fetch(url.href);
            if (!response.ok) throw new Error(`The link returned HTTP ${response.status}.`);
            if (response.headers.get('content-type')?.includes('text/html')) {
                throw new Error('That link opens a webpage. Paste a direct audio file URL instead.');
            }
            const name = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || 'Online audio');
            await loadBytes(deck, await response.arrayBuffer(), name, generation);
        } catch (error) {
            if (deck.loadGeneration === generation) {
                const detail = error instanceof TypeError
                    ? 'The audio server blocked browser access (CORS), or the link could not be reached.'
                    : error.message;
                reportLoadError(deck, new Error(detail));
            }
        }
    });

    deck.toggleButton.addEventListener('click', () => {
        if (deck.playing) {
            pauseDeck(deck);
            setStatus(`Paused track ${deck.key.toUpperCase()}.`);
        } else {
            try {
                const context = unlockAudio();
                startDeck(deck, context.currentTime + 0.06);
                setStatus(`Playing track ${deck.key.toUpperCase()}.`);
            } catch (error) {
                setStatus(error.message);
            }
        }
        renderControls();
    });

    deck.seekInput.addEventListener('change', () => {
        if (!deck.buffer) return;
        const wasPlaying = deck.playing;
        pauseDeck(deck);
        deck.offset = deck.buffer.duration * Number(deck.seekInput.value) / 1000;
        if (wasPlaying) {
            try {
                const context = unlockAudio();
                startDeck(deck, context.currentTime + 0.04);
            } catch (error) {
                setStatus(error.message);
            }
        }
        renderControls();
    });

    deck.volumeInput.addEventListener('input', () => {
        const value = Number(deck.volumeInput.value) / 100;
        deck.volumeValue.textContent = `${deck.volumeInput.value}%`;
        if (deck.gain && audioContext) deck.gain.gain.setTargetAtTime(value, audioContext.currentTime, 0.015);
    });
});

playBothButton.addEventListener('click', () => {
    if (!decks.a.buffer || !decks.b.buffer) return;
    try {
        const context = unlockAudio();
        pauseDeck(decks.a);
        pauseDeck(decks.b);
        const when = context.currentTime + 0.08;
        startDeck(decks.a, when);
        startDeck(decks.b, when);
        setStatus('Both tracks are playing. Adjust each volume below.');
        renderControls();
    } catch (error) {
        setStatus(error.message);
    }
});

pauseBothButton.addEventListener('click', () => {
    pauseDeck(decks.a);
    pauseDeck(decks.b);
    setStatus('Both tracks paused.');
    renderControls();
});

restartBothButton.addEventListener('click', () => {
    if (!decks.a.buffer || !decks.b.buffer) return;
    try {
        const context = unlockAudio();
        pauseDeck(decks.a);
        pauseDeck(decks.b);
        decks.a.offset = 0;
        decks.b.offset = 0;
        const when = context.currentTime + 0.08;
        startDeck(decks.a, when);
        startDeck(decks.b, when);
        setStatus('Both tracks restarted together.');
        renderControls();
    } catch (error) {
        setStatus(error.message);
    }
});

if (!AudioContextClass) {
    setStatus('This browser does not support the audio mixer. Try a current version of Safari.');
}
renderControls();
requestAnimationFrame(renderProgress);
