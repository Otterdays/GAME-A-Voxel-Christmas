import { SCENE_OPTS, GAME_WORLD_OPTS, PEAK_HEIGHT } from './config.js';
import { setupScene, createRenderer, createComposer } from './scene-setup.js';
import { generateTerrainInstanced, generateHouse, generateTrees, clearWorld, getGroundHeight, generateGameWorld } from './world-gen.js';
import { ParticleManager } from './particles.js';
import { FirstPersonControls } from './first-person-controls.js';
import { initAmbientSound, startAmbientSound, stopAmbientSound, setAmbientVolume } from './ambient-sound.js';
import { MiniMap, getPlayerYaw } from './minimap.js';
import * as THREE from 'three';

let scene, camera, renderer, composer, orbitControls, firstPersonControls;
let particleManager;
let isFirstPersonMode = false;
let isPaused = false; // Pause state
let isHandlingPause = false; // Flag to prevent double-handling of pause requests
let gameWorldContainer = null;
let menuWorldContainer = null;
let gameParticleManager = null;
let miniMap = null;
const _minimapForward = new THREE.Vector3();
let lastTime = performance.now(); // For deltaTime calculation
// Master toggle for post-processing - when false, uses direct renderer instead of composer
// Controlled by video settings panel, affects whether post-processing pipeline is used in animation loop
let postProcessingEnabled = true; // Toggle for post-processing

// Performance monitoring
let frameCount = 0;
let lastFpsTime = performance.now();
let fps = 60;

// Block highlighting system
let blockHighlight = null;
let raycaster = null;
const RAYCAST_DISTANCE = 5; // Maximum distance to highlight blocks

// Performance optimization: Cache raycast objects to avoid scene traversal every frame
let cachedRaycastObjects = [];
let objectsCacheDirty = true;
let raycastFrameSkip = 0;
const RAYCAST_INTERVAL = 2; // Check every 2 frames (30 FPS update rate is still smooth)

function init() {
    // 1. Setup Scene
    const sceneObjects = setupScene(SCENE_OPTS);
    scene = sceneObjects.scene;
    camera = sceneObjects.camera;
    renderer = sceneObjects.renderer;
    composer = sceneObjects.composer;
    orbitControls = sceneObjects.controls;

    // Canvas is hidden initially (behind splash screen) but still rendering
    const canvas = renderer.domElement;
    canvas.style.display = 'none'; // Hidden until splash dismissed

    // 2. Generate Menu World in its own group so play worlds never share objects
    menuWorldContainer = new THREE.Group();
    menuWorldContainer.name = 'MenuWorld';
    scene.add(menuWorldContainer);
    generateTerrainInstanced(menuWorldContainer, SCENE_OPTS, { enableSnowEdges: false });
    generateHouse(menuWorldContainer);
    generateTrees(menuWorldContainer, SCENE_OPTS);
    invalidateRaycastCache();

    // 3. Particles belong to the menu world until a game world is created
    particleManager = new ParticleManager(menuWorldContainer, SCENE_OPTS);
    
    // Apply saved particle settings
    const snowEnabled = localStorage.getItem('snowEnabled') !== 'false';
    const leavesEnabled = localStorage.getItem('leavesEnabled') !== 'false';
    particleManager.setSnowEnabled(snowEnabled);
    particleManager.setLeavesEnabled(leavesEnabled);

    // 4. Initialize block highlighting system
    initBlockHighlighting();

    // 5. Minimap overlay (hidden until a play world is entered)
    const minimapRoot = document.getElementById('minimap');
    const minimapCanvas = document.getElementById('minimap-canvas');
    if (minimapRoot && minimapCanvas) {
        miniMap = new MiniMap(minimapRoot, minimapCanvas);
    }

    // 6. Start Background Music
    setupBackgroundMusic();

    // 7. Hide Loading
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.opacity = '0';
        setTimeout(() => {
            loading.style.display = 'none';
        }, 500);
    }

    // 7. Start Loop (rendering happens even though canvas is hidden)
    animate();
    
    console.log('✅ Scene initialized and world generation complete!');
}

