const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const statusElement = document.getElementById('status');
const playBothButton = document.getElementById('play-both');
const pauseBothButton = document.getElementById('pause-both');
const restartBothButton = document.getElementById('restart-both');

let audioContext;
let roomImpulse;

const decks = Object.fromEntries(['a', 'b'].map((key) => [key, {
    key,
    buffer: null,
    source: null,
    gain: null,
    dryGain: null,
    wetGain: null,
    offset: 0,
    startedAt: 0,
    playing: false,
    generation: 0,
    loadGeneration: 0,
    abortController: null,
    objectUrl: null,
    name: '',
    fileInput: document.getElementById(`file-${key}`),
    urlInput: document.getElementById(`url-${key}`),
    loadUrlButton: document.getElementById(`load-url-${key}`),
    loadState: document.getElementById(`load-state-${key}`),
    loadText: document.getElementById(`load-text-${key}`),
    loadProgress: document.getElementById(`load-progress-${key}`),
    nameElement: document.getElementById(`name-${key}`),
    durationElement: document.getElementById(`duration-${key}`),
    seekInput: document.getElementById(`seek-${key}`),
    currentElement: document.getElementById(`current-${key}`),
    totalElement: document.getElementById(`total-${key}`),
    toggleButton: document.getElementById(`toggle-${key}`),
    volumeInput: document.getElementById(`volume-${key}`),
    volumeValue: document.getElementById(`volume-value-${key}`),
    slowInput: document.getElementById(`slow-${key}`),
    slowValue: document.getElementById(`slow-value-${key}`),
    reverbInput: document.getElementById(`reverb-${key}`),
    reverbValue: document.getElementById(`reverb-value-${key}`),
    nativeAudio: document.getElementById(`native-${key}`),
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

function volumeGain(value) {
    // 1% is about -60 dB; 100% is the original level.
    return value === 0 ? 0 : 10 ** ((value - 100) * 0.03);
}

function speedOf(deck) { return Number(deck.slowInput.value) / 100; }

function createRoomImpulse(context) {
    const length = Math.floor(context.sampleRate * 2.2);
    const impulse = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
        const samples = impulse.getChannelData(channel);
        for (let i = 0; i < length; i += 1) {
            samples[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.8;
        }
    }
    return impulse;
}

function setReverb(deck) {
    if (!audioContext || !deck.dryGain) return;
    const amount = Number(deck.reverbInput.value) / 100;
    deck.dryGain.gain.setTargetAtTime(1 - amount * 0.5, audioContext.currentTime, 0.02);
    deck.wetGain.gain.setTargetAtTime(amount * 0.35, audioContext.currentTime, 0.02);
}

function ensureContext() {
    if (!AudioContextClass) throw new Error('This browser does not support Web Audio.');
    if (!audioContext) {
        audioContext = new AudioContextClass();
        roomImpulse = createRoomImpulse(audioContext);
        Object.values(decks).forEach((deck) => {
            deck.gain = audioContext.createGain();
            deck.gain.gain.value = volumeGain(Number(deck.volumeInput.value));
            deck.dryGain = audioContext.createGain();
            deck.wetGain = audioContext.createGain();
            const convolver = audioContext.createConvolver();
            convolver.buffer = roomImpulse;
            deck.gain.connect(deck.dryGain).connect(audioContext.destination);
            deck.gain.connect(convolver).connect(deck.wetGain).connect(audioContext.destination);
            setReverb(deck);
        });
    }
    return audioContext;
}

function positionOf(deck) {
    if (!deck.buffer) return 0;
    if (!deck.playing || !audioContext) return deck.offset;
    const elapsed = Math.max(0, audioContext.currentTime - deck.startedAt);
    return Math.min(deck.buffer.duration, deck.offset + elapsed * speedOf(deck));
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
    deck.nativeAudio.pause();
    if (deck.offset >= deck.buffer.duration - 0.01) deck.offset = 0;

    const source = audioContext.createBufferSource();
    source.buffer = deck.buffer;
    source.playbackRate.value = speedOf(deck);
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

function showLoad(deck, message, percent) {
    deck.loadState.hidden = false;
    deck.loadText.textContent = message;
    deck.loadProgress.hidden = false;
    if (Number.isFinite(percent)) deck.loadProgress.value = percent;
    else deck.loadProgress.removeAttribute('value');
}

function nextLoad(deck) {
    deck.abortController?.abort();
    return ++deck.loadGeneration;
}

async function loadBytes(deck, bytes, name, generation, blob, nativeUrl) {
    showLoad(deck, `Decoding ${name}…`);
    const context = ensureContext();
    const buffer = await context.decodeAudioData(bytes);
    if (deck.loadGeneration !== generation) return false;
    if (!Number.isFinite(buffer.duration) || buffer.duration <= 0) throw new Error('The audio has no playable duration.');
    pauseDeck(deck);
    deck.nativeAudio.pause();
    deck.nativeAudio.removeAttribute('src');
    deck.nativeAudio.load();
    if (deck.objectUrl) URL.revokeObjectURL(deck.objectUrl);
    deck.objectUrl = nativeUrl ? null : URL.createObjectURL(blob);
    deck.nativeAudio.src = nativeUrl || deck.objectUrl;
    deck.buffer = buffer;
    deck.offset = 0;
    deck.name = name;
    renderControls();
    showLoad(deck, 'Ready to play', 100);
    setStatus(`Loaded ${name}. ${decks.a.buffer && decks.b.buffer ? 'Tap Play both to mix them.' : 'Choose audio for the other track.'}`);
    return true;
}

function reportLoadError(deck, error) {
    console.error(error);
    deck.loadState.hidden = false;
    deck.loadProgress.hidden = true;
    deck.loadText.textContent = `Could not load: ${error.message}`;
    setStatus(`Could not load track ${deck.key.toUpperCase()}: ${error.message}`);
}

async function loadLocalFile(deck, file, name = file.name, save = true) {
    const generation = nextLoad(deck);
    showLoad(deck, `Reading ${name}…`);
    try {
        const loaded = await loadBytes(deck, await file.arrayBuffer(), name, generation, file);
        if (loaded && save) {
            const saved = await window.audioHistory.addFile(file);
            if (!saved) setStatus(`${name} is ready. Its name is in history, but choose the file again after reloading.`);
        }
    } catch (error) {
        if (deck.loadGeneration === generation) reportLoadError(deck, error);
    }
}

async function readResponseWithProgress(deck, response, generation) {
    const total = Number(response.headers.get('content-length')) || 0;
    if (!response.body?.getReader) {
        const bytes = await response.arrayBuffer();
        showLoad(deck, `Downloaded ${(bytes.byteLength / 1048576).toFixed(1)} MB`, 100);
        return bytes;
    }
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (deck.loadGeneration !== generation) throw new Error('Loading cancelled.');
        chunks.push(value);
        received += value.length;
        const amount = `${(received / 1048576).toFixed(1)} MB${total ? ` / ${(total / 1048576).toFixed(1)} MB` : ''}`;
        const percent = total ? Math.min(100, received / total * 100) : undefined;
        showLoad(deck, `Downloading ${amount}${total ? ` · ${Math.round(percent)}%` : ''}`, percent);
    }
    const bytes = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes.buffer;
}

async function loadAudioUrl(deck, value) {
    let url;
    try {
        url = new URL(value.trim());
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use http or https.');
    } catch (_) {
        setStatus(`Track ${deck.key.toUpperCase()}: paste a complete direct audio URL first.`);
        return;
    }

    const generation = nextLoad(deck);
    let name;
    try { name = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || 'Online audio'); }
    catch (_) { name = 'Online audio'; }
    window.audioHistory.addLink('audio-url', url.href, name);
    deck.abortController = new AbortController();
    showLoad(deck, 'Connecting to audio link…');
    deck.nativeAudio.pause();
    if (deck.objectUrl) { URL.revokeObjectURL(deck.objectUrl); deck.objectUrl = null; }
    deck.nativeAudio.src = url.href;
    try {
        const response = await fetch(url.href, { signal: deck.abortController.signal });
        if (!response.ok) throw new Error(`The link returned HTTP ${response.status}.`);
        const type = response.headers.get('content-type') || '';
        if (type.includes('text/html')) throw new Error('That link opens a webpage. Use a direct audio file URL.');
        const bytes = await readResponseWithProgress(deck, response, generation);
        if (deck.loadGeneration !== generation) return;
        await loadBytes(deck, bytes, name, generation, null, url.href);
    } catch (error) {
        if (deck.loadGeneration !== generation || error.name === 'AbortError') return;
        const detail = error instanceof TypeError
            ? 'The mixer could not fetch this link (often CORS). The native player below may still play it.'
            : error.name === 'EncodingError'
                ? 'The mixer could not decode this audio. The native player below may still play it.'
            : error.message;
        reportLoadError(deck, new Error(detail));
    }
}

Object.values(decks).forEach((deck) => {
    deck.fileInput.addEventListener('change', () => {
        const file = deck.fileInput.files?.[0];
        if (file) loadLocalFile(deck, file);
    });

    deck.loadUrlButton.addEventListener('click', () => loadAudioUrl(deck, deck.urlInput.value));
    window.audioHistory.registerLoader(deck.key, async (entry) => {
        if (entry.kind === 'file') {
            try {
                const file = await window.audioHistory.getFile(entry.id);
                if (!file) throw new Error('Saved file is unavailable. Choose it again.');
                loadLocalFile(deck, file, entry.label, false);
            } catch (error) { reportLoadError(deck, error); }
        } else {
            deck.urlInput.value = entry.url;
            loadAudioUrl(deck, entry.url);
        }
    });

    deck.nativeAudio.addEventListener('play', () => {
        pauseDeck(deck);
        renderControls();
        setStatus(`Playing ${deck.name} in the native player. Use your phone's volume buttons.`);
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
        deck.volumeValue.textContent = `${deck.volumeInput.value}%`;
        if (deck.gain && audioContext) deck.gain.gain.setTargetAtTime(volumeGain(Number(deck.volumeInput.value)), audioContext.currentTime, 0.015);
    });

    deck.slowInput.addEventListener('input', () => {
        const oldSpeed = Number(deck.slowValue.dataset.speed || 1);
        const wasPlaying = deck.playing;
        if (wasPlaying) {
            deck.offset = Math.min(deck.buffer.duration, deck.offset + Math.max(0, audioContext.currentTime - deck.startedAt) * oldSpeed);
            deck.playing = false;
            deck.generation += 1;
            deck.source.onended = null;
            deck.source.stop();
            deck.source.disconnect();
            deck.source = null;
        }
        const speed = speedOf(deck);
        deck.slowValue.textContent = `${speed.toFixed(2)}×`;
        deck.slowValue.dataset.speed = String(speed);
        if (wasPlaying) startDeck(deck, audioContext.currentTime + 0.02);
        renderControls();
    });

    deck.reverbInput.addEventListener('input', () => {
        deck.reverbValue.textContent = `${deck.reverbInput.value}%`;
        setReverb(deck);
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
        setStatus('Both tracks are playing. Adjust each volume and effect below.');
        renderControls();
    } catch (error) {
        setStatus(error.message);
    }
});

pauseBothButton.addEventListener('click', () => {
    pauseDeck(decks.a);
    pauseDeck(decks.b);
    decks.a.nativeAudio.pause();
    decks.b.nativeAudio.pause();
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

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && audioContext?.state === 'suspended' && Object.values(decks).some((deck) => deck.playing)) {
        setStatus('The audio mixer paused in the background. Tap Play to resume, or use the native background player.');
    }
});

if (!AudioContextClass) {
    setStatus('This browser does not support the audio mixer. Try a current version of Safari.');
}
renderControls();
requestAnimationFrame(renderProgress);
