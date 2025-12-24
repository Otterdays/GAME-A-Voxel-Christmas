# Architecture Overview

## Distribution

The application can be packaged as a Windows executable using WebView2:
- **Wrapper**: .NET WinForms application (`Program.cs`)
- **Runtime**: WebView2 (lightweight, ~1-5MB package)
- **Packaging**: Scripts in `portable/` folder create distributable packages
- **Output**: Fullscreen application that loads `index.html` in WebView2
- **Communication**: JavaScript-to-C# message passing via `window.chrome.webview.postMessage()` for application control (e.g., quit button)

## Core Components

### 1. Entry Point (`index.html`)
- Loads styles from `css/style.css`.
- Imports `js/main.js` as the module entry point.
- Provides the basic DOM structure for UI overlays.

### 2. Main Logic (`js/main.js`)
- Orchestrates the initialization sequence.
- Manages the main animation loop (`animate`).
- Integrates the Scene, World Generation, Particles, and UI.
- **Dual World System**: 
  - **Menu World**: Generated directly in scene for menu viewing (75 block radius)
  - **Game World**: Generated in separate THREE.Group container for gameplay (150 block radius, 2x larger)
  - Menu world remains intact when generating game world
- **First-Person Mode**: Manages camera mode switching between orbit and first-person views.
  - `enterFirstPersonMode(spawnY)`: Switches to first-person camera with PointerLockControls, stops main menu music, starts ambient wind sound, shows crosshair, sets up block highlighting
  - `exitFirstPersonMode()`: Returns to orbit camera mode, stops ambient wind sound, hides crosshair and block highlight
  - `pauseGame()`: Pauses gameplay, unlocks pointer, shows pause menu
  - `resumeGame()`: Resumes gameplay, hides pause menu, re-locks pointer
  - `togglePause()`: Toggles pause state
  - `getIsPaused()`: Returns current pause state
  - `getIsFirstPersonMode()`: Returns current first-person mode state
  - `regenerateWorld(options, progressCallback)`: Creates separate game world in dedicated container (async with progress callback)
    - Accepts optional `progressCallback(percentage, statusText)` function for real-time progress updates
    - Progress updates at key generation stages (terrain, structures, trees)
    - Returns Promise that resolves with ground height for camera positioning
- **Crosshair System**: Centered crosshair for first-person aiming reference
  - Automatically shown/hidden when entering/exiting first-person mode
  - Simple white crosshair with horizontal and vertical lines
  - Non-interactive overlay (pointer-events: none)
- **Block Highlighting System**: Real-time visual feedback for block targeting
  - Uses THREE.Raycaster to detect blocks the player is looking at
  - White wireframe outline (slightly larger than blocks) highlights targeted blocks
  - Maximum highlight distance: 5 units
  - Works with both regular meshes and instanced meshes
  - Updates continuously in animation loop (only in first-person mode)
  - Automatically hides when paused or exiting first-person mode
- **Pause System**: Full pause functionality for first-person gameplay
  - Escape key toggles pause (only active in first-person mode)
  - Pause menu with three options: Resume, Settings, Quit to Menu
  - Movement and controls disabled when paused
  - Pointer automatically unlocks when paused for menu interaction
  - Pointer re-locks when resuming (requires user click for gesture context)
  - Proper z-index layering (pause menu below settings panel)
- **Video Settings System** (`updateVideoSettings(settings)`): Real-time graphics settings application
  - **Supported Parameters**:
    - `antialiasing`: Boolean - Smooths jagged edges (requires renderer recreation when changed)
    - `renderScale`: Number (0.1-2.0) - Resolution scaling multiplier (applied as `devicePixelRatio * renderScale`)
    - `pixelRatio`: Number - Alternative to renderScale (direct pixel ratio value)
    - `postProcessing`: Boolean - Master toggle for all post-processing effects
    - `bloomEnabled`: Boolean - Enables/disables bloom effect
    - `bloomStrength` / `bloomIntensity`: Number (0-3.0) - Bloom effect strength (aliases, both supported)
    - `bloomRadius`: Number (0-1.0) - Bloom spread radius
    - `bloomThreshold`: Number (0-1.0) - Brightness threshold for bloom application
    - `fogEnabled`: Boolean - Enables/disables atmospheric fog
    - `fogDensity`: Number (0-0.2) - Fog density (exponential fog)
  - **Renderer Updates**:
    - Antialiasing changes require full renderer recreation (cannot be changed dynamically)
    - Render scale multiplies `window.devicePixelRatio` for resolution scaling
    - Pixel ratio can be set directly or via render scale multiplier
  - **Post-Processing Updates**:
    - `postProcessingEnabled` flag controls whether composer or direct renderer is used
    - Bloom pass parameters updated in real-time when bloom is enabled
    - Bloom pass can be enabled/disabled without recreating composer
  - **Fog Management**:
    - Creates `THREE.FogExp2` when fog is enabled (if not already exists)
    - Removes fog from scene when disabled
    - Updates fog density in real-time when fog exists
    - Default fog color matches scene background color
  - **Integration**: Called dynamically from `applyVideoSettings()` in `ui.js` via module import

