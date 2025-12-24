// Import THREE for fog control
import * as THREE from 'three';

// Import ambient sound functions (will be loaded when needed)
let ambientSoundModule = null;
async function getAmbientSoundModule() {
    if (!ambientSoundModule) {
        ambientSoundModule = await import('./ambient-sound.js');
    }
    return ambientSoundModule;
}

// Import UI sound effects (will be loaded when needed)
let uiSoundsModule = null;
async function getUISoundsModule() {
    if (!uiSoundsModule) {
        uiSoundsModule = await import('./ui-sounds.js');
    }
    return uiSoundsModule;
}

// Import keybind functions
let keybindModule = null;
async function getKeybindModule() {
    if (!keybindModule) {
        keybindModule = await import('./config.js');
    }
    return keybindModule;
}

// Minimum volume threshold to consider audio as "playing" (avoids floating point precision issues)
const MIN_AUDIO_VOLUME = 0.001;

// Setup performance stats toggle
export function setupPerformanceStats() {
    const toggleStatsBtn = document.getElementById('toggle-stats');
    const perfStats = document.getElementById('perf-stats');
    if (toggleStatsBtn && perfStats) {
        toggleStatsBtn.addEventListener('click', () => {
            perfStats.style.display = perfStats.style.display === 'none' ? 'block' : 'none';
        });
    }
}

export function setupTechInfoPanel() {
    const toggleBtn = document.getElementById('tech-toggle-btn');
    const panel = document.getElementById('tech-info-panel');
    let panelVisible = false;

    if (!toggleBtn || !panel) {
        console.warn('Tech panel elements not found');
        return;
    }

    // Initialize panel as hidden
    panel.classList.add('tech-panel-hidden');
    panel.classList.remove('tech-panel-visible');

    // Toggle panel visibility
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panelVisible = !panelVisible;
        if (panelVisible) {
            panel.classList.remove('tech-panel-hidden');
            panel.classList.add('tech-panel-visible');
        } else {
            panel.classList.remove('tech-panel-visible');
            panel.classList.add('tech-panel-hidden');
        }
    });
}

export function setupGalleryPanel() {
    const galleryBtn = document.getElementById('gallery-btn');
    const galleryPanel = document.getElementById('gallery-panel');
    const closeBtn = document.getElementById('close-gallery');

    if (!galleryBtn || !galleryPanel) {
        console.warn('Gallery panel elements not found');
        return;
    }

    // Initialize panel as hidden
    galleryPanel.classList.add('gallery-panel-hidden');
    galleryPanel.classList.remove('gallery-panel-visible');

    // Show panel when Gallery button is clicked
    galleryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Disable countdown timer and auto-hide logic
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        
        // Hide and remove the countdown timer
        const timer = document.getElementById('countdown-timer');
        if (timer) {
            timer.style.display = 'none';
        }
        
        galleryPanel.classList.remove('gallery-panel-hidden');
        galleryPanel.classList.add('gallery-panel-visible');
    });

    // Close panel when close button is clicked
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            galleryPanel.classList.remove('gallery-panel-visible');
            galleryPanel.classList.add('gallery-panel-hidden');
        });
    }

    // Setup Gallery Tab Navigation
    setupGalleryTabs();
}

function setupGalleryTabs() {
    const tabs = document.querySelectorAll('.gallery-tab');
    const tabContents = document.querySelectorAll('.gallery-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetTab = tab.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const targetContent = document.getElementById(`gallery-${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

export function setupSettingsPanel() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const closeBtn = document.getElementById('close-settings');

    if (!settingsBtn || !settingsPanel) {
        console.warn('Settings panel elements not found');
        return;
    }

    // Initialize panel as hidden
    settingsPanel.classList.add('settings-panel-hidden');
    settingsPanel.classList.remove('settings-panel-visible');

    // Show panel when Settings button is clicked
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Disable countdown timer and auto-hide logic
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        
        // Hide and remove the countdown timer
        const timer = document.getElementById('countdown-timer');
        if (timer) {
            timer.style.display = 'none';
        }
        
        settingsPanel.classList.remove('settings-panel-hidden');
        settingsPanel.classList.add('settings-panel-visible');
    });

    // Close panel when close button is clicked
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsPanel.classList.remove('settings-panel-visible');
            settingsPanel.classList.add('settings-panel-hidden');
        });
    }

    // Setup Tab Navigation
    setupSettingsTabs();

    // Setup Audio Panel (after tabs so elements exist)
    setupAudioPanel();
    
    // Setup Controls Panel (after tabs so elements exist)
    setupControlsPanel();
    
    // Setup Video Panel (after tabs so elements exist)
    setupVideoPanel();
}

function setupSettingsTabs() {
    const tabs = document.querySelectorAll('.settings-tab');
    const tabContents = document.querySelectorAll('.settings-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetTab = tab.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const targetContent = document.getElementById(`tab-${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

function setupAudioPanel() {
    const masterAudioToggle = document.getElementById('toggle-master-audio');
    const musicToggle = document.getElementById('toggle-music');
    const bgMusic = document.getElementById('bg-music');

    if (!masterAudioToggle || !musicToggle || !bgMusic) {
        console.warn('Audio panel elements not found');
        return;
    }

    // Initialize audio state from localStorage or defaults
    const masterAudioEnabled = localStorage.getItem('masterAudioEnabled') !== 'false';
    const musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
    // CRITICAL: Check for null/undefined, not falsy (0 is valid!)
    const masterVolumeStr = localStorage.getItem('masterVolume');
    const masterVolume = masterVolumeStr !== null ? parseFloat(masterVolumeStr) : 1.0;
    const musicVolumeStr = localStorage.getItem('musicVolume');
    const musicVolume = musicVolumeStr !== null ? parseFloat(musicVolumeStr) : 1.0;

    masterAudioToggle.checked = masterAudioEnabled;
    musicToggle.checked = musicEnabled;

    // Initialize volume sliders
    setupVolumeSlider('master', masterVolume);
    setupVolumeSlider('music', musicVolume);

    // Apply initial state
    applyAudioSettings(masterAudioEnabled, musicEnabled, masterVolume, musicVolume);

    // Update slider disabled states
    updateSliderStates();

    // Master Audio Toggle
    masterAudioToggle.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        localStorage.setItem('masterAudioEnabled', enabled);
        // CRITICAL: Check for null/undefined, not falsy (0 is valid!)
        const masterVolStr = localStorage.getItem('masterVolume');
        const masterVol = masterVolStr !== null ? parseFloat(masterVolStr) : 1.0;
        const musicVolStr = localStorage.getItem('musicVolume');
        const musicVol = musicVolStr !== null ? parseFloat(musicVolStr) : 1.0;
        applyAudioSettings(enabled, musicToggle.checked, masterVol, musicVol);
        updateSliderStates();
        console.log('Master Audio:', enabled ? 'ON' : 'OFF');
    });

    // Music Toggle
    musicToggle.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        localStorage.setItem('musicEnabled', enabled);
        // CRITICAL: Check for null/undefined, not falsy (0 is valid!)
        const masterVolStr = localStorage.getItem('masterVolume');
        const masterVol = masterVolStr !== null ? parseFloat(masterVolStr) : 1.0;
        const musicVolStr = localStorage.getItem('musicVolume');
        const musicVol = musicVolStr !== null ? parseFloat(musicVolStr) : 1.0;
        applyAudioSettings(masterAudioToggle.checked, enabled, masterVol, musicVol);
        updateSliderStates();
        console.log('Background Music:', enabled ? 'ON' : 'OFF');
    });
}

function updateSliderStates() {
    const masterToggle = document.getElementById('toggle-master-audio');
    const musicToggle = document.getElementById('toggle-music');
    const masterControl = document.querySelector('#tab-audio .audio-control-item:first-child');
    const musicControl = document.querySelector('#tab-audio .audio-control-item:last-child');

    if (masterControl) {
        if (masterToggle && !masterToggle.checked) {
            masterControl.classList.add('disabled');
        } else {
            masterControl.classList.remove('disabled');
        }
    }

    if (musicControl) {
        if (musicToggle && !musicToggle.checked) {
            musicControl.classList.add('disabled');
        } else {
            musicControl.classList.remove('disabled');
        }
    }
}

