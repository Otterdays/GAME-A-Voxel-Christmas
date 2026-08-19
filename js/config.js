export const SCENE_OPTS = {
    bgColor: 0x020205,
    snowCount: 3000,
    leafCount: 1200,
    worldRadius: 75,
    hillRadius: 14,
    plateauRadius: 5,
    treeCount: 140
};

export const GAME_WORLD_SIZE = 500;

export const GAME_WORLD_OPTS = {
    bgColor: 0x020205,
    snowCount: 5000,
    leafCount: 1800,
    worldSize: GAME_WORLD_SIZE,
    worldMin: -Math.floor(GAME_WORLD_SIZE / 2),
    worldMax: Math.floor(GAME_WORLD_SIZE / 2) - 1,
    worldRadius: GAME_WORLD_SIZE / 2,
    hillRadius: 18,
    plateauRadius: 6,
    treeCount: 750,
    borderWidth: 3,
    borderHeight: 10,
    peakHeight: 12
};

export const PEAK_HEIGHT = Math.round(SCENE_OPTS.hillRadius * 0.7);
export const GAME_PEAK_HEIGHT = GAME_WORLD_OPTS.peakHeight;

export const DEFAULT_KEYBINDS = {
    forward: 'KeyW',
    backward: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    jump: 'Space'
};

const KEY_DISPLAY_NAMES = {
    'KeyW': 'W',
    'KeyA': 'A',
    'KeyS': 'S',
    'KeyD': 'D',
    'KeyQ': 'Q',
    'KeyE': 'E',
    'KeyR': 'R',
    'KeyF': 'F',
    'KeyG': 'G',
    'KeyH': 'H',
    'KeyZ': 'Z',
    'KeyX': 'X',
    'KeyC': 'C',
    'KeyV': 'V',
    'KeyB': 'B',
    'KeyN': 'N',
    'KeyM': 'M',
    'Space': 'Space',
    'ShiftLeft': 'Shift',
    'ShiftRight': 'Shift',
    'ControlLeft': 'Ctrl',
    'ControlRight': 'Ctrl',
    'AltLeft': 'Alt',
    'AltRight': 'Alt',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→'
};

export function loadKeybinds() {
    try {
        const stored = localStorage.getItem('keybinds');
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...DEFAULT_KEYBINDS, ...parsed };
        }
    } catch (e) {
        console.warn('Failed to load keybinds from localStorage:', e);
    }
    return { ...DEFAULT_KEYBINDS };
}

export function saveKeybinds(keybinds) {
    try {
        localStorage.setItem('keybinds', JSON.stringify(keybinds));
    } catch (e) {
        console.warn('Failed to save keybinds to localStorage:', e);
    }
}

export function getKeyDisplayName(keyCode) {
    return KEY_DISPLAY_NAMES[keyCode] || keyCode.replace('Key', '').replace('Arrow', '');
}

export function getKeybind(action) {
    const keybinds = loadKeybinds();
    return keybinds[action] || DEFAULT_KEYBINDS[action];
}
