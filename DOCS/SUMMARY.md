# Project Summary

## Overview
A procedural Voxel Christmas scene rendered with Three.js (WebGL) featuring an interactive UI with world generation controls and technology information display.

[AMENDED 2026-08-19]: Play worlds are now generated as a separate 500×500 heightmap map with a world border and circular minimap. The main menu preview is an independent scene group and is hidden while playing.

## Key Features
- **Dual World System**: Separate menu world and game world that coexist independently
- **Procedural Terrain**: Instanced mesh rendering for performance
- **Block Borders**: All voxel blocks have visible edge lines (Minecraft-style borders) for authentic appearance
- **Block Registry**: Comprehensive block tracking system for future destructibility functionality
- **First-Person Mode**: Full first-person camera with mouse look controls and WASD movement
- **Crosshair**: Centered crosshair displayed in first-person mode for aiming reference
- **Block Highlighting**: Real-time block highlighting using raycasting - white wireframe outline shows which block you're aiming at
- **Pause Menu**: Full pause system with Escape key, featuring Resume, Settings, and Quit to Menu options
- **WASD Movement**: Smooth first-person movement with configurable keybinds, ground collision, and jump mechanics
- **Configurable Keybinds**: Fully customizable keybinds with interactive UI, localStorage persistence, and visual feedback
- **Performance Monitoring**: Real-time performance stats overlay (FPS, draw calls, triangles, memory) accessible via toggle button
- **Video Settings**: Comprehensive graphics configuration system with:
  - Performance presets (Low, Mid, High, Custom) for quick optimization
  - Render scale slider (0.1-2.0) for resolution scaling
  - Antialiasing toggle for smooth edges
  - Post-processing master toggle (enables/disables all post-processing effects)
  - Bloom effect toggle with three sliders: intensity (0-3.0), radius (0-1.0), threshold (0-1.0)
  - Fog toggle with density control (0-0.2, displayed x1000)
  - Snow and leaves particle system toggles
  - All settings persist to localStorage and apply in real-time
  - Preset system automatically switches to "Custom" when individual settings are modified
- **Ambient Sound**: Procedural wind ambient sound using Tone.js (starts automatically in first-person mode)
- **Particle Systems**: Snow and falling leaves
- **Post-Processing**: Bloom effect for a magical look
- **Modular Code**: Organized into ES modules for maintainability
- **Interactive UI**: 
  - Tech info panel displaying rendering technologies
  - World generation panel with progress tracking
  - Gallery panel with tabbed interface for Entities, Blocks, Structures, and Plants
  - Animated RGB LED news reel
  - Enhanced Play button with glowy snowy effects
  - Gallery button with Christmas artsy styling

## UI Components
- **Tech Info Panel**: Toggleable panel (⚙️ Tech button) showing WebGPU/WebGL status, Three.js version, Post-Processing, Instanced Rendering, Particle Systems, and OrbitControls.
- **Gallery Panel**: Accessible via Gallery button, displays organized view of all game assets:
  - **Entities Tab**: Christmas Light, Tree Light
  - **Blocks Tab**: Snow, Dirt, Wood, Leaves, Stone, Plank, Window blocks
  - **Structures Tab**: House structure
  - **Plants Tab**: Christmas Tree
  - Sleek card-based grid layout with hover animations
  - Tabbed interface matching Settings panel design
- **World Generation Panel**: Accessible via Play button, displays world size (500×500 blocks) and toggle switches for trees, lights, house, and hills.
- **World Loading Screen**: Full-screen loading overlay (z-index: 9999) with fully opaque background that completely blocks menu and game world view. Features:
  - Animated progress bar with shimmer effect and real-time percentage display (0-100%)
  - Dynamic status messages: "Generating terrain...", "Building structures...", "Placing trees...", "Entering world..."
  - Animated spinner with multiple rotating rings
  - Automatically hides ALL UI elements when shown (title, menu, buttons, news reel, panels)
  - Smooth fade-in/fade-out transitions
  - Progress tracking integrated with world generation callback system
- **Dual World System**: Separate menu world (75 block radius) and game world (500×500 blocks with border) that coexist independently.
- **News Reel**: Pill-shaped banner with multiple animated effects:
  - **Outer RGB Glow**: Flowing color spectrum border (6s animation cycle)
  - **Border Lights**: Animated Christmas light bars in black border area (20s cycle with twinkling)
  - **Inner Lights**: Radial gradient Christmas lights along content edge (16s cycle with twinkling)
  - **Dynamic Snowflakes**: JavaScript-generated snowflakes spawning at random positions, falling with rotation (6-8s duration, max 7 active)
  - **Scrolling Text**: Continuous horizontal scroll of latest updates