function setupVolumeSlider(type, initialValue) {
    const slider = document.getElementById(`${type}-volume-slider`);
    const track = slider?.querySelector('.volume-slider-track');
    const fill = document.getElementById(`${type}-volume-fill`);
    const handle = document.getElementById(`${type}-volume-handle`);
    const percentage = document.getElementById(`${type}-volume-percentage`);

    if (!slider || !track || !fill || !handle || !percentage) {
        console.warn(`Volume slider elements not found for ${type}`);
        return;
    }

    let isDragging = false;
    let animationFrameId = null;

    // Set initial value
    updateSliderValue(type, initialValue, false);

    // Simple function to calculate percentage from mouse/touch position
    const getPercentageFromEvent = (clientX) => {
        const rect = track.getBoundingClientRect();
        const handleWidth = 18; // Handle is 18px wide, centered
        const handleHalfWidth = handleWidth / 2;
        
        // Calculate position relative to track, accounting for handle width
        const x = clientX - rect.left;
        // Adjust for handle width: when handle is at left edge, its center is at handleHalfWidth
        // So we need to map the click position to account for this
        const adjustedX = Math.max(0, Math.min(rect.width, x));
        const rawPercent = adjustedX / rect.width;
        
        // Round to 3 decimal places
        const rounded = Math.round(rawPercent * 1000) / 1000;
        
        // CRITICAL: If clicking in the first 5% of the track (accounting for handle width), treat as 0
        // This ensures clicking at the very left edge sets volume to 0
        return rounded <= 0.05 ? 0 : rounded;
    };

    // Update slider value from event
    const updateFromEvent = (e, isDraggingFlag) => {
        const clientX = e.clientX || e.touches?.[0]?.clientX;
        if (clientX === undefined) return;
        
        const percent = getPercentageFromEvent(clientX);
        updateSliderValue(type, percent, isDraggingFlag);
    };

    // Start dragging
    const startDrag = (e) => {
        isDragging = true;
        slider.classList.add('dragging');
        e.preventDefault();
        e.stopPropagation();
        // Update position immediately to prevent jumping
        updateFromEvent(e, true);
    };

    // Handle drag movement
    const handleDrag = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        
        animationFrameId = requestAnimationFrame(() => {
            updateFromEvent(e, true);
        });
    };

    // Stop dragging
    const stopDrag = () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        isDragging = false;
        slider.classList.remove('dragging');
    };

    // Click on track to jump to position
    track.addEventListener('click', (e) => {
        // Only handle if not dragging and not clicking on handle
        if (!isDragging && e.target !== handle && !handle.contains(e.target)) {
            updateFromEvent(e, false);
        }
    });

    // Handle mouse events
    handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        startDrag(e);
    });
    
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);

    // Handle touch events
    handle.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startDrag(e);
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        
        animationFrameId = requestAnimationFrame(() => {
            updateFromEvent(e, true);
        });
    });
    
    document.addEventListener('touchend', stopDrag);
}

// Throttle tracking for slider updates
const sliderThrottle = {
    lastSave: {},
    lastAudioUpdate: {}
};

function updateSliderValue(type, value, isDragging = false) {
    const slider = document.getElementById(`${type}-volume-slider`);
    const fill = document.getElementById(`${type}-volume-fill`);
    const handle = document.getElementById(`${type}-volume-handle`);
    const percentage = document.getElementById(`${type}-volume-percentage`);

    if (!fill || !handle || !percentage) return;

    let clampedValue = Math.max(0, Math.min(1, value));
    // Round to 3 decimal places to avoid floating point precision issues
    clampedValue = Math.round(clampedValue * 1000) / 1000;
    // CRITICAL: Must match getPercentageFromEvent threshold (0.05 = 5%)
    // If value is less than or equal to 5% (0.05), treat as exactly 0
    // This ensures dragging to the left edge always results in 0
    if (clampedValue <= 0.05) {
        clampedValue = 0;
    }
    const percentageValue = Math.round(clampedValue * 100);
    const percentageString = `${clampedValue * 100}%`;

    // Update visual elements instantly (no transitions during drag)
    fill.style.width = percentageString;
    handle.style.left = percentageString;
    percentage.textContent = `${percentageValue}%`;

    // Save to localStorage (throttle during dragging to reduce writes)
    const now = Date.now();
    if (!isDragging || !sliderThrottle.lastSave[type] || now - sliderThrottle.lastSave[type] > 50) {
        localStorage.setItem(`${type}Volume`, clampedValue.toString());
        sliderThrottle.lastSave[type] = now;
    }

    // Apply to audio (throttle during dragging, but update more frequently for smooth audio)
    if (!isDragging || !sliderThrottle.lastAudioUpdate[type] || now - sliderThrottle.lastAudioUpdate[type] > 16) {
        // CRITICAL: Get CURRENT values from DOM, not localStorage (which may be stale due to throttling)
        // Read the actual slider handle position to get the real current value
        let masterVol, musicVol;
        
        if (type === 'master') {
            masterVol = clampedValue;
            // Get music volume from its slider's current position in DOM
            const musicHandle = document.getElementById('music-volume-handle');
            let musicVolPercent = 1.0; // Default value
            
            if (musicHandle && musicHandle.style.left) {
                const parsed = parseFloat(musicHandle.style.left);
                if (!isNaN(parsed)) {
                    musicVolPercent = parsed / 100;
                }
            } else {
                // Fallback to localStorage
                const musicVolStr = localStorage.getItem('musicVolume');
                if (musicVolStr !== null) {
                    const parsed = parseFloat(musicVolStr);
                    if (!isNaN(parsed)) {
                        musicVolPercent = parsed;
                    }
                }
            }
            musicVol = Math.max(0, Math.min(1, musicVolPercent));
        } else {
            musicVol = clampedValue;
            // Get master volume from its slider's current position in DOM
            const masterHandle = document.getElementById('master-volume-handle');
            let masterVolPercent = 1.0; // Default value
            
            if (masterHandle && masterHandle.style.left) {
                const parsed = parseFloat(masterHandle.style.left);
                if (!isNaN(parsed)) {
                    masterVolPercent = parsed / 100;
                }
            } else {
                // Fallback to localStorage
                const masterVolStr = localStorage.getItem('masterVolume');
                if (masterVolStr !== null) {
                    const parsed = parseFloat(masterVolStr);
                    if (!isNaN(parsed)) {
                        masterVolPercent = parsed;
                    }
                }
            }
            masterVol = Math.max(0, Math.min(1, masterVolPercent));
        }
        
        // Round to avoid floating point issues
        masterVol = Math.round(masterVol * 1000) / 1000;
        musicVol = Math.round(musicVol * 1000) / 1000;
        
        // CRITICAL: Must match slider threshold (0.05 = 5%) to ensure consistency
        if (masterVol <= 0.05) masterVol = 0;
        if (musicVol <= 0.05) musicVol = 0;
        
        console.log(`[SLIDER] ${type} slider updated:`, {
            clampedValue,
            masterVol,
            musicVol,
            isDragging
        });
        
        applyAudioSettings(
            document.getElementById('toggle-master-audio')?.checked ?? true,
            document.getElementById('toggle-music')?.checked ?? true,
            masterVol,
            musicVol
        );
        sliderThrottle.lastAudioUpdate[type] = now;
    }
}