// Initialize block highlighting system
function initBlockHighlighting() {
    // Create raycaster for detecting blocks
    raycaster = new THREE.Raycaster();
    
    // Create highlight box (wireframe outline)
    const highlightGeometry = new THREE.BoxGeometry(1.01, 1.01, 1.01); // Slightly larger than blocks
    const highlightMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.8
    });
    
    blockHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
    blockHighlight.visible = false;
    blockHighlight.renderOrder = 999; // Render on top
    scene.add(blockHighlight);
}

// Invalidate raycast cache when world changes (call after world generation)
function invalidateRaycastCache() {
    objectsCacheDirty = true;
    cachedRaycastObjects = [];
}

// Get cached raycast objects (only rebuilds when cache is dirty)
function getRaycastObjects() {
    // Return cached list if valid
    if (!objectsCacheDirty && cachedRaycastObjects.length > 0) {
        return cachedRaycastObjects;
    }
    
    // Rebuild cache
    const objectsToCheck = [];
    
    // Add game world container if it exists (prioritize game world)
    if (gameWorldContainer) {
        gameWorldContainer.traverse((child) => {
            if ((child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) && child.visible) {
                objectsToCheck.push(child);
            }
        });
    }
    
    // Also check scene for menu world blocks (only if no game world)
    if (!gameWorldContainer || objectsToCheck.length === 0) {
        scene.traverse((child) => {
            // Skip game world container (already checked)
            if (child === gameWorldContainer) return;
            if ((child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) && child.visible) {
                // Only check blocks, not lights or other objects
                if (!child.material || !child.material.emissive) {
                    objectsToCheck.push(child);
                }
            }
        });
    }
    
    // Update cache
    cachedRaycastObjects = objectsToCheck;
    objectsCacheDirty = false;
    return cachedRaycastObjects;
}

// Update block highlighting (called in animate loop)
// OPTIMIZED: Uses cached object list and frame throttling to prevent FPS drops
function updateBlockHighlight() {
    if (!isFirstPersonMode || !raycaster || !blockHighlight || !firstPersonControls || !firstPersonControls.isLocked()) {
        blockHighlight.visible = false;
        return;
    }
    
    // Throttle: only raycast every N frames (30 FPS update is still smooth for highlighting)
    raycastFrameSkip++;
    if (raycastFrameSkip < RAYCAST_INTERVAL) {
        return; // Skip this frame
    }
    raycastFrameSkip = 0;
    
    // Cast ray from camera in forward direction
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = RAYCAST_DISTANCE;
    
    // OPTIMIZED: Use cached object list instead of traversing scene every frame
    const objectsToCheck = getRaycastObjects();
    
    // Find intersections
    const intersects = raycaster.intersectObjects(objectsToCheck, false);
    
    if (intersects.length > 0) {
        const intersection = intersects[0];
        let blockX, blockY, blockZ;
        
        // Calculate block position from intersection point
        // Works for both regular meshes and instanced meshes
        const point = intersection.point.clone();
        const normal = intersection.face.normal.clone();
        
        // Move slightly back along the normal to get inside the block, then round to center
        const offset = normal.multiplyScalar(0.1); // Small offset to get inside block
        const blockCenter = point.sub(offset);
        
        // Round to nearest block position (blocks are at integer coordinates)
        blockX = Math.round(blockCenter.x);
        blockY = Math.round(blockCenter.y);
        blockZ = Math.round(blockCenter.z);
        
        // Position highlight at block center
        blockHighlight.position.set(blockX, blockY, blockZ);
        blockHighlight.visible = true;
    } else {
        blockHighlight.visible = false;
    }
}

