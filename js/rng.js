// Seeded RNG (Mulberry32) used by world generation
let _seedState = 12345;

export function setSeed(val) {
    if (val === undefined || val === null || val === '') {
        _seedState = Math.floor(Math.random() * 2147483647);
        return _seedState;
    }

    let str = val.toString();
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    _seedState = h >>> 0;
    return _seedState;
}

export function random() {
    _seedState += 0x6D2B79F5;
    let t = _seedState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randomInt(min, max) {
    return min + Math.floor(random() * (max - min + 1));
}

export function pick(list) {
    return list[Math.floor(random() * list.length)];
}