function setupControlsPanel() {
    const keybindItems = document.querySelectorAll('.keybind-item');
    let listeningElement = null;
    let listeningKeybind = null;
    
    // Load and display current keybinds
    async function updateKeybindDisplay() {
        const { loadKeybinds, getKeyDisplayName } = await getKeybindModule();
        const keybinds = loadKeybinds();
        
        keybindItems.forEach(item => {
            const keybindAction = item.getAttribute('data-keybind');
            if (keybindAction && keybinds[keybindAction]) {
                const keyElement = item.querySelector('.keybind-key');
                if (keyElement) {
                    const keyCode = keybinds[keybindAction];
                    keyElement.textContent = getKeyDisplayName(keyCode);
                    keyElement.setAttribute('data-keycode', keyCode);
                }
            }
        });
    }
    
    // Initialize display
    updateKeybindDisplay();
    
    // Handle keybind change
    async function startListeningForKey(element, keybindAction) {
        // Remove listening state from any previous element
        if (listeningElement) {
            listeningElement.classList.remove('listening');
        }
        
        // Set new listening state
        listeningElement = element;
        listeningKeybind = keybindAction;
        element.classList.add('listening');
        element.textContent = 'Press a key...';
        
        // Create one-time keydown listener
        const keydownHandler = async (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            const newKeyCode = event.code;
            
            // Don't allow Escape or other special keys
            if (newKeyCode === 'Escape' || newKeyCode.startsWith('F')) {
                // Cancel listening
                element.classList.remove('listening');
                await updateKeybindDisplay();
                listeningElement = null;
                listeningKeybind = null;
                document.removeEventListener('keydown', keydownHandler);
                return;
            }
            
            // Check if key is already bound to another action
            const { loadKeybinds, saveKeybinds, getKeyDisplayName } = await getKeybindModule();
            const currentKeybinds = loadKeybinds();
            let conflict = false;
            let conflictAction = null;
            
            for (const [action, keyCode] of Object.entries(currentKeybinds)) {
                if (action !== keybindAction && keyCode === newKeyCode) {
                    conflict = true;
                    conflictAction = action;
                    break;
                }
            }
            
            if (conflict) {
                // Show conflict message briefly
                const originalText = element.textContent;
                element.textContent = 'Already bound!';
                setTimeout(() => {
                    element.textContent = originalText;
                }, 1000);
                return;
            }
            
            // Update keybind
            currentKeybinds[keybindAction] = newKeyCode;
            saveKeybinds(currentKeybinds);
            
            // Update display
            element.classList.remove('listening');
            element.textContent = getKeyDisplayName(newKeyCode);
            element.setAttribute('data-keycode', newKeyCode);
            
            // Keybinds will be automatically reloaded on next key press
            // since the event handlers reload them dynamically
            
            // Clean up
            listeningElement = null;
            listeningKeybind = null;
            document.removeEventListener('keydown', keydownHandler);
        };
        
        document.addEventListener('keydown', keydownHandler, { once: false });
    }
    
    // Make each keybind key clickable
    keybindItems.forEach(item => {
        const keyElement = item.querySelector('.keybind-key');
        const keybindAction = item.getAttribute('data-keybind');
        
        if (keyElement && keybindAction) {
            keyElement.style.cursor = 'pointer';
            keyElement.addEventListener('click', async (e) => {
                e.stopPropagation();
                await startListeningForKey(keyElement, keybindAction);
            });
        }
    });
}

// Performance presets - Quick optimization configurations for different hardware capabilities
// Low: Maximum performance - all effects disabled for lowest-end hardware
// Mid: Balanced settings - moderate bloom intensity (0.5) with all effects enabled
// High: Best visuals - high bloom intensity (0.7) with all effects enabled
// Custom: Automatically selected when user modifies individual settings
const PERFORMANCE_PRESETS = {
    low: {
        antialiasing: false,
        bloom: false,
        bloomIntensity: 0,
        fog: false,
        snow: false,
        leaves: false
    },
    mid: {
        antialiasing: true,
        bloom: true,
        bloomIntensity: 0.5,
        fog: true,
        snow: true,
        leaves: true
    },
    high: {
        antialiasing: true,
        bloom: true,
        bloomIntensity: 0.7,
        fog: true,
        snow: true,
        leaves: true
    }
};

function setupSlider(id, initialValue, onUpdate, min = 0, max = 1, displayMultiplier = 100, displaySuffix = '%') {
    const slider = document.getElementById(id + '-slider') || document.getElementById(id.replace('toggle-', '') + '-slider'); 
    const fill = document.getElementById(id + '-fill') || document.getElementById(id.replace('toggle-', '') + '-fill');
    const handle = document.getElementById(id + '-handle') || document.getElementById(id.replace('toggle-', '') + '-handle');
    const percentage = document.getElementById(id + '-percentage') || document.getElementById(id.replace('toggle-', '') + '-percentage');
    const track = slider ? slider.querySelector('.volume-slider-track') : null;

    if (!slider || !fill || !handle || !percentage || !track) return;

    let isDragging = false;
    let animationFrameId = null;

    const updateUI = (val) => {
        const percent = (val - min) / (max - min);
        const clampedPercent = Math.max(0, Math.min(1, percent));
        
        fill.style.width = `${clampedPercent * 100}%`;
        handle.style.left = `${clampedPercent * 100}%`;
        
        let displayVal = val * displayMultiplier;
        if (displayMultiplier >= 100) displayVal = Math.round(displayVal);
        else displayVal = Math.round(displayVal * 10) / 10;
        
        percentage.textContent = `${displayVal}${displaySuffix}`;
    };

    // Allow external updates
    slider.setValue = (val) => {
        updateUI(val);
    };

    updateUI(initialValue);

    const getValueFromEvent = (clientX) => {
        const rect = track.getBoundingClientRect();
        const x = clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        return min + percent * (max - min);
    };

    const updateFromEvent = (e) => {
        const clientX = e.clientX || e.touches?.[0]?.clientX;
        if (clientX === undefined) return;
        
        const val = getValueFromEvent(clientX);
        updateUI(val);
        if (onUpdate) onUpdate(val);
    };

    const startDrag = (e) => {
        isDragging = true;
        slider.classList.add('dragging');
        e.preventDefault();
        e.stopPropagation();
        updateFromEvent(e);
    };

    const handleDrag = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(() => updateFromEvent(e));
    };

    const stopDrag = () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        isDragging = false;
        slider.classList.remove('dragging');
    };

    track.addEventListener('click', (e) => {
        if (!isDragging && e.target !== handle) updateFromEvent(e);
    });

    handle.addEventListener('mousedown', (e) => { e.stopPropagation(); startDrag(e); });
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);

    handle.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); startDrag(e); });
    document.addEventListener('touchmove', handleDrag);
    document.addEventListener('touchend', stopDrag);
}