function setupBackgroundMusic() {
    const bgMusic = document.getElementById('bg-music');
    if (!bgMusic) {
        console.warn('Background music element not found');
        return;
    }

    // Load saved audio settings
    const masterAudioEnabled = localStorage.getItem('masterAudioEnabled') !== 'false';
    const musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
    // CRITICAL: Check for null/undefined, not falsy (0 is valid!)
    const masterVolumeStr = localStorage.getItem('masterVolume');
    const masterVolume = masterVolumeStr !== null ? parseFloat(masterVolumeStr) : 1.0;
    const musicVolumeStr = localStorage.getItem('musicVolume');
    const musicVolume = musicVolumeStr !== null ? parseFloat(musicVolumeStr) : 1.0;

    // Clamp volumes to ensure valid values
    const masterVol = Math.max(0, Math.min(1, masterVolume));
    const musicVol = Math.max(0, Math.min(1, musicVolume));
    const finalVolume = masterVol * musicVol;

    // Minimum volume threshold (must match ui.js constant)
    const MIN_AUDIO_VOLUME = 0.001;
    
    // CRITICAL: Must match slider threshold (0.05 = 5%) to ensure consistency
    const isEffectivelyMuted = masterVol <= 0.05 || musicVol <= 0.05 || finalVolume <= MIN_AUDIO_VOLUME;
    const shouldPlay = masterAudioEnabled && musicEnabled && !isEffectivelyMuted;
    
    // CRITICAL: ALWAYS ensure audio is in correct state
    if (shouldPlay) {
        bgMusic.volume = finalVolume;
    } else {
        // MUST pause the audio element if volume is 0 or disabled
        bgMusic.pause();
        bgMusic.currentTime = 0;
        bgMusic.volume = 0;
    }

    // Music will be started when splash screen is dismissed (if enabled)
    // This function just sets up the audio element
    console.log('✅ Background music initialized - settings: masterAudio=' + masterAudioEnabled + ', musicEnabled=' + musicEnabled);
    
    // Log audio errors
    bgMusic.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        console.error('Audio error details:', bgMusic.error);
    });
}

function animate() {
    requestAnimationFrame(animate);
    
    // Calculate deltaTime for frame-independent movement
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap at 100ms to prevent large jumps
    lastTime = currentTime;
    
    // Update appropriate controls based on mode
    // PERFORMANCE: Only update controls for active mode to avoid unnecessary work
    if (isFirstPersonMode && firstPersonControls && !isPaused) {
        // Update movement (WASD controls) - only when not paused
        firstPersonControls.updateMovement(deltaTime);
        // PointerLockControls handles mouse movement automatically via event listeners
        
        // Update block highlighting (already optimized with caching and throttling)
        updateBlockHighlight();
    } else if (orbitControls && !isFirstPersonMode && orbitControls.enabled) {
        // Only update orbit controls if enabled and in orbit mode
        orbitControls.update();
        // Hide highlight when not in first-person mode
        if (blockHighlight) {
            blockHighlight.visible = false;
        }
    } else if (isPaused && blockHighlight) {
        // Hide highlight when paused
        blockHighlight.visible = false;
    }

    if (isFirstPersonMode && gameParticleManager) {
        gameParticleManager.update(camera);
    } else if (particleManager && !isFirstPersonMode) {
        particleManager.update();
    }

    if (isFirstPersonMode && miniMap && camera) {
        miniMap.update(camera.position.x, camera.position.z, getPlayerYaw(camera, _minimapForward));
    }

    // Performance monitoring (reuse currentTime from deltaTime calculation above)
    frameCount++;
    if (currentTime >= lastFpsTime + 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastFpsTime));
        frameCount = 0;
        lastFpsTime = currentTime;
        updatePerfStats();
    }

    // Render with post-processing or directly
    if (postProcessingEnabled && composer) {
        composer.render();
    } else if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Recreate renderer with new settings
