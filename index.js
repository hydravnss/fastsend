/* =========================================================
   FASTSEND
   SillyTavern third-party extension
   Send interaction optimization
   ========================================================= */

(() => {
    'use strict';

    const EXTENSION_NAME = 'fastsend';
    const VERSION = '1.0.2';

    const STORAGE_KEY = 'fastsend_settings';

    const DEFAULT_SETTINGS = {
        enabled: true,
        instantFeedback: true,
        touchOptimization: true,
        latencyMonitor: false
    };

    let settings = loadSettings();

    let sendButton = null;
    let textarea = null;

    let latencyStart = 0;
    let observer = null;

    let initialized = false;


    /* =====================================================
       SETTINGS
       ===================================================== */

    function loadSettings() {
        try {
            const saved =
                localStorage.getItem(
                    STORAGE_KEY
                );

            if (!saved) {
                return {
                    ...DEFAULT_SETTINGS
                };
            }

            return {
                ...DEFAULT_SETTINGS,
                ...JSON.parse(saved)
            };

        } catch (error) {

            console.warn(
                `[${EXTENSION_NAME}] Settings error:`,
                error
            );

            return {
                ...DEFAULT_SETTINGS
            };
        }
    }


    function saveSettings() {
        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(settings)
            );

        } catch (error) {

            console.warn(
                `[${EXTENSION_NAME}] Could not save settings:`,
                error
            );
        }
    }


    /* =====================================================
       FIND SILLYTAVERN SEND ELEMENTS
       ===================================================== */

    function findSendElements() {

        const button =
            document.querySelector(
                '#send_but'
            );

        const input =
            document.querySelector(
                '#send_textarea'
            );

        return {
            button,
            input
        };
    }


    /* =====================================================
       PREPARE SEND BUTTON
       ===================================================== */

    function prepareSendButton(button) {

        if (!button) {
            return;
        }


        /*
         * Avoid mobile browser gesture delays.
         */

        if (settings.touchOptimization) {

            button.style.touchAction =
                'manipulation';

            button.style.webkitTapHighlightColor =
                'transparent';
        }


        /*
         * Avoid duplicate listeners.
         */

        if (
            button.dataset.fastsendReady ===
            'true'
        ) {
            return;
        }

        button.dataset.fastsendReady =
            'true';


        /* -------------------------------------------------
           POINTER DOWN
           ------------------------------------------------- */

        button.addEventListener(
            'pointerdown',
            () => {

                if (!settings.enabled) {
                    return;
                }


                latencyStart =
                    performance.now();


                /*
                 * Immediate visual response.
                 */

                if (
                    settings.instantFeedback
                ) {

                    button.classList.add(
                        'fastsend-active'
                    );
                }


                /*
                 * Remove visual state
                 * on next frame.
                 */

                requestAnimationFrame(
                    () => {

                        button.classList.remove(
                            'fastsend-active'
                        );

                    }
                );

            },
            {
                passive: true
            }
        );
    }


    /* =====================================================
       PREPARE TEXTAREA
       ===================================================== */

    function prepareTextarea(input) {

        if (!input) {
            return;
        }


        if (
            settings.touchOptimization
        ) {

            input.style.touchAction =
                'manipulation';
        }
    }


    /* =====================================================
       WATCH FOR NEW MESSAGE
       ===================================================== */

    function startMessageObserver() {

        if (observer) {
            observer.disconnect();
        }


        observer =
            new MutationObserver(
                (mutations) => {

                    if (!latencyStart) {
                        return;
                    }


                    for (
                        const mutation
                        of mutations
                    ) {

                        if (
                            !mutation.addedNodes.length
                        ) {
                            continue;
                        }


                        for (
                            const node
                            of mutation.addedNodes
                        ) {

                            if (
                                node.nodeType !==
                                Node.ELEMENT_NODE
                            ) {
                                continue;
                            }


                            let message =
                                null;


                            if (
                                node.matches &&
                                node.matches('.mes')
                            ) {

                                message =
                                    node;
                            }


                            if (
                                !message &&
                                node.querySelector
                            ) {

                                message =
                                    node.querySelector(
                                        '.mes'
                                    );
                            }


                            if (!message) {
                                continue;
                            }


                            const elapsed =
                                performance.now() -
                                latencyStart;


                            latencyStart =
                                0;


                            if (
                                settings.latencyMonitor
                            ) {

                                showLatency(
                                    Math.round(
                                        elapsed
                                    )
                                );
                            }


                            console.debug(
                                `[${EXTENSION_NAME}]`,
                                `Send → message: ${Math.round(elapsed)} ms`
                            );


                            return;
                        }
                    }
                }
            );


        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );
    }


    /* =====================================================
       LATENCY DISPLAY
       ===================================================== */

    function showLatency(milliseconds) {

        let indicator =
            document.querySelector(
                '#fastsend-latency'
            );


        if (!indicator) {

            indicator =
                document.createElement(
                    'div'
                );

            indicator.id =
                'fastsend-latency';

            document.body.appendChild(
                indicator
            );
        }


        indicator.textContent =
            `${milliseconds} ms`;


        indicator.classList.add(
            'fastsend-latency-visible'
        );


        clearTimeout(
            indicator._fastsendTimeout
        );


        indicator._fastsendTimeout =
            setTimeout(
                () => {

                    indicator.classList.remove(
                        'fastsend-latency-visible'
                    );

                },
                1200
            );
    }


    /* =====================================================
       SETTINGS PANEL
       ===================================================== */

    function createSettingsPanel() {

        if (
            document.querySelector(
                '#fastsend-settings'
            )
        ) {
            return;
        }


        const settingsContainer =
            document.getElementById(
                'extensions_settings2'
            );


        if (!settingsContainer) {

            console.warn(
                `[${EXTENSION_NAME}] #extensions_settings2 not found.`
            );

            return;
        }


        const wrapper =
            document.createElement(
                'div'
            );


        wrapper.id =
            'fastsend-settings';


        wrapper.className =
            'fastsend-extension-wrapper';


        wrapper.innerHTML = `

            <div class="inline-drawer">

                <div
                    class="inline-drawer-toggle
                           inline-drawer-header"
                >

                    <b>
                        ⚡ fastsend
                    </b>

                    <div
                        class="inline-drawer-icon
                               fa-solid
                               fa-circle-chevron-down
                               down"
                    ></div>

                </div>


                <div
                    class="inline-drawer-content"
                >

                    <div class="fastsend-panel">

                        <div class="fastsend-title">
                            ⚡ fastsend
                        </div>


                        <label class="fastsend-setting">

                            <input
                                type="checkbox"
                                data-fastsend-setting="enabled"
                            >

                            <span>
                                Enable fastsend
                            </span>

                        </label>


                        <label class="fastsend-setting">

                            <input
                                type="checkbox"
                                data-fastsend-setting="instantFeedback"
                            >

                            <span>
                                Instant button feedback
                            </span>

                        </label>


                        <label class="fastsend-setting">

                            <input
                                type="checkbox"
                                data-fastsend-setting="touchOptimization"
                            >

                            <span>
                                Touch optimization
                            </span>

                        </label>


                        <label class="fastsend-setting">

                            <input
                                type="checkbox"
                                data-fastsend-setting="latencyMonitor"
                            >

                            <span>
                                Show latency monitor
                            </span>

                        </label>


                        <div class="fastsend-description">

                            Optimizes the client-side
                            send interaction without
                            replacing SillyTavern's native
                            message generation system.

                        </div>

                    </div>

                </div>

            </div>
        `;


        settingsContainer.appendChild(
            wrapper
        );


        const inputs =
            wrapper.querySelectorAll(
                '[data-fastsend-setting]'
            );


        inputs.forEach(
            (input) => {

                const key =
                    input.dataset.fastsendSetting;


                input.checked =
                    Boolean(
                        settings[key]
                    );


                input.addEventListener(
                    'change',
                    () => {

                        settings[key] =
                            input.checked;


                        saveSettings();


                        const elements =
                            findSendElements();


                        prepareSendButton(
                            elements.button
                        );


                        prepareTextarea(
                            elements.input
                        );
                    }
                );
            }
        );
    }


    /* =====================================================
       DOM WATCHER
       ===================================================== */

    function setupDOMWatcher() {

        const domObserver =
            new MutationObserver(
                () => {

                    const elements =
                        findSendElements();


                    /*
                     * SillyTavern can rebuild
                     * the send button dynamically.
                     */

                    if (
                        elements.button &&
                        elements.button !==
                        sendButton
                    ) {

                        sendButton =
                            elements.button;


                        prepareSendButton(
                            sendButton
                        );
                    }


                    if (
                        elements.input &&
                        elements.input !==
                        textarea
                    ) {

                        textarea =
                            elements.input;


                        prepareTextarea(
                            textarea
                        );
                    }

                }
            );


        domObserver.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );
    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    async function init() {

        if (initialized) {
            return;
        }


        initialized = true;


        console.info(
            `[${EXTENSION_NAME}] v${VERSION} initializing...`
        );


        const elements =
            findSendElements();


        sendButton =
            elements.button;


        textarea =
            elements.input;


        prepareSendButton(
            sendButton
        );


        prepareTextarea(
            textarea
        );


        startMessageObserver();


        createSettingsPanel();


        setupDOMWatcher();


        console.info(
            `[${EXTENSION_NAME}] initialized successfully.`
        );
    }


    /* =====================================================
       SILLYTAVERN INITIALIZATION
       ===================================================== */

    if (
        document.readyState ===
        'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            init,
            {
                once: true
            }
        );

    } else {

        init();
    }

})();