// [TRACE: ARCHITECTURE.md] Video Settings Panel Setup
// Initializes comprehensive graphics configuration system with performance presets, render scale,
// antialiasing, post-processing, bloom controls, fog, and particle toggles.
// All settings persist to localStorage and apply in real-time via updateVideoSettings() in main.js.
function setupVideoPanel() {
    const presetSelect = document.getElementById('performance-preset');
    const antialiasingToggle = document.getElementById('toggle-antialiasing');
    const postProcessingToggle = document.getElementById('toggle-post-processing');
    const bloomToggle = document.getElementById('toggle-bloom');
    const fogToggle = document.getElementById('toggle-fog');
    const snowToggle = document.getElementById('toggle-snow');
    const leavesToggle = document.getElementById('toggle-leaves');

    // Helper to get typed settings from localStorage with fallback defaults
    const getBool = (key, def) => {
        const val = localStorage.getItem(key);
        return val === null ? def : val !== 'false';
    };
    const getFloat = (key, def) => {
        const val = localStorage.getItem(key);
        return val === null ? def : parseFloat(val);
    };

    // Current state - tracks all video settings for real-time updates
    let state = {
        antialiasing: getBool('antialiasingEnabled', true),
        renderScale: getFloat('renderScale', 1.0),
        postProcessing: getBool('postProcessingEnabled', true),
        bloomEnabled: getBool('bloomEnabled', true),
        bloomIntensity: getFloat('bloomIntensity', 0.7),
        bloomRadius: getFloat('bloomRadius', 0.4),
        bloomThreshold: getFloat('bloomThreshold', 0.8),
        fogEnabled: getBool('fogEnabled', false), // Default to off for menu visibility
        fogDensity: getFloat('fogDensity', 0.00), // Default to 0
        snowEnabled: getBool('snowEnabled', true),
        leavesEnabled: getBool('leavesEnabled', true)
    };

    let isApplyingPreset = false; // Prevents preset auto-switch during preset application

    // Update function - applies settings changes and triggers real-time updates
    const update = (changes) => {
        state = { ...state, ...changes };
        
        // Save to localStorage - uses descriptive keys for clarity
        Object.entries(changes).forEach(([key, val]) => {
            if (key === 'antialiasing') localStorage.setItem('antialiasingEnabled', val);
            else if (key === 'postProcessing') localStorage.setItem('postProcessingEnabled', val);
            else localStorage.setItem(key, val);
        });

        // Auto-switch to Custom preset when user modifies individual settings
        // This ensures preset dropdown accurately reflects current configuration
        if (presetSelect && !isApplyingPreset && (changes.antialiasing !== undefined || changes.bloomEnabled !== undefined || changes.fogEnabled !== undefined || changes.snowEnabled !== undefined || changes.leavesEnabled !== undefined || changes.bloomIntensity !== undefined)) {
            presetSelect.value = 'custom';
            localStorage.setItem('performancePreset', 'custom');
        }

        // Apply visual updates to toggles if needed (e.g. from preset)
        if (isApplyingPreset) {
            if (antialiasingToggle) antialiasingToggle.checked = state.antialiasing;
            if (postProcessingToggle) postProcessingToggle.checked = state.postProcessing;
            if (bloomToggle) bloomToggle.checked = state.bloomEnabled;
            if (fogToggle) fogToggle.checked = state.fogEnabled;
            if (snowToggle) snowToggle.checked = state.snowEnabled;
            if (leavesToggle) leavesToggle.checked = state.leavesEnabled;
            
            // Update sliders using the setValue method attached by setupSlider
            const setSlider = (id, val) => {
                const slider = document.getElementById(id + '-slider');
                if (slider && slider.setValue) slider.setValue(val);
            };
            setSlider('render-scale', state.renderScale);
            setSlider('bloom-intensity', state.bloomIntensity);
            setSlider('bloom-radius', state.bloomRadius);
            setSlider('bloom-threshold', state.bloomThreshold);
            setSlider('fog-density', state.fogDensity);
        }

        updateBloomSliderState();
        applyVideoSettings(state);
    };

    // Bind Toggles
    const bindToggle = (el, key) => {
        if (el) {
            el.checked = state[key];
            el.addEventListener('change', (e) => update({ [key]: e.target.checked }));
        }
    };
    bindToggle(antialiasingToggle, 'antialiasing');
    bindToggle(postProcessingToggle, 'postProcessing');
    bindToggle(bloomToggle, 'bloomEnabled');
    bindToggle(fogToggle, 'fogEnabled');
    bindToggle(snowToggle, 'snowEnabled');
    bindToggle(leavesToggle, 'leavesEnabled');

    // Bind Sliders
    setupSlider('render-scale', state.renderScale, (v) => update({ renderScale: v }), 0.1, 2.0, 100, '%');
    setupSlider('bloom-intensity', state.bloomIntensity, (v) => update({ bloomIntensity: v }), 0, 3.0, 10, '');
    setupSlider('bloom-radius', state.bloomRadius, (v) => update({ bloomRadius: v }), 0, 1.0, 10, '');
    setupSlider('bloom-threshold', state.bloomThreshold, (v) => update({ bloomThreshold: v }), 0, 1.0, 10, '');
    setupSlider('fog-density', state.fogDensity, (v) => update({ fogDensity: v }), 0, 0.2, 1000, ''); // Display x1000 for fog

    // Bind Preset
    if (presetSelect) {
        presetSelect.value = localStorage.getItem('performancePreset') || 'mid';
        presetSelect.addEventListener('change', (e) => {
            const preset = e.target.value;
            localStorage.setItem('performancePreset', preset);
            
            if (preset !== 'custom' && PERFORMANCE_PRESETS[preset]) {
                isApplyingPreset = true;
                const p = PERFORMANCE_PRESETS[preset];
                update({
                    antialiasing: p.antialiasing,
                    bloomEnabled: p.bloom,
                    fogEnabled: p.fog,
                    snowEnabled: p.snow,
                    leavesEnabled: p.leaves,
                    bloomIntensity: p.bloomIntensity
                });
                isApplyingPreset = false;
            }
        });
    }

    // Initial Apply
    applyVideoSettings(state);
    updateBloomSliderState();
}

// Updates bloom slider disabled state - disables bloom-specific sliders when bloom toggle is off
// Prevents user confusion by disabling controls that have no effect when bloom is disabled
function updateBloomSliderState() {
    const bloomToggle = document.getElementById('toggle-bloom');
    // Disable bloom-specific sliders if bloom is off
    const ids = ['bloom-intensity', 'bloom-radius', 'bloom-threshold'];
    
    ids.forEach(id => {
        const slider = document.getElementById(id + '-slider');
        const container = slider?.closest('.video-control-item');
        if (container) {
            if (bloomToggle && !bloomToggle.checked) {
                container.classList.add('disabled');
            } else {
                container.classList.remove('disabled');
            }
        }
    });
}

// [TRACE: ARCHITECTURE.md] Applies video settings to renderer, composer, scene, and particle manager
// Uses dynamic import to avoid circular dependencies and ensure main.js is loaded
// Maps UI settings to updateVideoSettings() parameters for real-time application
function applyVideoSettings(settings) {
    // Import scene objects dynamically - avoids circular dependencies
    import('./main.js').then(({ updateVideoSettings, particleManager }) => {
        updateVideoSettings({
            antialiasing: settings.antialiasing,
            pixelRatio: settings.renderScale,
            postProcessing: settings.postProcessing,
            bloomEnabled: settings.bloomEnabled,
            bloomStrength: settings.bloomIntensity,
            bloomRadius: settings.bloomRadius,
            bloomThreshold: settings.bloomThreshold,
            fogEnabled: settings.fogEnabled,
            fogDensity: settings.fogDensity
        });

        if (particleManager) {
            if (settings.snowEnabled !== undefined) particleManager.setSnowEnabled(settings.snowEnabled);
            if (settings.leavesEnabled !== undefined) particleManager.setLeavesEnabled(settings.leavesEnabled);
        }
    }).catch(err => console.warn('Could not apply video settings:', err));
}

function applyAudioSettings(masterEnabled, musicEnabled, masterVolume, musicVolume) {
    const bgMusic = document.getElementById('bg-music');
    if (!bgMusic) return;

    // Validate and clamp volumes - handle NaN and invalid values
    // CRITICAL: Use nullish coalescing to preserve 0 values (0 is valid, only null/undefined should default)
    let masterVol = masterVolume ?? 1.0;
    let musicVol = musicVolume ?? 1.0;
    
    // Check for NaN or non-finite values and replace with defaults
    if (!isFinite(masterVol) || isNaN(masterVol)) {
        console.warn('[AUDIO] Invalid masterVolume, using default 1.0');
        masterVol = 1.0;
    }
    if (!isFinite(musicVol) || isNaN(musicVol)) {
        console.warn('[AUDIO] Invalid musicVolume, using default 1.0');
        musicVol = 1.0;
    }
    
    // Clamp volumes to valid range [0, 1]
    masterVol = Math.max(0, Math.min(1, masterVol));
    musicVol = Math.max(0, Math.min(1, musicVol));
    
    // Round to 3 decimal places
    masterVol = Math.round(masterVol * 1000) / 1000;
    musicVol = Math.round(musicVol * 1000) / 1000;

    // Control ambient sound volume (async, but non-blocking)
    getAmbientSoundModule().then(module => {
        const { stopAmbientSound, setAmbientVolume, isAmbientPlaying } = module;
        
        if (!masterEnabled) {
            // Master audio off - stop ambient sound if playing
            if (isAmbientPlaying()) {
                stopAmbientSound();
            }
        } else {
            // Master on - update ambient sound volume
            setAmbientVolume(masterVol);
        }
    }).catch(err => {
        // Ambient sound module not available yet (not in first-person mode)
        // This is fine, volume will be set when entering first-person mode
    });

    // Calculate final volume
    const finalVolume = masterVol * musicVol;

    // Check if we should play music: toggles must be on AND volume must be greater than minimum threshold
    // CRITICAL: Must match slider threshold (0.05 = 5%) to ensure consistency
    // If EITHER volume is 0 or effectively 0 (less than 5% = 0.05), treat as muted
    const isEffectivelyMuted = masterVol <= 0.05 || musicVol <= 0.05 || finalVolume <= MIN_AUDIO_VOLUME;
    const shouldPlay = masterEnabled && musicEnabled && !isEffectivelyMuted;

    // DEBUG: Log what's happening
    console.log('[AUDIO] applyAudioSettings:', {
        masterEnabled,
        musicEnabled,
        masterVol,
        musicVol,
        finalVolume,
        isEffectivelyMuted,
        shouldPlay,
        currentlyPaused: bgMusic.paused
    });

    // CRITICAL: Always check muted state FIRST and pause immediately if muted
    // This prevents music from starting during drag when values briefly go above threshold
    if (isEffectivelyMuted || !masterEnabled || !musicEnabled) {
        // Volume is 0, muted, or disabled - PAUSE IMMEDIATELY (like toggles)
        if (!bgMusic.paused) {
            console.log('[AUDIO] PAUSING - muted or disabled');
            bgMusic.pause();
            bgMusic.currentTime = 0;
        }
        bgMusic.volume = 0;
    } else if (shouldPlay) {
        // Master on, music on, volume > 0 - apply volume and play if needed
        bgMusic.volume = finalVolume;
        if (bgMusic.paused) {
            console.log('[AUDIO] PLAYING - volume:', finalVolume);
            bgMusic.play().catch(err => {
                console.warn('Could not play music:', err);
            });
        }
    }
}