async function recreateRenderer(antialias) {
    if (!renderer) return;

    // Save current state
    const pixelRatio = renderer.getPixelRatio();
    const width = window.innerWidth;
    const height = window.innerHeight;
    const oldDomElement = renderer.domElement;
    
    // Dispose old renderer
    renderer.dispose();
    
    // Create new renderer
    renderer = createRenderer({ antialias, pixelRatio });
    renderer.setSize(width, height);
    
    // Replace DOM element
    if (oldDomElement && oldDomElement.parentNode) {
        oldDomElement.parentNode.replaceChild(renderer.domElement, oldDomElement);
    } else {
        document.body.appendChild(renderer.domElement);
    }
    
    // Recreate composer with new renderer
    if (composer) {
        // Dispose old composer passes if needed (though mostly handled by GC)
        composer = createComposer(renderer, scene, camera);
        composer.setSize(width, height);
    }
    
    // Update controls to use new DOM element
    if (orbitControls) {
        // OrbitControls needs to be recreated or updated with new DOM element
        // Since OrbitControls takes domElement in constructor, easiest is to dispose and recreate
        // or just update if it supports it (it doesn't have setDomElement)
        const oldTarget = orbitControls.target.clone();
        const oldEnabled = orbitControls.enabled;
        const oldAutoRotate = orbitControls.autoRotate;
        
        orbitControls.dispose();
        
        // Import dynamically to avoid circular dependency issues if any
        const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
        orbitControls = new OrbitControls(camera, renderer.domElement);
        orbitControls.enableDamping = true;
        orbitControls.autoRotate = oldAutoRotate;
        orbitControls.autoRotateSpeed = 0.3;
        orbitControls.target.copy(oldTarget);
        orbitControls.enabled = oldEnabled;
    }
    
    // Update first person controls to use new DOM element
    if (firstPersonControls) {
        // FirstPersonControls also takes domElement in constructor
        // We need to handle this carefully as it has event listeners
        const wasLocked = firstPersonControls.isLocked();
        firstPersonControls.dispose();
        
        firstPersonControls = new FirstPersonControls(
            camera, 
            renderer.domElement, 
            getGroundHeight, 
            GAME_WORLD_OPTS
        );
        
        // Restore lock if it was locked (unlikely during settings change but good practice)
        // Actually, settings usually require unlocking pointer, so we might just need to re-setup listeners
        
        // Update pointer lock click handler
        const canvas = renderer.domElement;
        // Remove old listener if possible (though old canvas is gone)
        // Add new listener
        // We need to re-bind the click handler from enterFirstPersonMode context
        // This is tricky because the handler is local to enterFirstPersonMode.
        // Ideally we should make the handler global or accessible.
        // For now, let's assume settings are changed in pause menu (unlocked), 
        // and resumeGame will handle re-locking.
    }
    
    // Re-setup pointer lock click handler for the new canvas
    if (renderer.domElement._pointerLockHandler) {
         // This property was on the old canvas, we lost it.
         // We need a robust way to re-attach the listener.
         // Let's rely on resumeGame to re-establish locks/listeners if needed, 
         // or better: define the handler outside.
    }
    
    console.log(`Renderer recreated with antialias: ${antialias}`);
}

