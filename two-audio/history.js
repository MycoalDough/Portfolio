const HISTORY_KEY = 'two-audio-history-v1';
const HISTORY_LIMIT = 16;
const MAX_SAVED_FILE = 50 * 1024 * 1024;
const historyList = document.getElementById('history-list');
const historyLoaders = {};

let historyEntries = [];
try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    if (Array.isArray(saved)) historyEntries = saved.slice(0, HISTORY_LIMIT);
} catch (_) { /* Storage may be unavailable on a local file or private browser. */ }

function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(historyEntries)); }
    catch (_) { /* Keep the current session's list. */ }
}

function openHistoryDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) return reject(new Error('Local file storage is unavailable.'));
        const request = indexedDB.open('two-audio-files', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('files');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function fileOperation(mode, id, value) {
    const db = await openHistoryDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('files', mode);
        const store = transaction.objectStore('files');
        const request = value === undefined ? store.get(id) : store.put(value, id);
        let result;
        request.onsuccess = () => { result = request.result; };
        transaction.oncomplete = () => { db.close(); resolve(result); };
        transaction.onerror = () => { db.close(); reject(transaction.error || request.error); };
        transaction.onabort = () => { db.close(); reject(transaction.error || new Error('File storage stopped.')); };
    });
}

async function removeFile(id) {
    try {
        const db = await openHistoryDB();
        const transaction = db.transaction('files', 'readwrite');
        transaction.objectStore('files').delete(id);
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => db.close();
    } catch (_) { /* Old files can expire if storage is unavailable. */ }
}

function addEntry(entry) {
    historyEntries = [entry, ...historyEntries.filter((item) =>
        item.id !== entry.id && !(entry.url && item.kind === entry.kind && item.url === entry.url)
    )];
    const removed = historyEntries.splice(HISTORY_LIMIT);
    removed.filter((item) => item.kind === 'file').forEach((item) => removeFile(item.id));
    saveHistory();
    renderHistory();
}

function renderHistory() {
    historyList.replaceChildren();
    if (!historyEntries.length) {
        const empty = document.createElement('li');
        empty.className = 'history-empty';
        empty.textContent = 'Nothing saved yet.';
        historyList.append(empty);
        return;
    }

    for (const entry of historyEntries) {
        const item = document.createElement('li');
        const info = document.createElement('div');
        const title = document.createElement('strong');
        const detail = document.createElement('span');
        const actions = document.createElement('div');
        title.textContent = entry.label;
        detail.textContent = `${entry.kind === 'file' ? 'File' : entry.kind === 'audio-url' ? 'Audio link' : entry.kind === 'youtube' ? 'YouTube' : 'Spotify'}${entry.kind === 'file' && !entry.restorable ? ' · choose again' : ''}`;
        actions.className = 'history-actions';
        info.append(title, detail);

        const destinations = entry.kind === 'youtube' ? [['YouTube', 'youtube']]
            : entry.kind === 'spotify' ? [['Spotify', 'spotify']]
                : [['A', 'a'], ['B', 'b']];
        for (const [label, destination] of destinations) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = `${entry.kind === 'file' && !entry.restorable ? 'Choose' : 'Load'} ${label}`;
            button.addEventListener('click', () => {
                if (entry.kind === 'file' && !entry.restorable) {
                    document.getElementById(`file-${destination}`).click();
                } else {
                    historyLoaders[destination]?.(entry);
                }
            });
            actions.append(button);
        }
        item.append(info, actions);
        historyList.append(item);
    }
}

document.getElementById('clear-history').addEventListener('click', () => {
    historyEntries.filter((entry) => entry.kind === 'file').forEach((entry) => removeFile(entry.id));
    historyEntries = [];
    saveHistory();
    renderHistory();
});

window.audioHistory = {
    addLink(kind, url, label) {
        addEntry({ id: `${kind}:${url}`, kind, url, label, savedAt: Date.now() });
    },
    async addFile(file) {
        const id = `file:${Date.now()}:${Math.random().toString(36).slice(2)}`;
        let restorable = false;
        if (file.size <= MAX_SAVED_FILE) {
            try {
                await fileOperation('readwrite', id, file);
                restorable = true;
            } catch (_) { /* Show its name even if storage quota is exhausted. */ }
        }
        addEntry({ id, kind: 'file', label: file.name, restorable, savedAt: Date.now() });
        return restorable;
    },
    getFile(id) { return fileOperation('readonly', id); },
    registerLoader(destination, callback) { historyLoaders[destination] = callback; },
};

renderHistory();