export function setupWorldGenPanel() {
    const playBtn = document.getElementById('play-btn');
    const worldGenPanel = document.getElementById('world-gen-panel');
    const closeBtn = document.getElementById('close-world-gen');

    if (!playBtn || !worldGenPanel) {
        console.warn('World gen panel elements not found');
        return;
    }

    // Initialize panel as hidden
    worldGenPanel.classList.add('world-gen-panel-hidden');
    worldGenPanel.classList.remove('world-gen-panel-visible');

    // Show panel when Play button is clicked
    playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Disable countdown timer and auto-hide logic
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        
        // Hide and remove the countdown timer
        const timer = document.getElementById('countdown-timer');
        if (timer) {
            timer.style.display = 'none';
        }
        
        worldGenPanel.classList.remove('world-gen-panel-hidden');
        worldGenPanel.classList.add('world-gen-panel-visible');
    });

    // Close panel when close button is clicked
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            worldGenPanel.classList.remove('world-gen-panel-visible');
            worldGenPanel.classList.add('world-gen-panel-hidden');
        });
    }

    // Handle toggle switches
    const treeToggle = document.getElementById('toggle-trees');
    const lightsToggle = document.getElementById('toggle-lights');
    const houseToggle = document.getElementById('toggle-house');
    const hillsToggle = document.getElementById('toggle-hills');
    const seedInput = document.getElementById('world-seed');

    // Load saved world generation settings
    const savedWorldSettings = localStorage.getItem('worldGenSettings');
    if (savedWorldSettings) {
        try {
            const settings = JSON.parse(savedWorldSettings);
            if (treeToggle && settings.trees !== undefined) treeToggle.checked = settings.trees;
            if (lightsToggle && settings.lights !== undefined) lightsToggle.checked = settings.lights;
            if (houseToggle && settings.house !== undefined) houseToggle.checked = settings.house;
            if (hillsToggle && settings.hills !== undefined) hillsToggle.checked = settings.hills;
            if (seedInput && settings.seed !== undefined) seedInput.value = settings.seed;
        } catch (e) {
            console.error('Error parsing saved world settings:', e);
        }
    }

    if (treeToggle) {
        treeToggle.addEventListener('change', (e) => {
            console.log('Trees:', e.target.checked ? 'ON' : 'OFF');
        });
    }

    if (lightsToggle) {
        lightsToggle.addEventListener('change', (e) => {
            console.log('Christmas Lights:', e.target.checked ? 'ON' : 'OFF');
        });
    }

    if (houseToggle) {
        houseToggle.addEventListener('change', (e) => {
            console.log('House:', e.target.checked ? 'ON' : 'OFF');
        });
    }

    if (hillsToggle) {
        hillsToggle.addEventListener('change', (e) => {
            console.log('Hills:', e.target.checked ? 'ON' : 'OFF');
        });
    }
    
    // Handle Generate World button
    const generateBtn = document.getElementById('generate-world-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            // Read toggle states
            const options = {
                trees: treeToggle ? treeToggle.checked : true,
                lights: lightsToggle ? lightsToggle.checked : true,
                house: houseToggle ? houseToggle.checked : true,
                hills: hillsToggle ? hillsToggle.checked : true,
                seed: seedInput ? seedInput.value.trim() : ''
            };

            // Save settings to localStorage
            localStorage.setItem('worldGenSettings', JSON.stringify(options));
            
            // Disable button during generation
            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';
            
            // Import modules
            const { regenerateWorld, enterFirstPersonMode } = await import('./main.js');
            const { showLoadingScreen, hideLoadingScreen, updateProgress } = await import('./loading-screen.js');
            
            try {
                // Hide world generation panel immediately
                worldGenPanel.classList.remove('world-gen-panel-visible');
                worldGenPanel.classList.add('world-gen-panel-hidden');
                
                // Show loading screen (this will hide all UI elements)
                showLoadingScreen();
                
                // Create progress callback
                const progressCallback = (percentage, statusText) => {
                    updateProgress(percentage, statusText);
                };
                
                // Regenerate world with progress tracking
                const groundHeight = await regenerateWorld(options, progressCallback);
                
                // Show "Entering World..." message
                updateProgress(100, 'Entering world...');
                
                // Small delay to show the final message
                await new Promise(resolve => setTimeout(resolve, 800));
                
                // Enter first-person mode (switch view)
                enterFirstPersonMode(groundHeight);
                
                // Ensure all UI is hidden state
                hideUI();
                hideGameUIButtons();
                
                // Hide loading screen (reveal game world)
                const { hideLoadingScreen } = await import('./loading-screen.js');
                hideLoadingScreen();
                
                console.log('World generated and first-person mode activated');
            } catch (error) {
                console.error('Error generating world:', error);
                
                // Hide loading screen on error
                const { hideLoadingScreen } = await import('./loading-screen.js');
                hideLoadingScreen();
                
                // Restore UI elements that were hidden
                const titleScreen = document.getElementById('title-screen');
                const newsReel = document.getElementById('news-reel');
                const audioWarning = document.querySelector('.audio-warning');
                const uiButtons = document.querySelectorAll('.ui-btn, .tech-toggle-btn');
                
                if (titleScreen) {
                    titleScreen.style.opacity = '';
                    titleScreen.style.visibility = '';
                    titleScreen.style.pointerEvents = '';
                    titleScreen.style.display = '';
                }
                
                if (newsReel) {
                    newsReel.style.opacity = '';
                    newsReel.style.visibility = '';
                    newsReel.style.pointerEvents = '';
                    newsReel.style.display = '';
                }
                
                if (audioWarning) {
                    audioWarning.style.opacity = '';
                    audioWarning.style.visibility = '';
                    audioWarning.style.pointerEvents = '';
                    audioWarning.style.display = '';
                }
                
                uiButtons.forEach(btn => {
                    if (btn) {
                        btn.style.opacity = '';
                        btn.style.visibility = '';
                        btn.style.pointerEvents = '';
                        btn.style.display = '';
                    }
                });
                
                // Reset button
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate World';
                
                // Show world gen panel again
                worldGenPanel.classList.remove('world-gen-panel-hidden');
                worldGenPanel.classList.add('world-gen-panel-visible');
                worldGenPanel.style.opacity = '';
                worldGenPanel.style.visibility = '';
                worldGenPanel.style.pointerEvents = '';
                worldGenPanel.style.display = '';
            }
        });
    }
}

// Function to hide game UI buttons (used when entering first-person mode)
function hideGameUIButtons() {
    const uiToggle = document.getElementById('ui-toggle');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const techBtn = document.getElementById('tech-toggle-btn');
    const quitBtn = document.getElementById('quit-btn');
    
    const hideButton = (btn) => {
        if (btn) {
            btn.style.transition = 'opacity 0.5s ease';
            btn.style.opacity = '0';
            btn.style.pointerEvents = 'none';
            btn.style.cursor = 'default';
            btn.classList.add('ui-hidden');
            // After fade, completely remove from layout
            setTimeout(() => {
                btn.style.display = 'none';
                btn.style.visibility = 'hidden';
                btn.style.position = 'absolute';
                btn.style.left = '-9999px';
                btn.style.top = '-9999px';
                btn.style.width = '0';
                btn.style.height = '0';
                btn.style.overflow = 'hidden';
            }, 500);
        }
    };
    
    hideButton(uiToggle);
    hideButton(fullscreenBtn);
    hideButton(techBtn);
    hideButton(quitBtn);
}

