import { GAME_WORLD_OPTS } from './config.js';

let heightmap = null;
let meta = {
    size: GAME_WORLD_OPTS.worldSize,
    min: GAME_WORLD_OPTS.worldMin,
    max: GAME_WORLD_OPTS.worldMax,
    borderWidth: GAME_WORLD_OPTS.borderWidth
};

export function setHeightmap(data, nextMeta) {
    heightmap = data;
    if (nextMeta) {
        meta = { ...meta, ...nextMeta };
    }
}

export function clearHeightmap() {
    heightmap = null;
}

export function getHeightmap() {
    return heightmap;
}

export function getWorldMeta() {
    return meta;
}

export function sampleGameHeight(x, z) {
    if (!heightmap) return 0;
    const ix = Math.round(x);
    const iz = Math.round(z);
    if (ix < meta.min || ix > meta.max || iz < meta.min || iz > meta.max) {
        return 0;
    }
    return heightmap[(iz - meta.min) * meta.size + (ix - meta.min)];
}

export function getPlayableBounds() {
    const pad = meta.borderWidth + 0.45;
    return {
        minX: meta.min + pad,
        maxX: meta.max - pad,
        minZ: meta.min + pad,
        maxZ: meta.max - pad
    };
}
