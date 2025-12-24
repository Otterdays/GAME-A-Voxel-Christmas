// Loading Screen Module for World Generation

let currentProgress = 0;
let targetProgress = 0;
let progressInterval = null;

/**
 * Show the loading screen with fade-in animation
 */
export function showLoadingScreen() {
    const loadingScreen = document.getElementById('world-loading-screen');
    if (!loadingScreen) {
        console.warn('Loading screen element not found');
        return;
    }
    
    // Hide ALL UI elements immediately with !important to override everything
    const titleScreen = document.getElementById('title-screen');
    const menuContainer = document.querySelector('.menu-container');
    const menuButtons = document.querySelectorAll('.menu-btn');
    const newsReel = document.getElementById('news-reel');
    const audioWarning = document.querySelector('.audio-warning');
    const uiButtons = document.querySelectorAll('.ui-btn, .tech-toggle-btn');
    const panels = document.querySelectorAll('#world-gen-panel, #settings-panel, #tech-info-panel, #pause-menu');
    const countdownTimer = document.getElementById('countdown-timer');
    const techPanel = document.getElementById('tech-info-panel');
    
    // Hide title screen COMPLETELY
    if (titleScreen) {
        titleScreen.style.setProperty('display', 'none', 'important');
        titleScreen.style.setProperty('opacity', '0', 'important');
        titleScreen.style.setProperty('visibility', 'hidden', 'important');
        titleScreen.style.setProperty('pointer-events', 'none', 'important');
    }
    
    // Hide menu container COMPLETELY
    if (menuContainer) {
        menuContainer.style.setProperty('display', 'none', 'important');
        menuContainer.style.setProperty('opacity', '0', 'important');
        menuContainer.style.setProperty('visibility', 'hidden', 'important');
        menuContainer.style.setProperty('pointer-events', 'none', 'important');
    }
    
    // Hide all menu buttons COMPLETELY
    menuButtons.forEach(btn => {
        if (btn) {
            btn.style.setProperty('display', 'none', 'important');
            btn.style.setProperty('opacity', '0', 'important');
            btn.style.setProperty('visibility', 'hidden', 'important');
            btn.style.setProperty('pointer-events', 'none', 'important');
        }
    });
    
    // Hide news reel COMPLETELY
    if (newsReel) {
        newsReel.style.setProperty('display', 'none', 'important');
        newsReel.style.setProperty('opacity', '0', 'important');
        newsReel.style.setProperty('visibility', 'hidden', 'important');
        newsReel.style.setProperty('pointer-events', 'none', 'important');
    }
    
    // Hide audio warning COMPLETELY
    if (audioWarning) {
        audioWarning.style.setProperty('display', 'none', 'important');
        audioWarning.style.setProperty('opacity', '0', 'important');
        audioWarning.style.setProperty('visibility', 'hidden', 'important');
        audioWarning.style.setProperty('pointer-events', 'none', 'important');
    }
    
    // Hide all UI buttons COMPLETELY
    uiButtons.forEach(btn => {
        if (btn) {
            btn.style.setProperty('display', 'none', 'important');
            btn.style.setProperty('opacity', '0', 'important');
            btn.style.setProperty('visibility', 'hidden', 'important');
            btn.style.setProperty('pointer-events', 'none', 'important');
        }
    });
    
    // Hide all panels COMPLETELY
    panels.forEach(panel => {
        if (panel) {
            panel.style.setProperty('display', 'none', 'important');
            panel.style.setProperty('opacity', '0', 'important');
            panel.style.setProperty('visibility', 'hidden', 'important');
            panel.style.setProperty('pointer-events', 'none', 'important');
        }
    });
    
    // Hide tech panel COMPLETELY
    if (techPanel) {
        techPanel.style.setProperty('display', 'none', 'important');
        techPanel.style.setProperty('opacity', '0', 'important');
        techPanel.style.setProperty('visibility', 'hidden', 'important');
        techPanel.style.setProperty('pointer-events', 'none', 'important');
    }
    
    // Hide countdown timer COMPLETELY
    if (countdownTimer) {
        countdownTimer.style.setProperty('display', 'none', 'important');
        countdownTimer.style.setProperty('visibility', 'hidden', 'important');
    }
    
    // Reset progress
    currentProgress = 0;
    targetProgress = 0;
    updateProgress(0, 'Initializing world generation...');
    
    // Show loading screen - set display first, then trigger transition
    // Base styles are now in #world-loading-screen, so we just toggle classes
    loadingScreen.classList.remove('world-loading-screen-hidden');
    loadingScreen.classList.add('world-loading-screen-visible');
}

/**
 * Hide the loading screen immediately and completely
 */
export function hideLoadingScreen() {
    const loadingScreen = document.getElementById('world-loading-screen');
    if (!loadingScreen) {
        return;
    }
    
    // Stop any running progress animation
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    
    // Start fade out transition
    // Ensure display stays flex so it doesn't pop off immediately
    // The class change triggers the opacity fade defined in CSS
    loadingScreen.style.display = 'flex';
    
    loadingScreen.classList.remove('world-loading-screen-visible');
    loadingScreen.classList.add('world-loading-screen-hidden');
    
    // After transition completes (0.5s), hide completely
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        
        // Clean up any other inline styles
        loadingScreen.style.removeProperty('visibility');
        loadingScreen.style.removeProperty('opacity');
        loadingScreen.style.removeProperty('pointer-events');
        loadingScreen.style.removeProperty('z-index');
        
        // Reset progress
        currentProgress = 0;
        targetProgress = 0;
    }, 500);
}

/**
 * Update progress bar and status text
 * @param {number} percentage - Progress percentage (0-100)
 * @param {string} statusText - Status message to display
 */
export function updateProgress(percentage, statusText) {
    const progressFill = document.getElementById('loading-progress-fill');
    const progressPercentage = document.getElementById('loading-percentage');
    const statusElement = document.getElementById('loading-status');
    
    if (!progressFill || !progressPercentage || !statusElement) {
        console.warn('Loading screen elements not found');
        return;
    }
    
    // Clamp percentage to 0-100
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    targetProgress = clampedPercentage;
    
    // Update status text
    if (statusText) {
        statusElement.textContent = statusText;
    }
    
    // Animate progress bar smoothly
    animateProgress();
}

/**
 * Animate progress bar incrementally
 */
function animateProgress() {
    // Clear any existing animation
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    
    // Animate progress smoothly
    progressInterval = setInterval(() => {
        const progressFill = document.getElementById('loading-progress-fill');
        const progressPercentage = document.getElementById('loading-percentage');
        
        if (!progressFill || !progressPercentage) {
            clearInterval(progressInterval);
            progressInterval = null;
            return;
        }
        
        // Smooth increment towards target
        const diff = targetProgress - currentProgress;
        if (Math.abs(diff) < 0.1) {
            currentProgress = targetProgress;
            clearInterval(progressInterval);
            progressInterval = null;
        } else {
            currentProgress += diff * 0.1; // Smooth interpolation
        }
        
        // Update UI
        progressFill.style.width = `${currentProgress}%`;
        progressPercentage.textContent = `${Math.round(currentProgress)}%`;
        
        // Stop animation if we've reached the target
        if (Math.abs(currentProgress - targetProgress) < 0.1) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
    }, 16); // ~60fps animation
}