function setupNewsReelSnowflakes() {
    const newsContent = document.querySelector('#news-reel .news-content');
    if (!newsContent) return;

    const maxSnowflakes = 7;
    let activeSnowflakes = 0;

    function createSnowflake() {
        if (activeSnowflakes >= maxSnowflakes) return;

        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.textContent = '❄';
        
        // Random horizontal position (with padding)
        const containerWidth = newsContent.offsetWidth;
        const randomX = Math.random() * (containerWidth - 40) + 20; // 20px padding on each side
        
        // Random animation duration for variety (6-8 seconds - slower fall)
        const duration = 6 + Math.random() * 2;
        snowflake.style.left = `${randomX}px`;
        snowflake.style.top = '-10px';
        snowflake.style.animationDuration = `${duration}s`;
        
        // Minimal delay for faster entry
        snowflake.style.animationDelay = `${Math.random() * 0.3}s`;
        
        newsContent.appendChild(snowflake);
        activeSnowflakes++;

        // Remove snowflake when animation completes
        snowflake.addEventListener('animationend', () => {
            snowflake.remove();
            activeSnowflakes--;
        });
    }

    // Spawn initial snowflakes faster
    for (let i = 0; i < maxSnowflakes; i++) {
        setTimeout(() => createSnowflake(), i * 200);
    }

    // Continuously spawn new snowflakes at random intervals (faster spawning)
    function spawnLoop() {
        if (activeSnowflakes < maxSnowflakes) {
            createSnowflake();
        }
        // Random interval between 0.5-1.5 seconds (faster entry)
        const nextSpawn = 500 + Math.random() * 1000;
        setTimeout(spawnLoop, nextSpawn);
    }

    // Start the spawn loop after initial snowflakes
    setTimeout(spawnLoop, maxSnowflakes * 500);
}

function setupCountdownTimer() {
    const timer = document.getElementById('countdown-timer');
    const title = document.getElementById('title-screen');
    if (!timer || !title) return;

    // Clear any existing countdown
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    let countdown = 5;
    timer.textContent = countdown;

    countdownInterval = setInterval(() => {
        countdown--;
        timer.textContent = countdown;

        // Visual feedback as countdown approaches zero
        if (countdown === 3) {
            timer.classList.add('warning');
        } else if (countdown === 1) {
            timer.classList.remove('warning');
            timer.classList.add('critical');
        }

        if (countdown <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            
            // Completely remove timer from DOM
            timer.style.display = 'none';
            
            // Use shared hideUI function to maintain state consistency and enable double-click wake
            hideUI();
            
            // Add transition for smooth fade
            if (title) {
                title.style.transition = 'opacity 1s ease';
            }
            
            // Get all UI buttons and completely hide them
            const uiToggle = document.getElementById('ui-toggle');
            const fullscreenBtn = document.getElementById('fullscreen-btn');
            const techBtn = document.getElementById('tech-toggle-btn');
            const newsReel = document.getElementById('news-reel');
            const quitBtn = document.getElementById('quit-btn');
            
            // Completely remove buttons from layout - no hover, no click, nothing
            const hideButton = (btn) => {
                if (btn) {
                    btn.style.transition = 'opacity 0.5s ease';
                    btn.style.opacity = '0';
                    btn.style.pointerEvents = 'none';
                    btn.style.cursor = 'default';
                    btn.classList.add('ui-hidden');
                    // After fade, completely remove from layout
                    setTimeout(() => {
                        btn.style.display = 'none';
                        btn.style.visibility = 'hidden';
                        btn.style.position = 'absolute';
                        btn.style.left = '-9999px';
                        btn.style.top = '-9999px';
                        btn.style.width = '0';
                        btn.style.height = '0';
                        btn.style.overflow = 'hidden';
                    }, 500);
                }
            };
            
            hideButton(uiToggle);
            hideButton(fullscreenBtn);
            hideButton(techBtn);
            hideButton(quitBtn);
            
            if (newsReel) {
                newsReel.style.transition = 'opacity 1s ease';
                newsReel.style.opacity = '0';
                newsReel.style.pointerEvents = 'none';
                setTimeout(() => {
                    newsReel.style.display = 'none';
                }, 1000);
            }
        }
    }, 1000);
}

export function setupSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    const splashButton = document.getElementById('splash-continue');
    
    if (!splashScreen) {
        console.warn('Splash screen not found, starting app immediately');
        import('./main.js').then(({ startApp }) => startApp());
        return;
    }
    
    let dismissed = false;
    
    const dismissSplash = () => {
        if (dismissed) return;
        dismissed = true;
        
        console.log('Dismissing splash screen...');
        
        // Hide splash screen with transition
        splashScreen.style.transition = 'opacity 0.5s ease, visibility 0.5s ease';
        splashScreen.style.opacity = '0';
        splashScreen.style.visibility = 'hidden';
        splashScreen.style.pointerEvents = 'none';
        
        // Remove classes
        splashScreen.classList.remove('splash-screen-visible');
        splashScreen.classList.add('splash-screen-hidden');
        
        // Show canvas now that splash is dismissed (scene was already loading in background)
        setTimeout(() => {
            const canvas = document.querySelector('canvas');
            if (canvas) {
                canvas.style.display = 'block';
                console.log('✅ Canvas revealed - scene was already loaded!');
            }
        }, 100);
        
        // Start music when splash is dismissed (if enabled)
        const bgMusic = document.getElementById('bg-music');
        if (bgMusic) {
            // Check if music is enabled and apply volume
            const masterAudioEnabled = localStorage.getItem('masterAudioEnabled') !== 'false';
            const musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
            // CRITICAL: Check for null/undefined, not falsy (0 is valid!)
            const masterVolumeStr = localStorage.getItem('masterVolume');
            const masterVolume = masterVolumeStr !== null ? parseFloat(masterVolumeStr) : 1.0;
            const musicVolumeStr = localStorage.getItem('musicVolume');
            const musicVolume = musicVolumeStr !== null ? parseFloat(musicVolumeStr) : 1.0;
            
            // Clamp volumes
            const masterVol = Math.max(0, Math.min(1, masterVolume));
            const musicVol = Math.max(0, Math.min(1, musicVolume));
            const finalVolume = masterVol * musicVol;
            
            // CRITICAL: Must match slider threshold (0.05 = 5%) to ensure consistency
            const isEffectivelyMuted = masterVol <= 0.05 || musicVol <= 0.05 || finalVolume <= MIN_AUDIO_VOLUME;
            const shouldPlay = masterAudioEnabled && musicEnabled && !isEffectivelyMuted;
            
            if (shouldPlay) {
                bgMusic.volume = finalVolume;
                bgMusic.play().then(() => {
                    console.log('✅ Background music started from splash screen!');
                }).catch(err => {
                    console.error('Could not start music:', err);
                });
            } else {
                // Volume is 0, muted, or disabled - don't play
                bgMusic.pause();
                bgMusic.volume = 0;
                bgMusic.currentTime = 0;
            }
        }
        
        // Start the countdown timer now that splash is dismissed
        setupCountdownTimer();
        
        // App is already started and world generation is complete!
        // No need to call startApp() again
    };
    
    // Dismiss on button click
    if (splashButton) {
        splashButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            const { playClickSound } = await getUISoundsModule();
            playClickSound();
            dismissSplash();
        });
    }
    
    // Dismiss on any click on the splash screen background
    splashScreen.addEventListener('click', async (e) => {
        if (e.target === splashScreen || e.target.closest('.splash-content') === null) {
            const { playClickSound } = await getUISoundsModule();
            playClickSound();
            dismissSplash();
        }
    });
}

// Shared UI state and functions - accessible to countdown timer
let uiVisible = true;
let countdownInterval = null;

// Global UI control functions - can be called from anywhere
function hideUI() {
    uiVisible = false;
    const title = document.getElementById('title-screen');
    const uiBtn = document.getElementById('ui-toggle');
    const menuContainer = document.querySelector('.menu-container');
    const menuButtons = document.querySelectorAll('.menu-btn');
    
    if (title) {
        title.style.opacity = '0';
        title.style.pointerEvents = 'none';
        title.classList.add('ui-hidden');
    }
    if (uiBtn) uiBtn.innerText = 'Show UI';
    
    // Disable menu buttons - completely remove interactivity
    if (menuContainer) {
        menuContainer.style.pointerEvents = 'none';
        menuContainer.classList.add('ui-hidden');
    }
    menuButtons.forEach(btn => {
        btn.style.pointerEvents = 'none';
        btn.style.cursor = 'default';
        btn.classList.add('ui-hidden');
    });
}