// [TRACE: ARCHITECTURE.md] Real-time video settings application
// Applies graphics settings to renderer, composer, scene, and particle systems without restart.
// 
// Supported Parameters:
// - antialiasing: Boolean - Smooths jagged edges (requires renderer recreation - cannot change dynamically)
// - renderScale: Number (0.1-2.0) - Resolution scaling multiplier (applied as devicePixelRatio * renderScale)
// - pixelRatio: Number - Alternative to renderScale (direct pixel ratio value, renderScale takes precedence)
// - postProcessing: Boolean - Master toggle for all post-processing effects (controls composer vs direct renderer)
// - bloomEnabled: Boolean - Enables/disables bloom effect pass
// - bloomStrength / bloomIntensity: Number (0-3.0) - Bloom effect strength (aliases, both supported)
// - bloomRadius: Number (0-1.0) - Bloom spread radius
// - bloomThreshold: Number (0-1.0) - Brightness threshold for bloom application
// - fogEnabled: Boolean - Enables/disables atmospheric fog
// - fogDensity: Number (0-0.2) - Fog density for exponential fog (FogExp2)
//
// Technical Notes:
// - Render scale multiplies devicePixelRatio to maintain high-DPI display support while allowing performance tuning
// - Antialiasing changes require full renderer recreation (WebGL context attribute cannot be changed after creation)
// - Post-processing toggle controls whether animation loop uses composer or direct renderer
// - Bloom parameters updated in real-time without recreating composer (pass properties are mutable)
// - Fog created/removed dynamically, density updated in real-time when fog exists
// - Fog color matches scene background color for seamless integration
export function updateVideoSettings(settings) {
    const { 
        antialiasing, 
        pixelRatio, 
        renderScale, // Resolution scaling multiplier (preferred over pixelRatio)
        postProcessing, 
        bloomEnabled, 
        bloomRadius, 
        bloomThreshold, 
        bloomStrength,
        bloomIntensity, // Alias for bloomStrength
        fogEnabled,
        fogDensity
    } = settings;

    // Handle Antialiasing - requires full renderer recreation (WebGL context attribute immutable)
    if (renderer && antialiasing !== undefined) {
        const currentAntialias = renderer.getContext().getContextAttributes().antialias;
        if (currentAntialias !== antialiasing) {
            recreateRenderer(antialias);
        }
    }

    // Handle Render Scale / Pixel Ratio
    // Render scale multiplies devicePixelRatio to maintain high-DPI support while allowing performance tuning
    // Lower render scale = better performance, higher = better quality
    if (renderer) {
        if (renderScale !== undefined) {
             renderer.setPixelRatio(window.devicePixelRatio * renderScale);
        } else if (pixelRatio !== undefined) {
            renderer.setPixelRatio(pixelRatio);
        }
    }

    // Handle Post Processing Toggle - controls whether animation loop uses composer or direct renderer
    if (postProcessing !== undefined) {
        postProcessingEnabled = postProcessing;
    }

    // Handle Bloom Settings - updated in real-time without recreating composer
    if (composer) {
        const bloomPass = composer.passes.find(pass => pass.constructor.name === 'UnrealBloomPass');
        if (bloomPass) {
            if (bloomEnabled !== undefined) bloomPass.enabled = bloomEnabled;
            if (bloomRadius !== undefined) bloomPass.radius = bloomRadius;
            if (bloomThreshold !== undefined) bloomPass.threshold = bloomThreshold;
            // Support both bloomStrength and bloomIntensity aliases for compatibility
            const strength = bloomStrength !== undefined ? bloomStrength : bloomIntensity;
            if (strength !== undefined) bloomPass.strength = strength;
        }
    }

    // Handle Fog - creates/removes fog dynamically, updates density in real-time
    if (scene) {
        if (fogEnabled !== undefined) {
            if (fogEnabled) {
                // Create exponential fog if it doesn't exist (matches scene background color)
                if (!scene.fog) {
                    scene.fog = new THREE.FogExp2(SCENE_OPTS.bgColor, fogDensity || 0.007);
                }
            } else {
                // Remove fog when disabled
                scene.fog = null;
            }
        }
        
        // Update fog density in real-time when fog exists
        if (scene.fog && fogDensity !== undefined) {
            scene.fog.density = fogDensity;
        }
    }
}

// Create or get game world container
function getGameWorldContainer() {
    if (!gameWorldContainer) {
        gameWorldContainer = new THREE.Group();
        gameWorldContainer.name = 'GameWorld';
        gameWorldContainer.visible = false;
        scene.add(gameWorldContainer);
    }
    return gameWorldContainer;
}

function setMenuWorldVisible(visible) {
    if (menuWorldContainer) menuWorldContainer.visible = visible;
}

function applyParticleSettingsTo(manager) {
    if (!manager) return;
    const snowEnabled = localStorage.getItem('snowEnabled') !== 'false';
    const leavesEnabled = localStorage.getItem('leavesEnabled') !== 'false';
    manager.setSnowEnabled(snowEnabled);
    manager.setLeavesEnabled(leavesEnabled);
}

