(function () {
    if (window.__portfolioPageSwapperActive) {
        return;
    }

    window.__portfolioPageSwapperActive = true;
    history.scrollRestoration = 'manual';

    let activeRequest = null;
    const pageCache = new Map();
    const imageCache = new Map();

    function wait(milliseconds) {
        return new Promise((resolve) => setTimeout(resolve, milliseconds));
    }

    function getTransitionOverlay() {
        let overlay = document.getElementById('portfolio-transition');

        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'portfolio-transition';
            overlay.setAttribute('aria-hidden', 'true');
            document.body.appendChild(overlay);
        }

        return overlay;
    }

    async function closeTransition() {
        const overlay = getTransitionOverlay();

        window.playLoadPageSound?.();
        overlay.className = 'is-active is-held';

        // Give the browser a paint before replacing the page underneath.
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }

    async function openTransition() {
        const overlay = getTransitionOverlay();
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        await wait(reducedMotion ? 250 : 500);
        window.playLoadPageSound?.();
        overlay.className = '';
    }

    function isSwappableUrl(url) {
        if (url.origin !== window.location.origin) {
            return false;
        }

        const path = url.pathname.toLowerCase();
        return path.endsWith('.html') || path.endsWith('/');
    }

    function updateHead(nextDocument) {
        document.title = nextDocument.title;

        const selectors = [
            'meta[name="description"]',
            'link[rel="canonical"]'
        ];

        selectors.forEach((selector) => {
            const current = document.head.querySelector(selector);
            const incoming = nextDocument.head.querySelector(selector);

            if (incoming && current) {
                Array.from(incoming.attributes).forEach((attribute) => {
                    current.setAttribute(attribute.name, attribute.value);
                });
            } else if (incoming) {
                document.head.appendChild(document.importNode(incoming, true));
            } else if (current) {
                current.remove();
            }
        });
    }

    function copyBodyAttributes(nextBody) {
        Array.from(document.body.attributes).forEach((attribute) => {
            document.body.removeAttribute(attribute.name);
        });

        Array.from(nextBody.attributes).forEach((attribute) => {
            document.body.setAttribute(attribute.name, attribute.value);
        });
    }

    function getPageRoot() {
        let pageRoot = document.getElementById('portfolio-page-content');

        if (pageRoot) {
            return pageRoot;
        }

        pageRoot = document.createElement('div');
        pageRoot.id = 'portfolio-page-content';
        // The wrapper gives the swapper a stable target without changing any
        // of the existing flex, absolute-positioning, or selector behavior.
        pageRoot.style.display = 'contents';

        const pageNodes = Array.from(document.body.childNodes).filter((node) => {
            if (!(node instanceof HTMLElement)) {
                return true;
            }

            if (node.classList.contains('cloud')) {
                return false;
            }

            if (node.matches('script[src]')) {
                const filename = new URL(node.src, window.location.href).pathname.split('/').pop();
                return filename !== 'script.js' && filename !== 'page-swapper.js';
            }

            return true;
        });

        const insertionPoint = pageNodes[0] || document.body.firstChild;
        document.body.insertBefore(pageRoot, insertionPoint);
        pageNodes.forEach((node) => pageRoot.appendChild(node));

        return pageRoot;
    }

    function removePageNodesOutsideRoot(pageRoot) {
        Array.from(document.body.children).forEach((element) => {
            if (
                element === pageRoot ||
                element.id === 'portfolio-transition' ||
                element.classList.contains('cloud')
            ) {
                return;
            }

            if (element.matches('script[src]')) {
                const filename = new URL(element.src, window.location.href).pathname.split('/').pop();
                if (filename === 'script.js' || filename === 'page-swapper.js') {
                    return;
                }
            }

            element.remove();
        });
    }

    function fetchPage(target) {
        const cacheKey = target.href;

        if (!pageCache.has(cacheKey)) {
            const request = fetch(cacheKey, {
                headers: { 'X-Portfolio-Navigation': 'true' }
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Page request failed with ${response.status}`);
                    }

                    return response.text();
                })
                .catch((error) => {
                    pageCache.delete(cacheKey);
                    throw error;
                });

            pageCache.set(cacheKey, request);
        }

        return pageCache.get(cacheKey);
    }

    function preloadImage(source) {
        if (!imageCache.has(source)) {
            const request = new Promise((resolve) => {
                const image = new Image();
                image.decoding = 'async';
                image.onload = async () => {
                    try {
                        await image.decode();
                    } catch (_) {
                        // A loaded image is still usable when decode() is not
                        // supported or the browser has already discarded it.
                    }
                    resolve();
                };
                image.onerror = resolve;
                image.src = source;
            });

            imageCache.set(source, request);
        }

        return imageCache.get(source);
    }

    async function preloadDocumentImages(nextDocument, target) {
        const sources = Array.from(nextDocument.images)
            .map((image) => image.getAttribute('src'))
            .filter(Boolean)
            .map((source) => new URL(source, target.href).href);

        await Promise.all([...new Set(sources)].map(preloadImage));
    }

    async function preloadPage(target) {
        const html = await fetchPage(target);
        const nextDocument = new DOMParser().parseFromString(html, 'text/html');
        await preloadDocumentImages(nextDocument, target);
        return { html, nextDocument };
    }

    async function runPageScripts(scripts, pageRoot) {
        for (const sourceScript of scripts) {
            const source = sourceScript.getAttribute('src');
            const type = sourceScript.getAttribute('type') || '';

            if (type === 'application/ld+json') {
                continue;
            }

            if (source) {
                const scriptUrl = new URL(source, window.location.href);
                const filename = scriptUrl.pathname.split('/').pop();

                if (filename === 'script.js' || filename === 'page-swapper.js') {
                    continue;
                }

                // Modules are otherwise evaluated just once per document. A
                // version token lets page-specific setup run again on revisit.
                if (type === 'module') {
                    scriptUrl.searchParams.set('page-load', Date.now().toString());
                }

                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = scriptUrl.href;
                    script.type = type;
                    script.async = false;
                    script.onload = resolve;
                    script.onerror = reject;
                    pageRoot.appendChild(script);
                });
                continue;
            }

            if (sourceScript.textContent.trim()) {
                const script = document.createElement('script');
                // Isolate page-local const/let declarations so revisiting the
                // page cannot collide with a previous evaluation.
                script.textContent = `(function () {\n${sourceScript.textContent}\n})();`;
                pageRoot.appendChild(script);
            }
        }
    }

    async function swapTo(url, options = {}) {
        const target = new URL(url, window.location.href);
        const shouldPush = options.push !== false;
        const scrollPosition = options.scrollPosition || { x: 0, y: 0 };

        if (!isSwappableUrl(target)) {
            window.location.href = target.href;
            return;
        }

        if (activeRequest) {
            activeRequest.abort();
        }

        const request = new AbortController();
        activeRequest = request;
        let transitionStarted = false;
        document.documentElement.classList.add('portfolio-navigating');

        try {
            // Keep the current page visible while assets warm up. This avoids
            // trapping the visitor behind a black transition on a slow image.
            const { nextDocument } = await preloadPage(target);

            if (request.signal.aborted) {
                return;
            }

            transitionStarted = true;
            await closeTransition(target);

            if (request.signal.aborted) {
                await openTransition();
                return;
            }

            const nextBody = nextDocument.body;
            const pageScripts = Array.from(nextBody.querySelectorAll('script'));
            const pageRoot = getPageRoot();

            pageScripts.forEach((script) => script.remove());

            history.replaceState({
                portfolio: true,
                scrollX: window.scrollX,
                scrollY: window.scrollY
            }, '', window.location.href);

            if (shouldPush) {
                history.pushState({ portfolio: true, scrollX: 0, scrollY: 0 }, '', target.href);
            }

            updateHead(nextDocument);
            copyBodyAttributes(nextBody);
            // Clean up legacy page scripts that mounted UI directly on body.
            // Persistent clouds, rain, shared scripts, and the transition stay.
            removePageNodesOutsideRoot(pageRoot);
            pageRoot.replaceChildren(
                ...Array.from(nextBody.childNodes, (node) => document.importNode(node, true))
            );

            await runPageScripts(pageScripts, pageRoot);
            document.dispatchEvent(new CustomEvent('portfolio:page-loaded', {
                detail: { url: target.href }
            }));

            window.scrollTo(scrollPosition.x, scrollPosition.y);
            await openTransition();
        } catch (error) {
            if (error.name === 'AbortError') {
                if (transitionStarted) {
                    await openTransition();
                }
                return;
            }

            console.error('Smooth page navigation failed; using a normal page load.', error);
            if (transitionStarted) {
                await openTransition();
            }
            window.location.href = target.href;
        } finally {
            if (activeRequest === request) {
                document.documentElement.classList.remove('portfolio-navigating');
                activeRequest = null;
            }
        }
    }

    window.loadFullPage = function (url) {
        return swapTo(url, { push: false });
    };

    function getDestination(clickable) {
        let destination = clickable.getAttribute('href');

        if (!destination) {
            const inlineHandler = clickable.getAttribute('onclick') || '';
            const match = inlineHandler.match(/location\.href\s*=\s*['"]([^'"]+)['"]/);
            destination = match && match[1];
        }

        return destination;
    }

    function warmLinkedPage(event) {
        const clickable = event.target.closest('a, [onclick*="location.href"]');
        if (!clickable) {
            return;
        }

        const destination = getDestination(clickable);
        if (!destination || destination.startsWith('#')) {
            return;
        }

        const target = new URL(destination, window.location.href);
        if (isSwappableUrl(target)) {
            preloadPage(target).catch(() => {});
        }
    }

    document.addEventListener('pointerover', warmLinkedPage, true);
    document.addEventListener('focusin', warmLinkedPage, true);

    document.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }

        const clickable = event.target.closest('a, [onclick*="location.href"]');
        if (!clickable) {
            return;
        }

        if (clickable.matches('a')) {
            if (clickable.target && clickable.target !== '_self') {
                return;
            }

            if (clickable.hasAttribute('download')) {
                return;
            }
        }

        const destination = getDestination(clickable);

        if (!destination || destination.startsWith('#')) {
            return;
        }

        const target = new URL(destination, window.location.href);
        if (!isSwappableUrl(target)) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        window.unlockPortfolioAudio?.();
        swapTo(target, { push: true, scrollPosition: { x: 0, y: 0 } });
    }, true);

    window.addEventListener('popstate', (event) => {
        const state = event.state || {};
        swapTo(window.location.href, {
            push: false,
            scrollPosition: {
                x: state.scrollX || 0,
                y: state.scrollY || 0
            }
        });
    });

    history.replaceState({
        portfolio: true,
        scrollX: window.scrollX,
        scrollY: window.scrollY
    }, '', window.location.href);

    getPageRoot();
    getTransitionOverlay();
})();