export function showUI() {
    uiVisible = true;
    const title = document.getElementById('title-screen');
    const uiBtn = document.getElementById('ui-toggle');
    const menuContainer = document.querySelector('.menu-container');
    const menuButtons = document.querySelectorAll('.menu-btn');
    const newsReel = document.getElementById('news-reel');
    const audioWarning = document.querySelector('.audio-warning');
    
    if (title) {
        title.style.opacity = '1';
        title.style.visibility = 'visible';
        title.style.display = ''; // Clear any inline display: none
        title.style.pointerEvents = 'auto';
        title.classList.remove('ui-hidden');
        // Reset transition to CSS default (remove inline override from countdown timer)
        title.style.transition = '';
    }
    if (uiBtn) uiBtn.innerText = 'Hide UI';
    
    // Ensure audio warning is visible and properly positioned
    if (audioWarning) {
        audioWarning.style.opacity = '';
        audioWarning.style.visibility = '';
        audioWarning.style.display = '';
        audioWarning.style.pointerEvents = '';
        audioWarning.classList.remove('ui-hidden');
    }
    
    // Enable menu buttons
    if (menuContainer) {
        menuContainer.style.pointerEvents = 'auto';
        menuContainer.style.display = ''; // Clear any inline display: none
        menuContainer.style.visibility = '';
        menuContainer.style.opacity = '';
        menuContainer.classList.remove('ui-hidden');
    }
    menuButtons.forEach(btn => {
        btn.classList.remove('ui-hidden');
        btn.style.pointerEvents = 'auto';
        btn.style.display = ''; // Clear any inline display: none
        btn.style.visibility = '';
        btn.style.opacity = '';
        // Restore cursor for play, gallery, and settings buttons
        if (btn.id === 'play-btn' || btn.id === 'gallery-btn' || btn.id === 'settings-btn') {
            btn.style.cursor = 'pointer';
        }
    });
    
    // Restore news reel that was hidden by countdown timer
    if (newsReel) {
        newsReel.style.display = '';
        newsReel.style.opacity = '1';
        newsReel.style.pointerEvents = 'auto';
        newsReel.classList.remove('ui-hidden');
    }
    
    // Restore UI buttons that were hidden by countdown timer
    const allUIButtons = document.querySelectorAll('.ui-btn, .tech-toggle-btn');
    allUIButtons.forEach(btn => {
        if (btn && btn.classList.contains('ui-hidden')) {
            btn.classList.remove('ui-hidden');
            btn.style.display = '';
            btn.style.visibility = '';
            btn.style.position = '';
            btn.style.left = '';
            btn.style.top = '';
            btn.style.width = '';
            btn.style.height = '';
            btn.style.overflow = '';
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        }
    });
}

export function setupUI() {
    const uiBtn = document.getElementById('ui-toggle');
    const fsBtn = document.getElementById('fullscreen-btn');

    // Setup menu button sound effects
    setupMenuButtonSounds();

    // Setup global message listener for C# communication
    if (window.chrome && window.chrome.webview) {
        window.chrome.webview.addEventListener('message', event => {
            const message = event.data;
            // Message can be a string or an object depending on how it's sent
            // If sent via PostWebMessageAsString, it's a string.
            // If sent via PostWebMessageAsJson, it's an object.
            
            // We'll assume C# might send a JSON string for load-world
            if (typeof message === 'string') {
                try {
                    const data = JSON.parse(message);
                    if (data.type === 'load-world-data') {
                        handleLoadedWorld(data.data);
                    }
                } catch (e) {
                    // Not JSON or other message
                }
            } else if (typeof message === 'object') {
                 if (message.type === 'load-world-data') {
                     handleLoadedWorld(message.data);
                 }
            }
        });
    }

    // Toggle UI Visibility
    uiBtn.addEventListener('click', () => {
        if (uiVisible) {
            hideUI();
        } else {
            showUI();
        }
    });

    // Double-click to restore UI when hidden (works after auto-hide too)
    document.addEventListener('dblclick', (e) => {
        // Only restore if UI is hidden and not clicking on UI elements
        if (!uiVisible && !e.target.closest('#title-screen') && !e.target.closest('.ui-btn') && !e.target.closest('.tech-toggle-btn')) {
            showUI();
        }
    });

    // Toggle Fullscreen
    fsBtn.addEventListener('click', () => {
        // Check if we're in a WebView2 desktop application
        if (window.chrome && window.chrome.webview && window.chrome.webview.postMessage) {
            // Send message to C# to toggle fullscreen/windowed mode
            window.chrome.webview.postMessage('toggle-fullscreen');
        } else {
            // Fallback to browser fullscreen API for web version
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.warn(`Error enabling fullscreen: ${err.message}`);
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        }
    });

    // Quit Button
    const quitBtn = document.getElementById('quit-btn');
    if (quitBtn) {
        quitBtn.addEventListener('click', () => {
            // Send message to C# to close the application
            if (window.chrome && window.chrome.webview && window.chrome.webview.postMessage) {
                window.chrome.webview.postMessage('quit');
            } else {
                // Fallback: try to close the window
                window.close();
            }
        });
    }

    // Setup splash screen FIRST (before everything else)
    setupSplashScreen();
    
    // These will be set up after splash is dismissed (in startApp)
    // But we can set up the event handlers now
    setupTechInfoPanel();
    setupPerformanceStats();
    setupWorldGenPanel();
    setupGalleryPanel();
    setupSettingsPanel();
    setupPauseMenu();
    setupNewsReelSnowflakes();
    // Countdown timer will be started when splash screen is dismissed
    // setupCountdownTimer(); // Moved to splash dismissal
}

// Handle loaded world data
async function handleLoadedWorld(data) {
    if (!data || !data.worldSettings) {
        console.error('Invalid world data loaded');
        return;
    }

    console.log('Loading world:', data);

    // Update localStorage
    localStorage.setItem('worldGenSettings', JSON.stringify(data.worldSettings));

    // Update UI elements
    const treeToggle = document.getElementById('toggle-trees');
    const lightsToggle = document.getElementById('toggle-lights');
    const houseToggle = document.getElementById('toggle-house');
    const hillsToggle = document.getElementById('toggle-hills');
    const seedInput = document.getElementById('world-seed');
    
    if (treeToggle && data.worldSettings.trees !== undefined) treeToggle.checked = data.worldSettings.trees;
    if (lightsToggle && data.worldSettings.lights !== undefined) lightsToggle.checked = data.worldSettings.lights;
    if (houseToggle && data.worldSettings.house !== undefined) houseToggle.checked = data.worldSettings.house;
    if (hillsToggle && data.worldSettings.hills !== undefined) hillsToggle.checked = data.worldSettings.hills;
    if (seedInput && data.worldSettings.seed !== undefined) seedInput.value = data.worldSettings.seed;

    // Trigger regeneration
    // We need to simulate the generation flow
    const { regenerateWorld, enterFirstPersonMode, resumeGame } = await import('./main.js');
    const { showLoadingScreen, hideLoadingScreen, updateProgress } = await import('./loading-screen.js');

    // Close pause menu
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) {
        pauseMenu.classList.remove('pause-menu-visible');
        pauseMenu.classList.add('pause-menu-hidden');
    }

    // Show loading
    showLoadingScreen();

    try {
        const progressCallback = (percentage, statusText) => {
            updateProgress(percentage, statusText);
        };

        const groundHeight = await regenerateWorld(data.worldSettings, progressCallback);
        
        updateProgress(100, 'World loaded!');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // We are likely already in first person mode if using pause menu
        // But if we loaded from somewhere else, we might need to enter it.
        // If we are already in game, we just need to resume.
        // But regenerateWorld resets the world, so we need to re-enter or reset controls?
        // regenerateWorld keeps the camera/controls but clears the scene content.
        // enterFirstPersonMode resets controls if needed.
        
        // Let's assume we want to stay in or enter first person mode.
        enterFirstPersonMode(groundHeight);
        resumeGame(); // Unlock pointer and hide menu
        
        hideLoadingScreen();
        
    } catch (err) {
        console.error('Error loading world:', err);
        hideLoadingScreen();
    }
}