export function setParticleToggles(snowEnabled, leavesEnabled) {
    if (particleManager) {
        if (snowEnabled !== undefined) particleManager.setSnowEnabled(snowEnabled);
        if (leavesEnabled !== undefined) particleManager.setLeavesEnabled(leavesEnabled);
    }
    if (gameParticleManager) {
        if (snowEnabled !== undefined) gameParticleManager.setSnowEnabled(snowEnabled);
        if (leavesEnabled !== undefined) gameParticleManager.setLeavesEnabled(leavesEnabled);
    }
}

export async function regenerateWorld(options, progressCallback = null) {
    const gameContainer = getGameWorldContainer();
    setMenuWorldVisible(false);
    gameContainer.visible = true;

    try {
        if (gameParticleManager) {
            gameParticleManager.dispose();
            gameParticleManager = null;
        }
        clearWorld(gameContainer);
        invalidateRaycastCache();

        const groundHeight = await generateGameWorld(
            gameContainer,
            GAME_WORLD_OPTS,
            options,
            progressCallback
        );

        gameParticleManager = new ParticleManager(gameContainer, GAME_WORLD_OPTS, { follow: true });
        applyParticleSettingsTo(gameParticleManager);

        if (miniMap) {
            miniMap.build();
        }

        invalidateRaycastCache();
        await new Promise((resolve) => setTimeout(resolve, 200));
        return groundHeight;
    } catch (err) {
        setMenuWorldVisible(true);
        gameContainer.visible = false;
        if (miniMap) miniMap.setVisible(false);
        throw err;
    }
}

// Enter first-person mode
export function enterFirstPersonMode(spawnY) {
    if (isFirstPersonMode) return;
    
    isFirstPersonMode = true;
    
    // Stop main menu background music
    const bgMusic = document.getElementById('bg-music');
    if (bgMusic) {
        bgMusic.pause();
        bgMusic.currentTime = 0; // Reset to beginning
        console.log('Main menu music stopped');
    }
    
    // Initialize and start ambient wind sound
    // Load audio settings to respect master audio toggle
    const masterAudioEnabled = localStorage.getItem('masterAudioEnabled') !== 'false';
    // CRITICAL: Check for null/undefined, not falsy (0 is valid!)
    const masterVolumeStr = localStorage.getItem('masterVolume');
    const masterVolume = masterVolumeStr !== null ? parseFloat(masterVolumeStr) : 1.0;
    
    if (masterAudioEnabled) {
        initAmbientSound();
        setAmbientVolume(masterVolume);
        startAmbientSound().catch(err => {
            console.warn('Could not start ambient sound:', err);
        });
    }
    
    // Disable orbit controls
    if (orbitControls) {
        orbitControls.enabled = false;
        orbitControls.autoRotate = false;
    }
    
    // Create first-person controls if they don't exist
    if (!firstPersonControls) {
        firstPersonControls = new FirstPersonControls(
            camera, 
            renderer.domElement,
            getGroundHeight, // Ground collision callback
            GAME_WORLD_OPTS  // Scene options for ground height calculation
        );
        
        // Listen for pointer unlock events to auto-pause when pointer is unlocked via escape
        // (handles case where browser unlocks pointer via escape before our handler runs)
        firstPersonControls.getControls().addEventListener('unlock', () => {
            // Auto-pause if we're in first-person mode, not already paused, and not currently handling pause
            // Use a small delay to ensure we're after any synchronous unlock calls
            if (isFirstPersonMode && !isPaused && !isHandlingPause) {
                setTimeout(() => {
                    // Double-check state after delay to avoid race conditions
                    if (isFirstPersonMode && !isPaused && !isHandlingPause && firstPersonControls && !firstPersonControls.isLocked()) {
                        pauseGame();
                    }
                }, 10);
            }
        });
    } else {
        // Reload keybinds in case they were changed
        firstPersonControls.reloadKeybinds();
    }
    
    // Show play world only — menu preview stays hidden so the two scenes stay separate
    setMenuWorldVisible(false);
    if (gameWorldContainer) {
        gameWorldContainer.visible = true;
    }
    if (miniMap) miniMap.setVisible(true);
    
    // Position camera at spawn location (ground level + eye height)
    const eyeHeight = 1.6; // Standard player eye height
    camera.position.set(0, spawnY + eyeHeight, 0);
    camera.rotation.set(0, 0, 0);
    firstPersonControls.resetRotation();
    
    // Show crosshair
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
        crosshair.classList.remove('crosshair-hidden');
        crosshair.classList.add('crosshair-visible');
    }
    
    // Request pointer lock - requires user gesture, so set up click handler
    // Pointer lock must be requested from a user gesture (click, keypress, etc.)
    // Since we're entering first-person mode after async world generation,
    // we need to wait for the next user click
    let pointerLockClickHandler = null;
    
    pointerLockClickHandler = (event) => {
        if (firstPersonControls && isFirstPersonMode && !isPaused) {
            // Only request if pointer is not already locked
            if (!firstPersonControls.isLocked()) {
                try {
                    const lockResult = firstPersonControls.lock();
                    // Check if lock() returns a Promise before calling .catch()
                    if (lockResult && typeof lockResult.catch === 'function') {
                        lockResult.catch(err => {
                            // Silently handle errors - pointer lock might not be available
                            // This is expected if not in a user gesture context
                        });
                    }
                } catch (err) {
                    // Silently handle errors - pointer lock might not be available
                }
            }
        }
    };
    
    // Add click listener to canvas/renderer for pointer lock
    const canvas = renderer.domElement;
    canvas.addEventListener('click', pointerLockClickHandler);
    
    // Store handler reference for cleanup
    canvas._pointerLockHandler = pointerLockClickHandler;
    
    // Also try to request immediately (might work if still in gesture context from button click)
    // This will fail silently if not in a gesture context
    if (firstPersonControls) {
        try {
            const lockResult = firstPersonControls.lock();
            // Check if lock() returns a Promise before calling .catch()
            if (lockResult && typeof lockResult.catch === 'function') {
                lockResult.catch(() => {
                    // Expected to fail if not in gesture context - click handler will handle it
                });
            }
        } catch (err) {
            // Silently handle errors - pointer lock might not be available
        }
    }
    
    console.log('Entered first-person mode - click to enable mouse look');
}