### 3. Configuration (`js/config.js`)
- **Menu World Config** (`SCENE_OPTS`): Configuration for menu/preview world
  - World radius: 75 blocks
  - Tree count: 140
  - Snow particles: 3000
- **Game World Config** (`GAME_WORLD_OPTS`): Configuration for gameplay world (2x larger)
  - World radius: 150 blocks
  - Tree count: 400
  - Snow particles: 6000
  - All dimensions scaled proportionally
- **Keybind Configuration**:
  - `DEFAULT_KEYBINDS`: Default key mappings (forward: 'KeyW', backward: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space')
  - `loadKeybinds()`: Loads keybinds from localStorage or returns defaults
  - `saveKeybinds(keybinds)`: Saves keybinds to localStorage
  - `getKeyDisplayName(keyCode)`: Converts key codes to display names (e.g., 'KeyW' → 'W')
  - `getKeybind(action)`: Gets keybind for a specific action
  - Keybinds stored in localStorage with automatic fallback to defaults
- Allows easy tuning of procedural generation parameters (radius, counts, colors).

### 4. Modules
- **`js/scene-setup.js`**: Boilerplate Three.js setup.
  - **Renderer**: Uses `THREE.WebGLRenderer` (Standard WebGL).
  - **Post-Processing**: Uses `EffectComposer` with `UnrealBloomPass` for bloom effects.
  - **Window Resize Observer**: Listens to `window.resize` event to update camera aspect ratio, renderer size, and composer size.
- **`js/world-gen.js`**: Procedural generation logic for the terrain, house, and trees. Uses InstancedMesh extensively for optimal performance.
  - **Conditional Generation**: Supports toggles for trees, lights, house, and hills
  - **Container-Based Generation**: All functions accept container parameter (scene or THREE.Group) for flexible world placement
  - **World Clearing**: `clearWorld(container)` function properly disposes and removes all generated objects, preventing memory leaks
  - **Ground Height Calculation**: `getGroundHeight(x, z, SCENE_OPTS, useGameHeight)` calculates terrain height at position (supports both menu and game world heights)
  - **Dual World Support**: Functions support both menu world (PEAK_HEIGHT) and game world (GAME_PEAK_HEIGHT) height calculations
  - **Instanced Rendering**:
    - **Terrain**: Uses `InstancedMesh` for dirt and snow blocks (shared geometry, per-instance matrices)
    - **House**: Uses 5 `InstancedMesh` objects grouped by material (planks, wood, stone, snow, windows) - 90% draw call reduction
    - **Trees**: Uses 4 shared `InstancedMesh` objects for all tree trunks and leaves across entire world - 93% draw call reduction
    - All InstancedMesh objects compute bounding spheres after generation for accurate frustum culling
  - **Block Borders**: All blocks have visible edge lines using `THREE.EdgesGeometry` and instanced rendering
    - Instanced blocks use `InstancedMesh` for edge lines (same instance matrices as regular meshes)
    - Edge material uses `polygonOffset` to prevent z-fighting
    - Edge lines have `renderOrder = 1` to render after blocks
  - **Block Registration**: All blocks automatically registered in block registry when created (supports both instanced and individual meshes)
  - **Menu World Optimization**: Snow block edges disabled on menu world (`enableSnowEdges: false`) to prevent flickering
- **`js/block-registry.js`**: Block tracking system for future destructibility functionality.
  - **Block Data Structure**: Stores position (x, y, z), type (dirt, snow, wood, leaves, stone, plank, window), mesh reference, instanced flag, instance index, and container
  - **Fast Lookups**: Uses Map with string keys (`"x,y,z"`) for O(1) position-based lookups
  - **Functions**:
    - `registerBlock(x, y, z, type, mesh, isInstanced, instanceIndex, container)`: Register a block
    - `getBlock(x, y, z)`: Get block data at position (returns null if not found)
    - `removeBlock(x, y, z)`: Remove block from registry (returns true if found)
    - `clearRegistry()`: Clear all registered blocks
    - `getAllBlocks()`: Get array of all block data objects
    - `getBlockCount()`: Get total number of registered blocks
  - **Integration**: Automatically called by `createVoxel()` and `generateTerrainInstanced()` to track all blocks
  - **Cleanup**: Registry cleared when `clearWorld()` is called
- **`js/first-person-controls.js`**: First-person camera controller using PointerLockControls with WASD movement.
  - Wraps Three.js PointerLockControls for mouse look
  - Handles pointer lock/unlock events
  - Note: `lock()` method doesn't return a Promise - it's a synchronous method that requests pointer lock
  - Pointer lock requires user gesture context (click, keypress) to work
  - Manages camera rotation with pitch limits
  - **Movement System**: 
    - WASD movement controls with configurable keybinds
    - Movement respects camera rotation (forward = camera direction)
    - Ground collision detection using `getGroundHeight()` callback
    - Jump mechanics with gravity (20.0 units/s²) and jump speed (8.0 units/s)
    - Movement speed: 5.0 units/second
    - Player eye height: 1.6 units above ground
    - Frame-independent movement using deltaTime
    - Keyboard event listeners that dynamically reload keybinds on each key press
    - Movement state tracking (keys currently pressed)
    - `updateMovement(deltaTime)`: Updates camera position based on key states and ground collision
    - `reloadKeybinds()`: Reloads keybinds from localStorage (called when keybinds change)
- **`js/loading-screen.js`**: Loading screen module for world generation progress display.
  - `showLoadingScreen()`: Displays full-screen loading overlay with fade-in animation
    - Automatically hides ALL UI elements (title screen, menu, buttons, news reel, panels)
    - Full-screen overlay with fully opaque background (z-index: 9999)
    - Completely blocks view of menu and game world during generation
  - `hideLoadingScreen()`: Hides loading screen with fade-out animation
  - `updateProgress(percentage, statusText)`: Updates progress bar, percentage, and status text
    - Smooth animated progress bar with shimmer effect
    - Real-time percentage display (0-100%)
    - Dynamic status text updates
  - Animated spinner with multiple rotating rings
  - Real-time progress updates during world generation stages
- **`js/particles.js`**: Manages `SnowSystem` and `LeafSystem`.
- **`js/ambient-sound.js`**: Procedural ambient wind sound system using Tone.js.
  - **Wind Sound Generation**: Uses Tone.js to create realistic wind sounds
    - PinkNoise as base sound source (more natural than white noise)
    - Low-pass filter (200-800 Hz) to shape wind character
    - LFO (Low-Frequency Oscillator) at 0.2 Hz modulating filter frequency for natural wind gusts
    - Gain node for volume control (base volume 35% for subtle ambience)
  - **Audio Context Management**: Properly handles Web Audio API context initialization
    - Requires user interaction to start (handled when entering first-person mode)
    - Uses `Tone.start()` to resume audio context after user gesture
  - **Volume Control**: Integrates with master audio settings
    - Respects master audio toggle (stops when master audio disabled)
    - Volume controlled by master volume slider (0-1 range)
    - Smooth volume transitions using `rampTo()` for fade in/out
  - **Lifecycle Management**: 
    - `initAmbientSound()`: Initializes audio chain (noise → filter → gain → destination)
    - `startAmbientSound()`: Starts wind sound (async, handles Tone.start())
    - `stopAmbientSound()`: Stops wind sound and cleans up
    - `setAmbientVolume(volume)`: Controls volume (0-1)
    - `isAmbientPlaying()`: Checks if sound is active
    - `disposeAmbientSound()`: Cleanup function for resource disposal
  - **Integration**: 
    - Starts automatically when entering first-person mode (after world generation)
    - Stops automatically when exiting first-person mode
    - Volume updates in real-time when master audio settings change
- **`js/ui.js`**: Handles DOM event listeners and UI controls.
  - **Gallery Panel System** (`setupGalleryPanel()`): Manages gallery panel visibility and tab navigation
    - Opens gallery panel when Gallery button is clicked
    - Pauses countdown timer when panel is open
    - Tab navigation system for switching between categories
    - Gallery panel styled to match Settings panel design pattern
  - **News Reel Snowflakes**: Dynamic JavaScript system that spawns snowflakes at random positions with falling animations.
  - **UI State Management**: Shared module-level state (`uiVisible`) and functions (`hideUI()`, `showUI()`) for unified UI visibility control.
  - **Countdown Timer**: 5-second countdown after splash dismissal that auto-hides UI, removing all buttons from layout and disabling interactions.
  - **UI Toggle Observer**: Listens to `#ui-toggle` button clicks to show/hide title screen manually.
  - **Double-Click Wake**: Document-level double-click listener that restores UI when hidden (works after both manual hide and auto-hide).
  - **Interaction Disabling**: When UI is hidden, applies `ui-hidden` class and `pointer-events: none` to all menu buttons, preventing hover effects and clicks.
  - **Fullscreen Observer**: Listens to `#fullscreen-btn` clicks to toggle fullscreen mode.
  - **Quit Button Observer**: Listens to `#quit-btn` clicks and sends "quit" message to C# wrapper via `window.chrome.webview.postMessage()` to close the application.
  - **Tech Panel Observer**: Listens to `#tech-toggle-btn` clicks to toggle tech info panel visibility.
  - **World Gen Panel Observer**: Listens to `#play-btn` clicks to show world generation panel.
  - **Close Panel Observer**: Listens to `#close-world-gen` clicks to hide world generation panel.
  - **Generate World Button**: Listens to `#generate-world-btn` clicks to:
    - Read toggle states (trees, lights, house, hills)
    - Hide world generation panel immediately
    - Show full-screen loading screen (blocks all UI elements)
    - Regenerate world with progress callback for real-time updates
      - Progress updates: 0-30% terrain, 30-60% structures, 60-90% trees, 90-100% finalizing
    - Display "Entering World..." message at 100% completion
    - Hide loading screen after brief delay
    - Enter first-person mode
    - Hide all UI elements including game buttons
    - Error handling with loading screen cleanup and UI restoration
  - **Settings Panel Observer**: Listens to `#settings-btn` clicks to show settings panel.
  - **Close Settings Observer**: Listens to `#close-settings` clicks to hide settings panel.
  - **Gallery Panel Observer** (`setupGalleryPanel()`): Listens to `#gallery-btn` clicks to show gallery panel.
    - Disables countdown timer when opened
    - Shows gallery panel with tabbed interface
  - **Close Gallery Observer**: Listens to `#close-gallery` clicks to hide gallery panel.
  - **Gallery Tab Navigation** (`setupGalleryTabs()`): Handles tab switching in gallery panel
    - Switches between Entities, Blocks, Structures, and Plants tabs
    - Updates active tab and corresponding content with fade animations
  - **Controls Panel Setup** (`setupControlsPanel()`): Interactive keybind configuration system
    - Loads keybinds from localStorage on initialization
    - Makes each `.keybind-key` element clickable
    - When clicked, enters "listening" state (visual feedback with pulsing orange glow)
    - Listens for next keydown event to set new keybind
    - Prevents duplicate keybinds (shows "Already bound!" message)
    - Updates keybind in localStorage and UI display
    - Keybinds automatically reload on next key press (no restart needed)
    - Supports Escape key to cancel keybind change
  - **Video Panel Setup** (`setupVideoPanel()`): Comprehensive graphics settings configuration system
    - **Performance Presets**: Dropdown selector with Low, Mid, High, and Custom presets
      - Low: All effects disabled for maximum performance
      - Mid: Balanced settings with moderate bloom intensity (0.5)
      - High: All effects enabled with high bloom intensity (0.7)
      - Custom: Automatically selected when individual settings are modified
    - **Render Scale**: Slider (0.1-2.0) for resolution scaling (multiplies devicePixelRatio)
    - **Antialiasing**: Toggle for smoothing jagged edges (requires renderer recreation when changed)
    - **Post Processing**: Master toggle that enables/disables all post-processing effects
    - **Bloom Effect**: Toggle with three independent sliders:
      - Intensity: 0-3.0 (controls bloom strength)
      - Radius: 0-1.0 (controls bloom spread)
      - Threshold: 0-1.0 (controls brightness threshold for bloom)
      - Bloom sliders automatically disabled when bloom toggle is off
    - **Fog**: Toggle with density slider (0-0.2, displayed x1000 for readability)
      - Defaults to off for menu visibility
    - **Particle Systems**: Toggles for snow and leaves particles
    - **localStorage Persistence**: All settings saved with keys:
      - `antialiasingEnabled`, `postProcessingEnabled`, `bloomEnabled`, `bloomIntensity`, `bloomRadius`, `bloomThreshold`
      - `fogEnabled`, `fogDensity`, `snowEnabled`, `leavesEnabled`, `renderScale`, `performancePreset`
    - **Real-time Application**: Settings applied immediately via `applyVideoSettings()` → `updateVideoSettings()` in main.js
    - **Preset Auto-switch**: When individual settings change, preset automatically switches to "Custom"
    - Settings applied to renderer (antialiasing, pixel ratio), composer (bloom), scene (fog), and particle manager (snow/leaves)
  - **Game UI Button Hiding**: `hideGameUIButtons()` function hides tech, quit, fullscreen, and show UI buttons when entering first-person mode.
  - **Pause Menu Setup** (`setupPauseMenu()`): Pause system for first-person gameplay
    - Escape key handler toggles pause (only active in first-person mode)
    - Resume button calls `resumeGame()` to continue gameplay
    - Settings button opens settings panel (pause menu stays behind)
    - Quit to Menu button exits first-person mode and returns to title screen
    - Proper cleanup of event listeners and UI state restoration
    - UI sound effects for all pause menu buttons

## Event Observers & Connections

### Window-Level Observers
1. **Resize Observer** (`js/scene-setup.js:65-70`)
   - **Event**: `window.resize`
   - **Actions**:
     - Updates camera aspect ratio
     - Updates camera projection matrix
     - Resizes renderer to match window dimensions
     - Resizes EffectComposer to match window dimensions
   - **Connection**: Direct connection between window events and Three.js rendering pipeline

### UI Button Observers
1. **UI Toggle Button** (`js/ui.js:401-408`)
   - **Element**: `#ui-toggle`
   - **Event**: `click`
   - **Actions**:
     - Calls shared `hideUI()` or `showUI()` functions based on `uiVisible` state
     - Updates button text between "Hide UI" and "Show UI"
     - Updates `#title-screen` opacity, pointer-events, and `ui-hidden` class
     - Disables/enables menu buttons with proper interaction blocking
   - **Connection**: Uses shared UI state management for consistency

2. **Double-Click Wake** (`js/ui.js:410-416`)
   - **Element**: `document` (global listener)
   - **Event**: `dblclick`
   - **Actions**:
     - Checks if UI is hidden (`!uiVisible`)
     - Verifies click is not on UI elements (title-screen, buttons)
     - Calls `showUI()` to restore all UI elements
     - Works after both manual hide and auto-hide scenarios
   - **Connection**: Global event listener that restores UI state

3. **Countdown Timer Auto-Hide** (`js/ui.js:170-248`)
   - **Element**: `#countdown-timer`
   - **Event**: Interval timer (1 second intervals)
   - **Actions**:
     - Counts down from 5 to 0
     - Shows visual feedback (warning/critical states at 3 and 1)
     - When countdown reaches 0:
       - Removes timer from DOM
       - Calls shared `hideUI()` function to maintain state consistency
       - Hides all UI buttons (ui-toggle, fullscreen, tech, quit) with complete layout removal
       - Hides news reel with fade-out transition
   - **Connection**: Auto-hide triggers shared UI state management for unified behavior

4. **Fullscreen Button** (`js/ui.js:419-429`)
   - **Element**: `#fullscreen-btn`
   - **Event**: `click`
   - **Actions**:
     - Requests fullscreen mode if not active
     - Exits fullscreen if active
     - Handles errors gracefully
   - **Connection**: Browser Fullscreen API integration

5. **Quit Button** (`js/ui.js:431-443`)
   - **Element**: `#quit-btn`
   - **Event**: `click`
   - **Actions**:
     - Sends "quit" message to C# wrapper via `window.chrome.webview.postMessage('quit')`
     - Falls back to `window.close()` if WebView2 API not available
   - **Connection**: WebView2 message communication to C# (`Program.cs:68-79`), which closes the application form

6. **Tech Panel Toggle** (`js/ui.js:1-27`)
   - **Element**: `#tech-toggle-btn`
   - **Event**: `click`
   - **Actions**:
     - Toggles `panelVisible` state
     - Adds/removes `tech-panel-visible` and `tech-panel-hidden` classes
   - **Connection**: CSS class-based visibility control

7. **Play Button** (`js/ui.js:58-62`)
   - **Element**: `#play-btn`
   - **Event**: `click`
   - **Actions**:
     - Shows world generation panel
     - Removes `world-gen-panel-hidden` class
     - Adds `world-gen-panel-visible` class
   - **Connection**: Triggers world generation UI flow

8. **Close World Gen Panel** (`js/ui.js:66-71`)
   - **Element**: `#close-world-gen`
   - **Event**: `click`
   - **Actions**:
     - Hides world generation panel
     - Removes `world-gen-panel-visible` class
     - Adds `world-gen-panel-hidden` class
   - **Connection**: Closes world generation UI flow

9. **Generate World Button** (`js/ui.js:474-547`)
   - **Element**: `#generate-world-btn`
   - **Event**: `click`
   - **Actions**:
     - Disables button and shows "Generating..." feedback
     - Reads toggle states (trees, lights, house, hills)
     - Hides world generation panel immediately
     - Shows full-screen loading screen (hides ALL UI elements)
     - Calls `regenerateWorld(options, progressCallback)` (async) with progress callback
     - Updates loading screen with real-time progress (0-100%)
     - Displays status messages: "Generating terrain...", "Building structures...", "Placing trees...", "Entering world..."
     - Hides loading screen after completion
     - Calls `enterFirstPersonMode(groundHeight)` to switch camera mode (stops main menu music)
     - Hides all UI elements including game buttons
     - Error handling restores UI if generation fails
   - **Connection**: Triggers separate game world generation (does not affect menu world) with full-screen loading screen. Main menu music stops automatically when entering game mode.

10. **Settings Button** (`js/ui.js:43-70`)
    - **Element**: `#settings-btn`
    - **Event**: `click`
    - **Actions**:
      - Disables countdown timer
      - Shows settings panel
      - Removes `settings-panel-hidden` class
      - Adds `settings-panel-visible` class
    - **Connection**: Opens settings panel for future configuration options

11. **Close Settings Button** (`js/ui.js:67-70`)
    - **Element**: `#close-settings`
    - **Event**: `click`
    - **Actions**:
      - Hides settings panel
      - Removes `settings-panel-visible` class
      - Adds `settings-panel-hidden` class
    - **Connection**: Closes settings panel

### Data Flow Connections

1. **Config → World Generation** (`js/world-gen.js`)
   - Uses `SCENE_OPTS` from `config.js` for world generation parameters
   - World size, tree count, and terrain features based on config
   - **Connection**: Configuration drives procedural generation

2. **UI Toggles → Loading Screen → Game World Generation** (`js/ui.js:474-547`)
   - Toggle states (trees, lights, house, hills) read from panel
   - World generation panel hidden immediately
   - Loading screen shown (full-screen overlay, hides ALL UI)
   - Toggle states passed to `regenerateWorld(options, progressCallback)`
   - Progress callback updates loading screen in real-time (percentage, status text)
   - Separate game world generated in dedicated container (does not affect menu world)
   - Loading screen displays progress: 0-30% terrain, 30-60% structures, 60-90% trees, 90-100% finalizing
   - Loading screen hidden after completion, first-person mode entered
   - Larger world (2x size) generated for gameplay
   - **Connection**: User preferences → Loading screen → World generation → Game mode

2. **Main Loop → Particle Manager** (`js/main.js:45-47`)
   - Animation loop calls `particleManager.update()` every frame
   - **Connection**: Continuous update cycle for particle systems

3. **Main Loop → Controls** (`js/main.js:86-103`)
   - Animation loop calls `orbitControls.update()` in menu mode
   - First-person mode: Calls `firstPersonControls.updateMovement(deltaTime)` for WASD movement
   - DeltaTime calculation for frame-independent movement (capped at 100ms to prevent large jumps)
   - **Connection**: Continuous camera control updates based on active mode, movement updates in first-person mode

4. **Main Loop → Composer** (`js/main.js:50`)
   - Animation loop calls `composer.render()` every frame
   - **Connection**: Post-processing pipeline rendering

## UI State Management

The UI system uses a unified state management approach for consistent behavior across different hide/show scenarios.

### Shared State (`js/ui.js:324-395`)
- **Module-level `uiVisible` variable**: Boolean flag tracking UI visibility state
- **Global `hideUI()` function**: Centralized function to hide UI that:
  - Sets `uiVisible = false`
  - Applies `ui-hidden` class to title screen and menu elements
  - Disables pointer events on all interactive elements
  - Updates UI toggle button text to "Show UI"
- **Global `showUI()` function**: Centralized function to show UI that:
  - Sets `uiVisible = true`
  - Removes `ui-hidden` class from all elements
  - Restores pointer events on interactive elements
  - Restores display, opacity, and positioning of hidden elements
  - Restores news reel, audio warning, and all UI buttons
  - Updates UI toggle button text to "Hide UI"

### CSS Interaction Blocking (`css/style.css:236-263`)
- **`.ui-hidden` class**: Applied to elements when UI is hidden
  - `pointer-events: none !important` - Prevents all mouse interactions
  - `cursor: default !important` - Removes pointer cursor
  - `opacity: 0 !important` - Hides visual elements
- **Hover effect disabling**: CSS rules prevent hover states on hidden elements
- **Nested element blocking**: `ui-hidden *` selector ensures all child elements are also blocked

### Hide/Show Scenarios

1. **Manual Hide** (via UI Toggle Button):
   - User clicks "Hide UI" button
   - Calls `hideUI()` function
   - UI fades out, buttons remain in DOM but disabled

2. **Auto-Hide** (via Countdown Timer):
   - After 5-second countdown completes
   - Calls `hideUI()` function to maintain state consistency
   - Additionally removes UI buttons from layout completely (display: none, positioned off-screen)
   - Hides news reel with fade transition

3. **Wake** (via Double-Click):
   - User double-clicks anywhere on canvas
   - Global double-click listener checks `uiVisible` state
   - If hidden, calls `showUI()` function
   - Restores all UI elements including news reel, audio warning, and button positions
   - Works identically for both manual hide and auto-hide scenarios

4. **First-Person Game Mode** (via Generate World):
   - User clicks "Generate World" button
   - World generation panel hides immediately
   - **Full-screen loading screen appears** (z-index: 9999, fully opaque)
   - Loading screen automatically hides ALL UI elements using `!important` styles:
     - Title screen and menu (display: none !important)
     - World generation panel
     - All UI buttons (Hide UI, Fullscreen, Tech, Quit)
     - News reel and audio warning
     - Countdown timer
   - World regenerated with real-time progress updates on loading screen
   - Loading screen shows progress bar (0-100%) and status messages
   - After completion, loading screen shows "Entering world..." message (800ms display)
   - **Switches to first-person camera mode** (while loading screen still visible)
   - Main menu background music stops and resets
   - Ambient wind sound starts automatically (if master audio enabled)
   - Pointer lock activated for mouse look
   - Loading screen fades out smoothly (0.5s transition) revealing the game world
   - Immersive game experience with ambient wind sounds, no UI distractions, and no menu music
   - **Key Fix**: First-person mode is activated *before* hiding the loading screen to prevent the menu world from briefly appearing during transition

### Element Restoration
When `showUI()` is called, it ensures complete restoration:
- Title screen opacity and pointer events
- Menu container and all menu buttons
- News reel display, opacity, and pointer events
- Audio warning positioning and visibility
- All UI control buttons (Hide UI, Fullscreen, Tech, Quit)
- Removes all `ui-hidden` classes
- Resets inline styles to CSS defaults where needed