// Setup pause menu
export function setupPauseMenu() {
    const pauseMenu = document.getElementById('pause-menu');
    const resumeBtn = document.getElementById('pause-resume-btn');
    const saveBtn = document.getElementById('pause-save-btn');
    const loadBtn = document.getElementById('pause-load-btn');
    const settingsBtn = document.getElementById('pause-settings-btn');
    const quitBtn = document.getElementById('pause-quit-btn');
    
    if (!pauseMenu) {
        console.warn('Pause menu element not found');
        return;
    }
    
    // Initialize pause menu as hidden
    pauseMenu.classList.add('pause-menu-hidden');
    pauseMenu.classList.remove('pause-menu-visible');
    
    // Resume button
    if (resumeBtn) {
        resumeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const { playClickSound } = await getUISoundsModule();
            playClickSound();
            
            const { resumeGame } = await import('./main.js');
            resumeGame();
        });
    }

    // Save World button
    if (saveBtn) {
        saveBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const { playClickSound } = await getUISoundsModule();
            playClickSound();

            // Get current world settings
            const savedWorldSettings = localStorage.getItem('worldGenSettings');
            const worldSettings = savedWorldSettings ? JSON.parse(savedWorldSettings) : {};
            
            // Collect data to save
            const saveData = {
                timestamp: Date.now(),
                worldSettings: worldSettings,
                // Add more data here (e.g. player position)
            };

            // Send to C#
            if (window.chrome && window.chrome.webview) {
                // Send as a prefixed string for easier parsing in C# without JSON library
                window.chrome.webview.postMessage('save-world:' + JSON.stringify(saveData));
            } else {
                console.warn('Save World only supported in desktop app');
                // Fallback: Download JSON file
                const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `world-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        });
    }

    // Load World button
    if (loadBtn) {
        loadBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const { playClickSound } = await getUISoundsModule();
            playClickSound();

            // Request load from C#
            if (window.chrome && window.chrome.webview) {
                window.chrome.webview.postMessage('load-world');
            } else {
                 console.warn('Load World only supported in desktop app');
                 // Fallback: File input
                 const input = document.createElement('input');
                 input.type = 'file';
                 input.accept = '.json';
                 input.onchange = (e) => {
                     const file = e.target.files[0];
                     if (!file) return;
                     const reader = new FileReader();
                     reader.onload = async (event) => {
                         try {
                             const data = JSON.parse(event.target.result);
                             handleLoadedWorld(data);
                         } catch (err) {
                             console.error('Error loading world:', err);
                         }
                     };
                     reader.readAsText(file);
                 };
                 input.click();
            }
        });
    }
    
    // Settings button
    if (settingsBtn) {
        settingsBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const { playClickSound } = await getUISoundsModule();
            playClickSound();
            
            // Open settings panel (pause menu stays visible behind it)
            const settingsPanel = document.getElementById('settings-panel');
            if (settingsPanel) {
                settingsPanel.classList.remove('settings-panel-hidden');
                settingsPanel.classList.add('settings-panel-visible');
            }
        });
    }
    
    // Note: Settings panel close handler is already set up in setupSettingsPanel()
    // When settings panel closes from pause menu, the pause menu will remain visible
    // because it has a lower z-index and the settings panel just closes normally
    
    // Quit to Menu button
    if (quitBtn) {
        quitBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const { playClickSound } = await getUISoundsModule();
            playClickSound();
            
            const { exitFirstPersonMode } = await import('./main.js');
            exitFirstPersonMode();
            
            // Stop countdown timer if running
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
            
            // Hide loading screen if visible
            const { hideLoadingScreen } = await import('./loading-screen.js');
            hideLoadingScreen();
            
            // Ensure canvas is visible (it should be, but make sure)
            const { renderer } = await import('./main.js');
            if (renderer && renderer.domElement) {
                renderer.domElement.style.display = 'block';
            }
            
            // Close all panels
            const settingsPanel = document.getElementById('settings-panel');
            const worldGenPanel = document.getElementById('world-gen-panel');
            const galleryPanel = document.getElementById('gallery-panel');
            const techPanel = document.getElementById('tech-info-panel');
            
            if (settingsPanel) {
                settingsPanel.classList.remove('settings-panel-visible');
                settingsPanel.classList.add('settings-panel-hidden');
            }
            if (worldGenPanel) {
                worldGenPanel.classList.remove('world-gen-panel-visible');
                worldGenPanel.classList.add('world-gen-panel-hidden');
            }
            if (galleryPanel) {
                galleryPanel.classList.remove('gallery-panel-visible');
                galleryPanel.classList.add('gallery-panel-hidden');
            }
            if (techPanel) {
                techPanel.classList.remove('tech-info-panel-visible');
                techPanel.classList.add('tech-info-panel-hidden');
            }
            
            // Clear all !important inline styles added by loading screen
            // These need to be explicitly removed since they override CSS
            const titleScreen = document.getElementById('title-screen');
            const menuContainer = document.querySelector('.menu-container');
            const menuButtons = document.querySelectorAll('.menu-btn');
            const newsReel = document.getElementById('news-reel');
            const audioWarning = document.querySelector('.audio-warning');
            const uiButtons = document.querySelectorAll('.ui-btn, .tech-toggle-btn');
            const countdownTimer = document.getElementById('countdown-timer');
            
            const clearImportantStyles = (element) => {
                if (element) {
                    element.style.removeProperty('display');
                    element.style.removeProperty('opacity');
                    element.style.removeProperty('visibility');
                    element.style.removeProperty('pointer-events');
                }
            };
            
            clearImportantStyles(titleScreen);
            clearImportantStyles(menuContainer);
            clearImportantStyles(newsReel);
            clearImportantStyles(audioWarning);
            
            menuButtons.forEach(clearImportantStyles);
            uiButtons.forEach(clearImportantStyles);
            
            // Reset countdown timer element if it exists
            if (countdownTimer) {
                clearImportantStyles(countdownTimer);
                // Remove any warning/critical classes
                countdownTimer.classList.remove('warning', 'critical');
                // Reset text to 5
                countdownTimer.textContent = '5';
                // Make it visible again
                countdownTimer.style.display = '';
                countdownTimer.style.visibility = '';
            }
            
            // Use showUI() to properly restore all UI elements
            showUI();
            
            // Restart countdown timer (after a brief delay to ensure UI is visible)
            setTimeout(() => {
                setupCountdownTimer();
            }, 100);
            
            // Restart background music
            const bgMusic = document.getElementById('bg-music');
            if (bgMusic) {
                const masterAudioEnabled = localStorage.getItem('masterAudioEnabled') !== 'false';
                const musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
                const masterVolumeStr = localStorage.getItem('masterVolume');
                const masterVolume = masterVolumeStr !== null ? parseFloat(masterVolumeStr) : 1.0;
                const musicVolumeStr = localStorage.getItem('musicVolume');
                const musicVolume = musicVolumeStr !== null ? parseFloat(musicVolumeStr) : 1.0;
                
                const masterVol = Math.max(0, Math.min(1, masterVolume));
                const musicVol = Math.max(0, Math.min(1, musicVolume));
                const finalVolume = masterVol * musicVol;
                
                const MIN_AUDIO_VOLUME = 0.001;
                const isEffectivelyMuted = masterVol <= 0.05 || musicVol <= 0.05 || finalVolume <= MIN_AUDIO_VOLUME;
                const shouldPlay = masterAudioEnabled && musicEnabled && !isEffectivelyMuted;
                
                if (shouldPlay) {
                    bgMusic.volume = finalVolume;
                    bgMusic.play().catch(err => console.log('Could not resume music:', err));
                }
            }
        });
    }
    
    // Escape key handler for pausing (only in first-person mode)
    document.addEventListener('keydown', async (event) => {
        // Only handle Escape if in first-person mode and not in keybind listening mode
        if (event.code === 'Escape') {
            const keybindItems = document.querySelectorAll('.keybind-item.listening');
            if (keybindItems.length > 0) {
                // Don't pause if user is changing a keybind
                return;
            }
            
            // Check if we're in first-person mode
            const { getIsPaused, pauseGame, resumeGame, getIsFirstPersonMode } = await import('./main.js');
            const isFirstPerson = getIsFirstPersonMode();
            
            // Only handle pause/resume if in first-person mode
            if (isFirstPerson) {
                event.preventDefault();
                event.stopPropagation();
                
                const isPaused = getIsPaused();
                
                // If already paused, resume (hide menu)
                // If not paused, pause (unlock pointer and show menu)
                if (isPaused) {
                    resumeGame();
                } else {
                    // Pause immediately - this will unlock pointer and show menu in one action
                    pauseGame();
                }
            }
        }
    });
}

// Setup sound effects for menu buttons
function setupMenuButtonSounds() {
    const menuButtons = document.querySelectorAll('.menu-btn');
    
    menuButtons.forEach(button => {
        // Hover sound
        button.addEventListener('mouseenter', async () => {
            const { playHoverSound } = await getUISoundsModule();
            playHoverSound();
        });
        
        // Click sound
        button.addEventListener('click', async (e) => {
            const { playClickSound } = await getUISoundsModule();
            playClickSound();
        });
    });
}