- **Play Button**: Glowy snowy appearance with animated snowflakes and pulsing glow.
- **Gallery Button**: Christmas artsy button with warm pink/red gradient, picture frame and sparkle decorations, and pulsing glow animation. Opens gallery panel.
- **Settings Button**: Glowy snowy appearance matching Play button style. Opens settings panel.
- **Quit Button**: Red-tinted quit button (✕ Quit) in bottom-right corner that closes the application. Uses WebView2 message communication between JavaScript and C# wrapper.
- **UI Auto-Hide System**:
  - **Countdown Timer**: 5-second countdown after splash screen automatically hides UI for immersive viewing
  - **Manual Toggle**: "Hide UI" / "Show UI" button for manual control
  - **Double-Click Wake**: Double-click anywhere on canvas to restore UI after auto-hide
  - **Interaction Blocking**: When hidden, all menu buttons are disabled with no hover effects or click interactions
  - **Complete Restoration**: UI wake properly restores all elements including news reel and audio warning positioning
- **Controls & Keybinds**:
  - **WASD Movement**: Smooth first-person movement (W/A/S/D for forward/left/backward/right)
  - **Jump**: Space bar for jumping with gravity physics
  - **Mouse Look**: Mouse movement for camera rotation (PointerLockControls)
  - **Pause**: Escape key to pause/unpause game (first-person mode only)
  - **Crosshair**: Centered crosshair for aiming reference
  - **Block Highlighting**: Real-time visual feedback showing which block you're aiming at
  - **Configurable Keybinds**: Settings → Controls tab with click-to-change keybind functionality
  - **Visual Feedback**: Pulsing orange glow effect when changing keybinds
  - **Keybind Persistence**: All keybinds saved to localStorage automatically
  - **No Restart Required**: Keybinds reload dynamically on next key press
  - **Conflict Prevention**: Prevents assigning the same key to multiple actions
- **Audio Management**:
  - Background music plays during main menu
  - Music automatically stops when entering first-person game mode
  - Music resets to beginning when stopped (ready for next menu session)
  - Ambient wind sound automatically starts when entering first-person mode
  - Ambient sound respects master audio toggle and volume settings
  - Smooth volume transitions and proper audio context handling
  - UI sound effects for button hover and click interactions
  - Hover sounds (900 Hz, 0.1s) and click sounds (500 Hz, 0.15s) using Tone.js
  - UI sounds respect master audio toggle and provide audio feedback for all interactions

## Distribution

### Windows Executable
The project can be packaged as a lightweight Windows executable using WebView2:
- **Build**: `dotnet build -c Release`
- **Package**: Run `portable\package-portable.bat` to create a distributable package
- **Output**: Creates `portable\` folder with all files ready for distribution
- **Size**: ~1-5MB (very lightweight!)
- **Requirements**: WebView2 Runtime (pre-installed on Windows 11)

See [PACKAGING.md](../PACKAGING.md) for detailed instructions.

## Documentation

- **[STYLE_GUIDE.md](STYLE_GUIDE.md)**: Comprehensive UI style guide for buttons, panels, and UI components
- **[ARCHITECTURE.md](ARCHITECTURE.md)**: Technical architecture and component structure
- **[CHANGELOG.md](CHANGELOG.md)**: Version history and feature updates
- **[PACKAGING.md](../PACKAGING.md)**: Distribution and packaging instructions

## Status
- **Current Version**: 0.0.1 ALPHA
- **Last Update**: Fixed escape key pause behavior - now pauses immediately on first press instead of requiring two presses. Fixed quit to menu button - properly cleans up game session, resets camera/controls, hides game world, closes panels, and restores UI correctly. Fixed UI restoration - properly clears loading screen styles, ensures canvas visibility, and uses centralized restoration function. Fixed countdown timer - automatically restarts when returning to main menu. Crosshair system for first-person aiming. Block highlighting system with real-time raycasting to show which block you're aiming at. Pause menu system with Escape key, featuring Resume, Settings, and Quit to Menu options. Improved pointer lock handling with proper user gesture context and error handling. Fixed audio volume NaN errors with proper validation. Block borders system with visible edge lines on all voxel blocks (Minecraft-style). Block registry system for tracking all blocks in the world (prepared for future destructibility). Video settings panel with antialiasing, bloom effect, and fog toggles plus bloom intensity slider. Edge line rendering optimized to prevent z-fighting and flickering. Menu world snow edges disabled to prevent visual artifacts. Gallery system added with tabbed interface for viewing Entities, Blocks, Structures, and Plants. WASD movement system with configurable keybinds, ground collision, and jump mechanics. Interactive keybind UI in Settings → Controls with click-to-change functionality. Full-screen world loading screen with animated progress bar and real-time status updates. Settings panel with tabbed interface (Audio, Controls, Video) featuring draggable sliders and real-time settings application. Dual world system with separate menu and game worlds. First-person camera mode with mouse look controls.