// Exit first-person mode
export function exitFirstPersonMode() {
    if (!isFirstPersonMode) return;
    
    isFirstPersonMode = false;
    isPaused = false; // Reset pause state when exiting
    isHandlingPause = false; // Reset pause handling flag
    
    // Stop ambient wind sound
    stopAmbientSound();
    
    // Unlock pointer
    if (firstPersonControls) {
        firstPersonControls.unlock();
    }
    
    // Remove click listener for pointer lock
    if (renderer && renderer.domElement) {
        const canvas = renderer.domElement;
        if (canvas._pointerLockHandler) {
            canvas.removeEventListener('click', canvas._pointerLockHandler);
            delete canvas._pointerLockHandler;
        }
    }
    
    // Hide play world and restore the independent menu preview
    if (gameWorldContainer) {
        gameWorldContainer.visible = false;
    }
    setMenuWorldVisible(true);
    if (miniMap) miniMap.setVisible(false);
    
    // Reset camera to menu view position
    if (camera) {
        camera.position.set(75, 45, 75);
        camera.rotation.set(0, 0, 0);
    }
    
    // Re-enable and reset orbit controls for menu view
    if (orbitControls) {
        orbitControls.enabled = true;
        orbitControls.autoRotate = true;
        orbitControls.target.set(0, PEAK_HEIGHT / 2, 0);
        orbitControls.update(); // Force update to apply changes
    }
    
    // Hide crosshair
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
        crosshair.classList.remove('crosshair-visible');
        crosshair.classList.add('crosshair-hidden');
    }
    
    // Hide block highlight
    if (blockHighlight) {
        blockHighlight.visible = false;
    }
    
    // Hide pause menu
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) {
        pauseMenu.classList.remove('pause-menu-visible');
        pauseMenu.classList.add('pause-menu-hidden');
    }
    
    console.log('Exited first-person mode');
}

