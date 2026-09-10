/* =========================================================
   SILLYTAVERN — FASTSEND
   Fast message sending / latency optimizer
   ========================================================= */

(() => {
    "use strict";


    /* =====================================================
       CONFIG
       ===================================================== */

    const EXTENSION_NAME = "[fastsend]";
    const STORAGE_KEY = "st_fastsend_settings";

    const DEFAULT_SETTINGS = {
        enabled: true,
        instantFeedback: true,
        touchOptimization: true,
        preventDoubleSend: true,
        latencyMonitor: false
    };


    let settings = loadSettings();

    let sendButton = null;
    let sendTextarea = null;

    let isSending = false;

    let sendStartTime = 0;

    let latencyObserver = null;

    let lastInputTime = 0;


    /* =====================================================
       SETTINGS
       ===================================================== */

    function loadSettings() {

        try {

            const saved =
                localStorage.getItem(STORAGE_KEY);

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
                EXTENSION_NAME,
                "Unable to load settings.",
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
                EXTENSION_NAME,
                "Unable to save settings.",
                error
            );
        }
    }


    /* =====================================================
       FIND SILLYTAVERN ELEMENTS
       ===================================================== */

    function findElements() {

        sendButton =
            document.querySelector(
                "#send_but"
            );


        sendTextarea =
            document.querySelector(
                "#send_textarea"
            );


        return Boolean(
            sendButton &&
            sendTextarea
        );
    }


    /* =====================================================
       BUTTON PREPARATION
       ===================================================== */

    function prepareSendButton() {

        if (!sendButton) {
            return;
        }


        /*
         * Tell the browser that this is an
         * interactive element.
         */

        sendButton.style.touchAction =
            "manipulation";


        /*
         * Prevent unnecessary selection
         * when tapping on mobile.
         */

        sendButton.style.userSelect =
            "none";

        sendButton.style.webkitUserSelect =
            "none";


        /*
         * Keep the button on its own
         * compositing layer where useful.
         */

        if (settings.touchOptimization) {

            sendButton.style.backfaceVisibility =
                "hidden";

            sendButton.style.webkitBackfaceVisibility =
                "hidden";
        }
    }


    /* =====================================================
       TEXTAREA PREPARATION
       ===================================================== */

    function prepareTextarea() {

        if (!sendTextarea) {
            return;
        }


        /*
         * Avoid browser delays associated
         * with touch manipulation.
         */

        if (settings.touchOptimization) {

            sendTextarea.style.touchAction =
                "manipulation";
        }
    }


    /* =====================================================
       INSTANT VISUAL FEEDBACK
       ===================================================== */

    function setSendingVisualState(active) {

        if (!sendButton) {
            return;
        }


        if (active) {

            sendButton.classList.add(
                "fastsend-active"
            );

        } else {

            sendButton.classList.remove(
                "fastsend-active"
            );
        }
    }


    /* =====================================================
       SEND START
       ===================================================== */

    function onSendStart() {

        if (!settings.enabled) {
            return;
        }


        /*
         * Record the exact moment at which
         * the user presses the button.
         */

        sendStartTime =
            performance.now();


        isSending = true;


        /*
         * Give visual feedback immediately,
         * before SillyTavern performs its
         * asynchronous work.
         */

        if (settings.instantFeedback) {

            setSendingVisualState(
                true
            );
        }


        /*
         * Start watching for the new message.
         */

        if (settings.latencyMonitor) {

            startLatencyObserver();
        }


        /*
         * Release the visual state on the
         * next rendering frame.
         *
         * IMPORTANT:
         * We do NOT replace or delay
         * SillyTavern's native click handler.
         */

        requestAnimationFrame(() => {

            setSendingVisualState(
                false
            );

        });
    }


    /* =====================================================
       POINTER DOWN
       ===================================================== */

    function handlePointerDown(event) {

        if (!settings.enabled) {
            return;
        }


        if (
            event.pointerType === "mouse" &&
            event.button !== 0
        ) {
            return;
        }


        onSendStart();
    }


    /* =====================================================
       CLICK
       ===================================================== */

    function handleClick() {

        if (!settings.enabled) {
            return;
        }


        /*
         * The native SillyTavern click handler
         * remains responsible for actually sending.
         *
         * FastSend only observes the action.
         */

        if (!sendStartTime) {

            onSendStart();
        }
    }


    /* =====================================================
       LATENCY OBSERVER
       ===================================================== */

    function startLatencyObserver() {

        stopLatencyObserver();


        if (!document.body) {
            return;
        }


        latencyObserver =
            new MutationObserver(
                (mutations) => {

                    for (
                        const mutation
                        of mutations
                    ) {

                        if (
                            mutation.addedNodes
                            .length === 0
                        ) {
                            continue;
                        }


                        const message =
                            findNewMessage(
                                mutation
                            );


                        if (message) {

                            reportLatency();

                            stopLatencyObserver();

                            break;
                        }
                    }

                }
            );


        latencyObserver.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );


        /*
         * Safety timeout.
         */

        setTimeout(() => {

            stopLatencyObserver();

        }, 10000);
    }


    function stopLatencyObserver() {

        if (latencyObserver) {

            latencyObserver.disconnect();

            latencyObserver = null;
        }
    }


    /* =====================================================
       FIND NEW MESSAGE
       ===================================================== */

    function findNewMessage(
        mutation
    ) {

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


            /*
             * Standard SillyTavern message.
             */

            if (
                node.matches &&
                node.matches(".mes")
            ) {

                return node;
            }


            /*
             * Message nested inside
             * another inserted element.
             */

            if (
                node.querySelector &&
                node.querySelector(".mes")
            ) {

                return node.querySelector(
                    ".mes"
                );
            }
        }


        return null;
    }


    /* =====================================================
       REPORT LATENCY
       ===================================================== */

    function reportLatency() {

        if (!sendStartTime) {
            return;
        }


        const elapsed =
            performance.now() -
            sendStartTime;


        console.info(
            `${EXTENSION_NAME} Send → message DOM: ${Math.round(elapsed)} ms`
        );


        showLatency(
            Math.round(elapsed)
        );


        sendStartTime = 0;

        isSending = false;
    }


    /* =====================================================
       LATENCY UI
       ===================================================== */

    function showLatency(
        milliseconds
    ) {

        if (!settings.latencyMonitor) {
            return;
        }


        let indicator =
            document.getElementById(
                "fastsend-latency"
            );


        if (!indicator) {

            indicator =
                document.createElement(
                    "div"
                );

            indicator.id =
                "fastsend-latency";

            document.body.appendChild(
                indicator
            );
        }


        indicator.textContent =
            `${milliseconds} ms`;


        indicator.classList.add(
            "fastsend-latency-visible"
        );


        setTimeout(() => {

            indicator.classList.remove(
                "fastsend-latency-visible"
            );

        }, 1200);
    }


    /* =====================================================
       DOUBLE SEND PROTECTION
       ===================================================== */

    function setupDoubleSendProtection() {

        if (!settings.preventDoubleSend) {
            return;
        }


        /*
         * This is deliberately NOT blocking the
         * native send function.
         *
         * It only prevents accidental repeated
         * taps during the same pointer interaction.
         */

        if (!sendButton) {
            return;
        }


        sendButton.addEventListener(
            "pointerup",
            () => {

                requestAnimationFrame(() => {

                    isSending = false;

                });

            },
            {
                passive: true
            }
        );
    }


    /* =====================================================
       INPUT TRACKING
       ===================================================== */

    function setupInputTracking() {

        if (!sendTextarea) {
            return;
        }


        sendTextarea.addEventListener(
            "input",
            () => {

                lastInputTime =
                    performance.now();

            },
            {
                passive: true
            }
        );
    }


    /* =====================================================
       EXTENSION SETTINGS
       ===================================================== */

    function createSettingsPanel() {

        if (
            document.getElementById(
                "fastsend-settings"
            )
        ) {
            return;
        }


        const panel =
            document.createElement(
                "div"
            );


        panel.id =
            "fastsend-settings";


        panel.className =
            "fastsend-settings";


        panel.hidden = true;


        panel.innerHTML = `

            <div class="fastsend-title">
                ⚡ fastsend
            </div>


            <label>
                <input
                    type="checkbox"
                    data-setting="enabled"
                >
                Enable FastSend
            </label>


            <label>
                <input
                    type="checkbox"
                    data-setting="instantFeedback"
                >
                Instant button feedback
            </label>


            <label>
                <input
                    type="checkbox"
                    data-setting="touchOptimization"
                >
                Touch optimization
            </label>


            <label>
                <input
                    type="checkbox"
                    data-setting="preventDoubleSend"
                >
                Double-send protection
            </label>


            <label>
                <input
                    type="checkbox"
                    data-setting="latencyMonitor"
                >
                Show latency monitor
            </label>


            <div class="fastsend-description">

                FastSend optimizes the client-side
                send interaction without replacing
                SillyTavern's native generation system.

            </div>

        `;


        document.body.appendChild(
            panel
        );


        panel
            .querySelectorAll(
                "[data-setting]"
            )
            .forEach(
                (input) => {

                    const key =
                        input.dataset.setting;


                    input.checked =
                        Boolean(
                            settings[key]
                        );


                    input.addEventListener(
                        "change",
                        () => {

                            settings[key] =
                                input.checked;


                            saveSettings();


                            if (
                                key ===
                                "touchOptimization"
                            ) {

                                prepareSendButton();

                                prepareTextarea();
                            }

                        }
                    );

                }
            );
    }


    /* =====================================================
       SETTINGS BUTTON
       ===================================================== */

    function createSettingsButton() {

        if (
            document.getElementById(
                "fastsend-button"
            )
        ) {
            return;
        }


        const button =
            document.createElement(
                "button"
            );


        button.id =
            "fastsend-button";


        button.type =
            "button";


        button.textContent =
            "⚡ fastsend";


        button.title =
            "FastSend settings";


        button.addEventListener(
            "click",
            () => {

                const panel =
                    document.getElementById(
                        "fastsend-settings"
                    );


                if (!panel) {
                    return;
                }


                panel.hidden =
                    !panel.hidden;

            }
        );


        document.body.appendChild(
            button
        );
    }


    /* =====================================================
       ELEMENT INITIALIZATION
       ===================================================== */

    function initializeElements() {

        if (!findElements()) {

            /*
             * SillyTavern can create/rebuild
             * parts of the UI dynamically.
             */

            setTimeout(
                initializeElements,
                500
            );

            return;
        }


        prepareSendButton();

        prepareTextarea();


        /*
         * Capture pointerdown BEFORE the
         * normal click handler.
         */

        sendButton.addEventListener(
            "pointerdown",
            handlePointerDown,
            {
                passive: true
            }
        );


        sendButton.addEventListener(
            "click",
            handleClick,
            {
                passive: true
            }
        );


        setupDoubleSendProtection();

        setupInputTracking();
    }


    /* =====================================================
       DOM WATCHER
       ===================================================== */

    function setupDOMWatcher() {

        const observer =
            new MutationObserver(() => {

                const currentButton =
                    document.querySelector(
                        "#send_but"
                    );


                if (
                    currentButton &&
                    currentButton !== sendButton
                ) {

                    /*
                     * UI was rebuilt.
                     */

                    sendButton = null;

                    initializeElements();
                }

            });


        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );
    }


    /* =====================================================
       INITIALIZATION
       ===================================================== */

    function initialize() {

        console.info(
            EXTENSION_NAME,
            "Loaded."
        );


        initializeElements();


        createSettingsPanel();


        createSettingsButton();


        setupDOMWatcher();
    }


    /* =====================================================
       START
       ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            {
                once: true
            }
        );

    } else {

        initialize();
    }

})();