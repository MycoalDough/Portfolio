const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const statusElement = document.getElementById('status');
const playBothButton = document.getElementById('play-both');
const playBothQuickButton = document.getElementById('play-both-quick');
const pauseBothButton = document.getElementById('pause-both');
const restartBothButton = document.getElementById('restart-both');
const blackScreenButton = document.getElementById('black-screen-button');
const blackScreenOverlay = document.getElementById('black-screen-overlay');
const blackScreenExit = document.getElementById('black-screen-exit');
const blackScreenStatus = document.getElementById('black-screen-status');
const sleepTimerStatus = document.getElementById('sleep-timer-status');
const resetSleepTimerButton = document.getElementById('reset-sleep-timer');
const MAX_MIXER_BYTES = 12 * 1024 * 1024;
const SLEEP_DURATION_MS = 90 * 60 * 1000;

let audioContext;
let roomImpulse;
let sleepDeadline = null;
let sleepTickInterval = null;
let sleepDeadlineTimeout = null;
let sleepIdleTimeout = null;
let sleepEnding = false;
let sleepSawPlayback = false;
const youtubePlaying = new Set();

const decks = Object.fromEntries(['a', 'b'].map((key) => [key, {
    key,
    buffer: null,
    source: null,
    streamAudio: null,
    streamSource: null,
    streamReady: false,
    gain: null,
    dryGain: null,
    wetGain: null,
    offset: 0,
    startedAt: 0,
    playing: false,
    loop: false,
    generation: 0,
    loadGeneration: 0,
    abortController: null,
    objectUrl: null,
    name: '',
    pendingName: '',
    fileInput: document.getElementById(`file-${key}`),
    historyNameInput: document.getElementById(`history-name-${key}`),
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
    loopButton: document.getElementById(`loop-${key}`),
    volumeInput: document.getElementById(`volume-${key}`),
    volumeValue: document.getElementById(`volume-value-${key}`),
    slowInput: document.getElementById(`slow-${key}`),
    slowValue: document.getElementById(`slow-value-${key}`),
    reverbInput: document.getElementById(`reverb-${key}`),
    reverbValue: document.getElementById(`reverb-value-${key}`),
    slowPresetButton: document.getElementById(`preset-slow-${key}`),
    normalPresetButton: document.getElementById(`preset-normal-${key}`),
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
function mixerReady(deck) { return Boolean(deck.buffer || deck.streamReady); }
function durationOf(deck) {
    const duration = deck.buffer?.duration ?? deck.streamAudio?.duration;
    return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

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
    if (deck.streamReady && !deck.buffer) return deck.playing ? deck.streamAudio.currentTime : deck.offset;
    if (!deck.buffer) return 0;
    if (!deck.playing || !audioContext) return deck.offset;
    const elapsed = Math.max(0, audioContext.currentTime - deck.startedAt);
    const position = deck.offset + elapsed * speedOf(deck);
    return deck.loop ? position % deck.buffer.duration : Math.min(deck.buffer.duration, position);
}

function pauseDeck(deck) {
    if (!deck.playing) return;
    if (deck.streamReady && !deck.buffer) {
        deck.offset = deck.streamAudio.currentTime || 0;
        deck.playing = false;
        deck.generation += 1;
        deck.streamAudio.pause();
        return;
    }
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
    if (!mixerReady(deck)) return;
    if (deck.playing) pauseDeck(deck);
    deck.nativeAudio.pause();
    if (deck.streamReady && !deck.buffer) {
        const media = deck.streamAudio;
        if (durationOf(deck) && deck.offset >= durationOf(deck) - 0.01) deck.offset = 0;
        if (Math.abs(media.currentTime - deck.offset) > 0.05) media.currentTime = deck.offset;
        media.playbackRate = speedOf(deck);
        media.loop = deck.loop;
        deck.playing = true;
        const generation = ++deck.generation;
        media.play().catch(() => {
            if (deck.generation !== generation) return;
            deck.playing = false;
            renderControls();
            setStatus(`Track ${deck.key.toUpperCase()} could not start in the streaming mixer. Try quick play below.`);
        });
        return;
    }
    if (deck.offset >= deck.buffer.duration - 0.01) deck.offset = 0;

    const source = audioContext.createBufferSource();
    source.buffer = deck.buffer;
    source.loop = deck.loop;
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

function anyLocalAudioPlaying() {
    return Object.values(decks).some((deck) => deck.playing || !deck.nativeAudio.paused);
}

function anyPlayback() {
    return anyLocalAudioPlaying() || youtubePlaying.size > 0;
}

function sleepTimeLeft() {
    const seconds = Math.max(0, Math.ceil((sleepDeadline - Date.now()) / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function clearSleepTimer(message = 'Ready. Starts when local audio plays or black screen opens.') {
    clearInterval(sleepTickInterval);
    clearTimeout(sleepDeadlineTimeout);
    clearTimeout(sleepIdleTimeout);
    sleepTickInterval = null;
    sleepDeadlineTimeout = null;
    sleepIdleTimeout = null;
    sleepDeadline = null;
    sleepSawPlayback = false;
    sleepTimerStatus.textContent = message;
    resetSleepTimerButton.disabled = true;
}

function endSleepSession(message) {
    if (sleepEnding || sleepDeadline === null) return;
    sleepEnding = true;
    pauseDeck(decks.a);
    pauseDeck(decks.b);
    decks.a.nativeAudio.pause();
    decks.b.nativeAudio.pause();
    audioContext?.suspend().catch(() => {});
    window.stopYouTubeForSleep?.();
    if (blackScreenWanted) closeBlackScreen();
    clearSleepTimer(message);
    renderControls();
    setStatus(message);
    sleepEnding = false;
}

function tickSleepTimer() {
    if (sleepDeadline === null) return;
    if (Date.now() >= sleepDeadline) {
        endSleepSession('Sleep mode finished after 1 hour 30 minutes. Audio stopped and the screen wake lock was released.');
        return;
    }
    sleepTimerStatus.textContent = `${sleepTimeLeft()} remaining. Stops audio and exits dark screen when time is up.`;
}

function setSleepDeadline() {
    clearInterval(sleepTickInterval);
    clearTimeout(sleepDeadlineTimeout);
    sleepDeadline = Date.now() + SLEEP_DURATION_MS;
    resetSleepTimerButton.disabled = false;
    tickSleepTimer();
    sleepTickInterval = setInterval(tickSleepTimer, 1000);
    sleepDeadlineTimeout = setTimeout(tickSleepTimer, SLEEP_DURATION_MS);
}

function syncSleepSession(anyPlaying) {
    if (sleepEnding) return;
    if (anyPlaying) {
        clearTimeout(sleepIdleTimeout);
        sleepIdleTimeout = null;
        sleepSawPlayback = true;
        if (sleepDeadline === null) setSleepDeadline();
    } else if (sleepSawPlayback && sleepDeadline !== null && sleepIdleTimeout === null) {
        sleepIdleTimeout = setTimeout(() => {
            sleepIdleTimeout = null;
            if (!anyPlayback()) endSleepSession('Playback stopped. Sleep timer reset and dark screen ended.');
        }, 1500);
    }
}

window.setYouTubePlaybackState = (key, playing) => {
    if (playing) youtubePlaying.add(key);
    else youtubePlaying.delete(key);
    syncSleepSession(anyPlayback());
};

function renderControls() {
    const bothReady = mixerReady(decks.a) && mixerReady(decks.b);
    const anyPlaying = anyLocalAudioPlaying();
    playBothButton.disabled = !bothReady;
    playBothQuickButton.disabled = !decks.a.nativeAudio.src || !decks.b.nativeAudio.src;
    restartBothButton.disabled = !bothReady;
    pauseBothButton.disabled = !anyPlaying;

    Object.values(decks).forEach((deck) => {
        deck.toggleButton.disabled = !mixerReady(deck);
        deck.toggleButton.textContent = `${deck.playing ? 'Pause' : 'Play'} ${deck.key.toUpperCase()}`;
        deck.seekInput.disabled = !durationOf(deck);
        deck.nameElement.textContent = deck.name || 'No audio loaded';
        deck.durationElement.textContent = mixerReady(deck)
            ? `${formatTime(durationOf(deck))} · ${deck.streamReady ? 'streaming mixer' : 'ready to mix'}`
            : 'MP3, M4A, or another format your browser supports';
        deck.totalElement.textContent = formatTime(durationOf(deck));
    });
    syncSleepSession(anyPlaying || youtubePlaying.size > 0);
}

resetSleepTimerButton.addEventListener('click', () => {
    if (sleepDeadline === null || (!anyPlayback() && !blackScreenWanted)) return;
    setSleepDeadline();
    setStatus('Sleep timer reset to 1 hour 30 minutes.');
});

function renderProgress() {
    Object.values(decks).forEach((deck) => {
        const position = positionOf(deck);
        deck.currentElement.textContent = formatTime(position);
        if (durationOf(deck) && document.activeElement !== deck.seekInput) {
            deck.seekInput.value = String(Math.round(position / durationOf(deck) * 1000));
        }
    });
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

function beginLoad(deck, name) {
    pauseDeck(deck);
    clearStream(deck);
    deck.buffer = null;
    deck.offset = 0;
    deck.name = name;
    deck.pendingName = name;
    renderControls();
}

function skipMixer(deck, name, reason = 'is too large for the effects mixer (12 MB limit)') {
    const message = `${name} ${reason}. Use quick play below.`;
    deck.loadState.hidden = false;
    deck.loadProgress.hidden = true;
    deck.loadText.textContent = message;
    setStatus(message);
}

function clearStream(deck) {
    deck.streamReady = false;
    deck.streamSource?.disconnect();
    deck.streamSource = null;
    if (deck.streamAudio) {
        deck.streamAudio.pause();
        deck.streamAudio.removeAttribute('src');
        deck.streamAudio.load();
        deck.streamAudio.remove();
        deck.streamAudio = null;
    }
}

async function prepareStream(deck, url, name, generation, remote) {
    if (deck.loadGeneration !== generation) return false;
    showLoad(deck, `Checking ${name} for streaming playback…`);
    const media = document.createElement('audio');
    media.hidden = true;
    media.preload = 'metadata';
    media.loop = deck.loop;
    if (remote) media.crossOrigin = 'anonymous';
    deck.streamAudio = media;
    document.body.appendChild(media);

    const metadata = new Promise((resolve) => {
        const finish = (ready) => {
            clearTimeout(timeout);
            media.removeEventListener('loadedmetadata', onReady);
            media.removeEventListener('error', onError);
            resolve(ready);
        };
        const onReady = () => finish(true);
        const onError = () => finish(false);
        const timeout = setTimeout(() => finish(false), 20000);
        media.addEventListener('loadedmetadata', onReady);
        media.addEventListener('error', onError);
    });
    media.src = url;
    media.load();
    const ready = await metadata;
    if (deck.loadGeneration !== generation) return false;
    if (!ready) {
        clearStream(deck);
        skipMixer(deck, name, remote
            ? 'cannot use this host in the streaming mixer (the link may block cross-origin audio)'
            : 'could not start in the streaming mixer');
        return false;
    }

    try {
        const context = ensureContext();
        deck.streamSource = context.createMediaElementSource(media);
        deck.streamSource.connect(deck.gain);
    } catch (error) {
        clearStream(deck);
        skipMixer(deck, name, 'could not connect to the streaming mixer');
        return false;
    }
    media.addEventListener('ended', () => {
        if (deck.streamAudio !== media) return;
        deck.playing = false;
        deck.offset = 0;
        renderControls();
    });
    deck.streamReady = true;
    deck.offset = 0;
    deck.pendingName = '';
    renderControls();
    showLoad(deck, 'Ready to stream with volume, slowed, and reverb', 100);
    setStatus(`${name} is ready in the streaming mixer. You can play it with the other track.`);
    return true;
}

async function loadBytes(deck, bytes, name, generation, blob, nativeUrl) {
    if (bytes.byteLength > MAX_MIXER_BYTES) {
        await prepareStream(deck, nativeUrl, name, generation, !blob);
        return false;
    }
    if (deck.nativeAudio.currentSrc === nativeUrl && Number.isFinite(deck.nativeAudio.duration) && deck.nativeAudio.duration > 8 * 60) {
        await prepareStream(deck, nativeUrl, name, generation, !blob);
        return false;
    }
    showLoad(deck, `Quick play available. Decoding ${name} for effects…`);
    const context = ensureContext();
    const buffer = await context.decodeAudioData(bytes);
    if (deck.loadGeneration !== generation) return false;
    if (!Number.isFinite(buffer.duration) || buffer.duration <= 0) throw new Error('The audio has no playable duration.');
    pauseDeck(deck);
    // Keep quick playback running if it started while the mixer was decoding.
    if (deck.nativeAudio.src !== nativeUrl) {
        deck.nativeAudio.pause();
        if (deck.objectUrl) URL.revokeObjectURL(deck.objectUrl);
        deck.objectUrl = URL.createObjectURL(blob);
        deck.nativeAudio.src = deck.objectUrl;
    }
    deck.buffer = buffer;
    deck.offset = 0;
    deck.name = name;
    deck.pendingName = '';
    renderControls();
    showLoad(deck, 'Ready to play', 100);
    setStatus(`Loaded ${name}. ${mixerReady(decks.a) && mixerReady(decks.b) ? 'Tap Play both to mix them.' : 'Choose audio for the other track.'}`);
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
    beginLoad(deck, name);
    deck.nativeAudio.pause();
    if (deck.objectUrl) URL.revokeObjectURL(deck.objectUrl);
    deck.objectUrl = URL.createObjectURL(file);
    const nativeUrl = deck.objectUrl;
    deck.nativeAudio.src = nativeUrl;
    renderControls();
    deck.nativeAudio.preload = 'metadata';
    if (file.size > MAX_MIXER_BYTES) {
        try {
            await prepareStream(deck, nativeUrl, name, generation, false);
            if (save && deck.loadGeneration === generation) await window.audioHistory.addFile(file, name);
        } catch (error) {
            if (deck.loadGeneration === generation) reportLoadError(deck, error);
        }
        return;
    }
    showLoad(deck, `Quick player ready. Reading ${name} for effects…`);
    try {
        const loaded = await loadBytes(deck, await file.arrayBuffer(), name, generation, file, nativeUrl);
        if (save && deck.loadGeneration === generation) {
            const saved = await window.audioHistory.addFile(file, name);
            if (!saved && loaded) setStatus(`${name} is ready. Its name is in history, but choose the file again after reloading.`);
        }
    } catch (error) {
        if (deck.loadGeneration === generation) reportLoadError(deck, error);
    }
}

async function downloadAudio(deck, url, generation, signal, expectedBytes) {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`The link returned HTTP ${response.status}.`);
    if ((response.headers.get('content-type') || '').includes('text/html')) {
        throw new Error('That link opens a webpage. Use a direct audio file URL.');
    }
    const length = Number(response.headers.get('content-length'));
    if (length > MAX_MIXER_BYTES) throw new Error('Too large for the effects mixer (12 MB limit).');
    if (!response.body?.getReader) throw new Error('This browser cannot safely stream the link for effects.');

    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            received += value.byteLength;
            if (received > MAX_MIXER_BYTES) throw new Error('Too large for the effects mixer (12 MB limit).');
            if (deck.loadGeneration !== generation) throw new DOMException('Cancelled', 'AbortError');
            chunks.push(value);
            const percent = Math.min(100, received / expectedBytes * 100);
            showLoad(deck, `Downloading ${(received / 1048576).toFixed(1)} MB / ${(expectedBytes / 1048576).toFixed(1)} MB · ${Math.round(percent)}%`, percent);
        }
    } catch (error) {
        reader.cancel().catch(() => {});
        throw error;
    } finally {
        reader.releaseLock();
    }
    const bytes = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return bytes.buffer;
}

async function loadAudioUrl(deck, value, label = '') {
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
    name = label.trim() || name;
    window.audioHistory.addLink('audio-url', url.href, name);
    deck.abortController = new AbortController();
    beginLoad(deck, name);
    showLoad(deck, 'Quick player ready. Checking link size for effects…');
    deck.nativeAudio.pause();
    if (deck.objectUrl) { URL.revokeObjectURL(deck.objectUrl); deck.objectUrl = null; }
    deck.nativeAudio.preload = 'none';
    deck.nativeAudio.src = url.href;
    renderControls();
    try {
        let head;
        try { head = await fetch(url.href, { method: 'HEAD', signal: deck.abortController.signal }); }
        catch (error) {
            if (error.name === 'AbortError') throw error;
            if (deck.loadGeneration === generation) await prepareStream(deck, url.href, name, generation, true);
            return;
        }
        if (deck.loadGeneration !== generation) return;
        const sizeHeader = head.headers.get('content-length');
        const size = sizeHeader === null ? NaN : Number(sizeHeader);
        if (!head.ok || !Number.isFinite(size) || size <= 0) {
            await prepareStream(deck, url.href, name, generation, true);
            return;
        }
        if (size > MAX_MIXER_BYTES) {
            await prepareStream(deck, url.href, name, generation, true);
            return;
        }
        showLoad(deck, 'Quick player ready. Downloading link for effects…');
        const bytes = await downloadAudio(deck, url.href, generation, deck.abortController.signal, size);
        if (deck.loadGeneration !== generation) return;
        await loadBytes(deck, bytes, name, generation, null, url.href);
    } catch (error) {
        if (deck.loadGeneration !== generation || error.name === 'AbortError') return;
        if (error.message.startsWith('Too large for the effects mixer')) {
            await prepareStream(deck, url.href, name, generation, true);
            return;
        }
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
        if (file) {
            const name = deck.historyNameInput.value.trim() || file.name;
            deck.historyNameInput.value = '';
            loadLocalFile(deck, file, name);
        }
    });

    deck.loadUrlButton.addEventListener('click', () => {
        const name = deck.historyNameInput.value.trim();
        deck.historyNameInput.value = '';
        loadAudioUrl(deck, deck.urlInput.value, name);
    });
    window.audioHistory.registerLoader(deck.key, async (entry) => {
        if (entry.kind === 'file') {
            try {
                const file = await window.audioHistory.getFile(entry.id);
                if (!file) throw new Error('Saved file is unavailable. Choose it again.');
                deck.historyNameInput.value = '';
                loadLocalFile(deck, file, entry.label, false);
            } catch (error) { reportLoadError(deck, error); }
        } else {
            deck.urlInput.value = entry.url;
            deck.historyNameInput.value = '';
            loadAudioUrl(deck, entry.url, entry.label);
        }
    });

    deck.nativeAudio.addEventListener('play', () => {
        pauseDeck(deck);
        renderControls();
        setStatus(`Playing ${deck.pendingName || deck.name} in the native player. Use your phone's volume buttons.`);
    });
    deck.nativeAudio.addEventListener('pause', renderControls);
    deck.nativeAudio.addEventListener('ended', renderControls);

    deck.loopButton.addEventListener('click', () => {
        deck.loop = !deck.loop;
        deck.loopButton.setAttribute('aria-pressed', String(deck.loop));
        deck.loopButton.textContent = `Loop ${deck.key.toUpperCase()}: ${deck.loop ? 'On' : 'Off'}`;
        deck.nativeAudio.loop = deck.loop;
        if (deck.streamAudio) deck.streamAudio.loop = deck.loop;
        if (deck.source) deck.source.loop = deck.loop;
        setStatus(`Loop ${deck.key.toUpperCase()} ${deck.loop ? 'on' : 'off'}.`);
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
        if (!durationOf(deck)) return;
        if (deck.streamReady && !deck.buffer) {
            deck.offset = durationOf(deck) * Number(deck.seekInput.value) / 1000;
            deck.streamAudio.currentTime = deck.offset;
            renderControls();
            return;
        }
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
        if (deck.streamReady && !deck.buffer) {
            const speed = speedOf(deck);
            deck.streamAudio.playbackRate = speed;
            deck.slowValue.textContent = `${speed.toFixed(2)}×`;
            deck.slowValue.dataset.speed = String(speed);
            return;
        }
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

    function applyPreset(speed, reverb) {
        deck.slowInput.value = String(speed);
        deck.slowInput.dispatchEvent(new Event('input', { bubbles: true }));
        deck.reverbInput.value = String(reverb);
        deck.reverbInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    deck.slowPresetButton.addEventListener('click', () => applyPreset(80, 40));
    deck.normalPresetButton.addEventListener('click', () => applyPreset(100, 0));
});

playBothButton.addEventListener('click', () => {
    if (!mixerReady(decks.a) || !mixerReady(decks.b)) return;
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

playBothQuickButton.addEventListener('click', async () => {
    if (!decks.a.nativeAudio.src || !decks.b.nativeAudio.src) return;
    pauseDeck(decks.a);
    pauseDeck(decks.b);
    // Call both play() methods during the same tap for mobile playback policies.
    const starts = [decks.a.nativeAudio.play(), decks.b.nativeAudio.play()];
    const results = await Promise.allSettled(starts);
    setStatus(results.some((result) => result.status === 'rejected')
        ? 'One quick player could not start. Tap Play in each player below.'
        : 'Both quick players started. Your phone may still pause one of them.');
    renderControls();
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
    if (!mixerReady(decks.a) || !mixerReady(decks.b)) return;
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

let blackScreenWanted = false;
let wakeLockSentinel = null;
let wakeLockRequest = 0;

function closeBlackScreen(message) {
    blackScreenWanted = false;
    wakeLockRequest += 1;
    blackScreenOverlay.hidden = true;
    document.body.classList.remove('black-screen-open');
    const lock = wakeLockSentinel;
    wakeLockSentinel = null;
    if (lock) lock.release().catch(() => {});
    blackScreenButton.focus();
    if (message) setStatus(message);
}

async function acquireWakeLock() {
    if (!blackScreenWanted || document.hidden) return;
    const request = ++wakeLockRequest;
    try {
        const lock = await navigator.wakeLock.request('screen');
        if (!blackScreenWanted || request !== wakeLockRequest) {
            lock.release().catch(() => {});
            return;
        }
        wakeLockSentinel = lock;
        blackScreenStatus.textContent = 'Screen awake while this page stays visible. Audio keeps playing. Tap Exit black screen to return.';
        lock.addEventListener('release', () => {
            if (wakeLockSentinel !== lock) return;
            wakeLockSentinel = null;
            if (blackScreenWanted && !document.hidden) {
                closeBlackScreen('The phone released the screen wake lock. Black screen mode ended.');
            }
        });
    } catch (_) {
        if (!blackScreenWanted || request !== wakeLockRequest) return;
        if (document.hidden) return;
        closeBlackScreen('Chrome could not keep the screen awake here. Try opening the page over HTTPS, or use quick play for background audio.');
    }
}

blackScreenButton.addEventListener('click', () => {
    if (!navigator.wakeLock?.request) {
        setStatus('Screen wake lock is unavailable in this browser or page. Try opening the page over HTTPS in Chrome.');
        return;
    }
    blackScreenWanted = true;
    if (sleepDeadline === null) setSleepDeadline();
    blackScreenOverlay.hidden = false;
    document.body.classList.add('black-screen-open');
    blackScreenStatus.textContent = 'Requesting screen wake lock…';
    acquireWakeLock();
    blackScreenExit.focus();
});
blackScreenExit.addEventListener('click', () => closeBlackScreen('Black screen mode ended. Audio keeps playing.'));

document.addEventListener('visibilitychange', () => {
    tickSleepTimer();
    if (blackScreenWanted && !document.hidden && (!wakeLockSentinel || wakeLockSentinel.released)) acquireWakeLock();
    if (!document.hidden && audioContext?.state === 'suspended' && Object.values(decks).some((deck) => deck.playing)) {
        setStatus('The audio mixer paused in the background. Tap Play to resume, or use the native background player.');
    }
});
window.addEventListener('pageshow', tickSleepTimer);

if (!AudioContextClass) {
    setStatus('This browser does not support the audio mixer. Try a current version of Chrome.');
}
renderControls();
renderProgress();
setInterval(renderProgress, 1000);