// Pause game
export function pauseGame() {
    if (!isFirstPersonMode || isPaused || isHandlingPause) return;
    
    isHandlingPause = true;
    isPaused = true;
    
    // Unlock pointer to allow mouse movement for menu interaction
    if (firstPersonControls) {
        firstPersonControls.unlock();
    }
    
    // Show pause menu immediately
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) {
        pauseMenu.classList.remove('pause-menu-hidden');
        pauseMenu.classList.add('pause-menu-visible');
    }
    
    // Reset handling flag after a brief delay
    setTimeout(() => {
        isHandlingPause = false;
    }, 50);
    
    console.log('Game paused');
}

// Resume game
export function resumeGame() {
    if (!isFirstPersonMode || !isPaused) return;
    
    isPaused = false;
    isHandlingPause = false;
    
    // Hide pause menu
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) {
        pauseMenu.classList.remove('pause-menu-visible');
        pauseMenu.classList.add('pause-menu-hidden');
    }
    
    // Re-lock pointer for first-person controls
    // Pointer lock requires user gesture, so request it on next canvas click
    if (firstPersonControls && renderer && renderer.domElement) {
        const canvas = renderer.domElement;
        const requestPointerLock = () => {
            if (firstPersonControls && isFirstPersonMode && !isPaused) {
                if (!firstPersonControls.isLocked()) {
                    try {
                        const lockResult = firstPersonControls.lock();
                        // Check if lock() returns a Promise before calling .catch()
                        if (lockResult && typeof lockResult.catch === 'function') {
                            lockResult.catch(err => {
                                console.log('Pointer lock not available:', err.message);
                            });
                        }
                    } catch (err) {
                        // Silently handle errors
                    }
                }
            }
        };
        
        // Small delay to ensure menu is hidden
        setTimeout(() => {
            // Try to lock immediately (might work if user just clicked resume button)
            try {
                const lockResult = firstPersonControls.lock();
                // Check if lock() returns a Promise before calling .catch()
                if (lockResult && typeof lockResult.catch === 'function') {
                    lockResult.catch(() => {
                        // Expected to fail if not in gesture context - canvas click will handle it
                        // Click handler is already set up in enterFirstPersonMode
                    });
                }
            } catch (err) {
                // Silently handle errors
            }
        }, 100);
    }
    
    console.log('Game resumed');
}

// Toggle pause
export function togglePause() {
    if (isPaused) {
        resumeGame();
    } else {
        pauseGame();
    }
}

// Check if game is paused
export function getIsPaused() {
    return isPaused;
}

// Check if in first-person mode
export function getIsFirstPersonMode() {
    return isFirstPersonMode;
}

// Performance stats update function
function updatePerfStats() {
    const fpsEl = document.getElementById('fps-value');
    const drawCallsEl = document.getElementById('draw-calls');
    const trianglesEl = document.getElementById('triangles');
    const geometriesEl = document.getElementById('geometries');
    const texturesEl = document.getElementById('textures');
    
    if (fpsEl) fpsEl.textContent = fps;
    if (drawCallsEl && renderer) drawCallsEl.textContent = renderer.info.render.calls;
    if (trianglesEl && renderer) trianglesEl.textContent = renderer.info.render.triangles;
    if (geometriesEl && renderer) geometriesEl.textContent = renderer.info.memory.geometries;
    if (texturesEl && renderer) texturesEl.textContent = renderer.info.memory.textures;
}

// Export scene objects for UI access
// Note: pause functions (pauseGame, resumeGame, togglePause, getIsPaused, getIsFirstPersonMode) are exported above as function declarations
export { scene, camera, renderer, composer, particleManager };

// Start the app immediately (world generation happens in background)
// Splash screen stays visible until user clicks, but scene is loading behind it
let appStarted = false;

export function startApp() {
    if (appStarted) return;
    appStarted = true;
    
    console.log('Starting app - world generation begins in background...');
    init();
}

// Start the app immediately (world generation in background)
startApp();

// Set up UI (includes splash screen)
// Splash screen will hide when user clicks, but scene is already loading
import('./ui.js').then(({ setupUI }) => {
    setupUI();
});
