import * as THREE from 'three';
import { PEAK_HEIGHT, GAME_PEAK_HEIGHT } from './config.js';
import { registerBlock, clearRegistry } from './block-registry.js';
import { random, setSeed } from './rng.js';
import {
    geometryBox,
    edgeGeometry,
    edgeMaterial,
    mats,
    isSharedGeometry,
    isSharedMaterial
} from './voxels.js';
import { generateTrees } from './tree-gen.js';
import {
    setHeightmap,
    clearHeightmap,
    sampleGameHeight,
    getWorldMeta,
    getPlayableBounds
} from './heightmap.js';

export { setSeed, generateTrees, sampleGameHeight, getWorldMeta, getPlayableBounds };

function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
}

export function generateTerrainInstanced(container, SCENE_OPTS, options = {}, outputArray = null) {
    const hills = options.hills !== false;
    const useGameHeight = options.useGameHeight || false;
    const peakHeight = useGameHeight ? GAME_PEAK_HEIGHT : PEAK_HEIGHT;
    const enableSnowEdges = options.enableSnowEdges !== false;

    const r = SCENE_OPTS.worldRadius;
    const hillR = SCENE_OPTS.hillRadius;
    const platR = SCENE_OPTS.plateauRadius;
    const dim = r * 2 + 1;
    const maxCount = dim * dim * 5;

    const dirtMesh = new THREE.InstancedMesh(geometryBox, mats.dirt, maxCount);
    const snowMesh = new THREE.InstancedMesh(geometryBox, mats.snowBlock, maxCount);
    dirtMesh.renderOrder = 0;
    snowMesh.renderOrder = 0;

    const dirtEdgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, maxCount);
    dirtEdgeMesh.renderOrder = 1;
    const snowEdgeMesh = enableSnowEdges
        ? new THREE.InstancedMesh(edgeGeometry, edgeMaterial, maxCount)
        : null;
    if (snowEdgeMesh) snowEdgeMesh.renderOrder = 1;

    const dummy = new THREE.Object3D();
    let dirtIdx = 0;
    let snowIdx = 0;

    for (let x = -r; x <= r; x++) {
        for (let z = -r; z <= r; z++) {
            const dist = Math.sqrt(x * x + z * z);
            if (dist > r) continue;

            let h = 0;
            if (hills) {
                if (dist < platR) {
                    h = peakHeight;
                } else if (dist < hillR) {
                    const slopeFactor = (dist - platR) / (hillR - platR);
                    const eased = (Math.cos(slopeFactor * Math.PI) + 1) / 2;
                    h = Math.round(peakHeight * eased);
                    if (dist > platR + 2 && h > 0 && random() > 0.7) h -= 1;
                } else {
                    const wave1 = Math.sin(x * 0.15);
                    const wave2 = Math.cos(z * 0.15);
                    const wave3 = Math.sin((x + z) * 0.1);
                    const noise = wave1 * wave2 + wave3 * 0.5;
                    if (noise > 0.6) h = 1;
                    if (noise > 1.2) h = 2;
                }
            }

            for (let y = -1; y <= h; y++) {
                dummy.position.set(x, y, z);
                dummy.updateMatrix();
                if (y === h) {
                    snowMesh.setMatrixAt(snowIdx, dummy.matrix);
                    if (snowEdgeMesh) snowEdgeMesh.setMatrixAt(snowIdx, dummy.matrix);
                    registerBlock(x, y, z, 'snow', snowMesh, true, snowIdx, container);
                    snowIdx++;
                } else {
                    dirtMesh.setMatrixAt(dirtIdx, dummy.matrix);
                    dirtEdgeMesh.setMatrixAt(dirtIdx, dummy.matrix);
                    registerBlock(x, y, z, 'dirt', dirtMesh, true, dirtIdx, container);
                    dirtIdx++;
                }
            }
        }
    }

    dirtMesh.count = dirtIdx;
    snowMesh.count = snowIdx;
    dirtEdgeMesh.count = dirtIdx;
    if (snowEdgeMesh) snowEdgeMesh.count = snowIdx;

    dirtMesh.computeBoundingSphere();
    snowMesh.computeBoundingSphere();
    dirtEdgeMesh.computeBoundingSphere();
    if (snowEdgeMesh) snowEdgeMesh.computeBoundingSphere();

    container.add(dirtMesh);
    container.add(snowMesh);
    container.add(dirtEdgeMesh);
    if (snowEdgeMesh) container.add(snowEdgeMesh);

    if (outputArray) {
        outputArray.push(dirtMesh, snowMesh, dirtEdgeMesh);
        if (snowEdgeMesh) outputArray.push(snowEdgeMesh);
    }
}

function buildGameHeightmap(opts, hillsEnabled) {
    const size = opts.worldSize;
    const min = opts.worldMin;
    const max = opts.worldMax;
    const hm = new Int8Array(size * size);
    const peak = opts.peakHeight;
    const platR = opts.plateauRadius;
    const hillR = opts.hillRadius;
    const p1 = random() * Math.PI * 2;
    const p2 = random() * Math.PI * 2;
    const p3 = random() * Math.PI * 2;

    const extraHills = [];
    const extraCount = 6 + Math.floor(random() * 4);
    for (let i = 0; i < extraCount; i++) {
        for (let attempt = 0; attempt < 16; attempt++) {
            const hx = min + 40 + Math.floor(random() * (size - 80));
            const hz = min + 40 + Math.floor(random() * (size - 80));
            if (Math.hypot(hx, hz) < hillR + 28) continue;
            extraHills.push({
                x: hx,
                z: hz,
                r: 18 + random() * 36,
                h: 5 + random() * 8
            });
            break;
        }
    }

    for (let z = min; z <= max; z++) {
        for (let x = min; x <= max; x++) {
            let h = 0;
            if (hillsEnabled) {
                const dist = Math.hypot(x, z);
                if (dist < platR) {
                    h = peak;
                } else if (dist < hillR) {
                    const slopeFactor = (dist - platR) / (hillR - platR);
                    const eased = (Math.cos(slopeFactor * Math.PI) + 1) / 2;
                    h = peak * eased;
                }

                const wave1 = Math.sin(x * 0.045 + p1);
                const wave2 = Math.cos(z * 0.045 + p2);
                const wave3 = Math.sin((x + z) * 0.032 + p3);
                const rolling = wave1 * wave2 + wave3 * 0.5;
                const ridge = Math.sin(x * 0.018 + p2) * Math.cos(z * 0.022 + p1);
                const mound = Math.sin(x * 0.011 + p3) * Math.sin(z * 0.013 + p1);
                let outer = Math.max(0, rolling * 1.6 + ridge * 3.0 + mound * 3.6);
                if (rolling > 0.55) outer += 1;

                for (const hill of extraHills) {
                    const d = Math.hypot(x - hill.x, z - hill.z);
                    if (d < hill.r) {
                        const t = d / hill.r;
                        outer = Math.max(outer, hill.h * (1 - t * t));
                    }
                }

                if (dist < hillR) {
                    h += Math.max(0, rolling * 0.35);
                } else {
                    h = outer;
                }

                if (h > 0 && random() > 0.82) h -= 0.4;
            }
            hm[(z - min) * size + (x - min)] = Math.max(0, Math.round(h));
        }
    }

    setHeightmap(hm, {
        size,
        min,
        max,
        borderWidth: opts.borderWidth
    });
}

async function addInstancedPacked(container, material, packed, count, dummy, blockType, register = false, enableEdges = true) {
    if (count <= 0) return [];
    const mesh = new THREE.InstancedMesh(geometryBox, material, count);
    const edgeMesh = enableEdges
        ? new THREE.InstancedMesh(edgeGeometry, edgeMaterial, count)
        : null;
    if (edgeMesh) edgeMesh.renderOrder = 1;
    for (let idx = 0; idx < count; idx++) {
        const o = idx * 3;
        dummy.position.set(packed[o], packed[o + 1], packed[o + 2]);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        if (edgeMesh) edgeMesh.setMatrixAt(idx, dummy.matrix);
        if (register) {
            registerBlock(packed[o], packed[o + 1], packed[o + 2], blockType, mesh, true, idx, container);
        }
        if (idx > 0 && idx % 40000 === 0) {
            await nextFrame();
        }
    }
    mesh.computeBoundingSphere();
    container.add(mesh);
    if (edgeMesh) {
        edgeMesh.computeBoundingSphere();
        container.add(edgeMesh);
        return [mesh, edgeMesh];
    }
    return [mesh];
}

function addInstancedLayer(container, material, positions, blockType, dummy, register = false, enableEdges = true) {
    if (positions.length === 0) return [];
    const packed = new Int16Array(positions.length * 3);
    positions.forEach(([x, y, z], idx) => {
        packed[idx * 3] = x;
        packed[idx * 3 + 1] = y;
        packed[idx * 3 + 2] = z;
    });
    return addInstancedPacked(container, material, packed, positions.length, dummy, blockType, register, enableEdges);
}

async function generateGameTerrain(container, opts, options = {}, onProgress = null) {
    const min = opts.worldMin;
    const max = opts.worldMax;
    const size = opts.worldSize;
    const dummy = new THREE.Object3D();
    const count = size * size;
    const snow = new Int16Array(count * 3);
    const dirt = new Int16Array(count * 3);
    let i = 0;

    for (let z = min; z <= max; z++) {
        for (let x = min; x <= max; x++) {
            const h = sampleGameHeight(x, z);
            const o = i * 3;
            snow[o] = x;
            snow[o + 1] = h;
            snow[o + 2] = z;
            dirt[o] = x;
            dirt[o + 1] = h - 1;
            dirt[o + 2] = z;
            i++;
        }
        if (onProgress && ((z - min) % 50 === 0)) {
            onProgress((z - min) / size * 0.45);
            await nextFrame();
        }
    }

    await addInstancedPacked(container, mats.snowBlock, snow, count, dummy, 'snow', false, true);
    if (onProgress) {
        onProgress(0.7);
        await nextFrame();
    }
    await addInstancedPacked(container, mats.dirt, dirt, count, dummy, 'dirt', false, false);
    if (onProgress) onProgress(1);
}

async function generateWorldBorder(container, opts) {
    const min = opts.worldMin;
    const max = opts.worldMax;
    const borderWidth = opts.borderWidth;
    const borderHeight = opts.borderHeight;
    const dummy = new THREE.Object3D();
    const stone = [];
    const ice = [];
    const snow = [];

    for (let x = min; x <= max; x++) {
        for (let z = min; z <= max; z++) {
            const onEdge = x < min + borderWidth || x > max - borderWidth
                || z < min + borderWidth || z > max - borderWidth;
            if (!onEdge) continue;

            const ground = sampleGameHeight(x, z);
            const isCorner = (x < min + borderWidth || x > max - borderWidth)
                && (z < min + borderWidth || z > max - borderWidth);
            const wallH = borderHeight + (isCorner ? 4 : Math.floor(random() * 3));

            for (let y = 1; y <= wallH; y++) {
                const wy = ground + y;
                if (y === wallH) snow.push([x, wy, z]);
                else if (y >= wallH - 2) ice.push([x, wy, z]);
                else stone.push([x, wy, z]);
            }
        }
    }

    await addInstancedLayer(container, mats.stone, stone, 'stone', dummy, true);
    await addInstancedLayer(container, mats.ice, ice, 'ice', dummy, true);
    await addInstancedLayer(container, mats.snowBlock, snow, 'snow', dummy, true);
    console.log(`[BORDER] stone ${stone.length}, ice ${ice.length}, snow ${snow.length}`);
}

export function generateHouse(container, options = {}, outputArray = null) {
    const house = options.house !== false;
    if (!house) return;

    const useGameHeight = options.useGameHeight || false;
    const peakHeight = useGameHeight ? GAME_PEAK_HEIGHT : PEAK_HEIGHT;
    const floorY = options.floorY !== undefined ? options.floorY : peakHeight;
    const hw = 2;

    const blockPositions = { plank: [], wood: [], stone: [], snow: [], window: [] };
    const blockScales = { snow: [] };
    const lightsArray = [];

    for (let y = 0; y < 4; y++) {
        for (let x = -hw; x <= hw; x++) {
            for (let z = -hw; z <= hw; z++) {
                const vy = floorY + y;
                if (y === 0) {
                    blockPositions.plank.push([x, vy, z]);
                } else if (Math.abs(x) === hw || Math.abs(z) === hw) {
                    if (z === hw && x === 0 && y < 3) continue;
                    if (y === 2 && ((Math.abs(x) === hw && z === 0) || (z === -hw && x === 0))) {
                        blockPositions.window.push([x, vy, z]);
                        if (x === -hw && z === 0) {
                            const light = new THREE.PointLight(0xffaa00, 1, 8);
                            light.position.set(x, vy, z);
                            lightsArray.push(light);
                        }
                    } else {
                        blockPositions.wood.push([x, vy, z]);
                    }
                }
            }
        }
    }

    const roofStart = floorY + 4;
    for (let i = 0; i <= hw + 1; i++) {
        const range = hw + 1 - i;
        for (let x = -range; x <= range; x++) {
            for (let z = -range; z <= range; z++) {
                blockPositions.stone.push([x, roofStart + i, z]);
                blockPositions.snow.push([x, roofStart + i + 0.6, z]);
                blockScales.snow.push([x, roofStart + i + 0.6, z, 1, 0.2, 1]);
            }
        }
    }
    blockPositions.stone.push([1, roofStart + 2, 1]);
    blockPositions.stone.push([1, roofStart + 3, 1]);

    const plankMesh = new THREE.InstancedMesh(geometryBox, mats.plank, blockPositions.plank.length);
    const woodMesh = new THREE.InstancedMesh(geometryBox, mats.wood, blockPositions.wood.length);
    const stoneMesh = new THREE.InstancedMesh(geometryBox, mats.stone, blockPositions.stone.length);
    const snowRoofMesh = new THREE.InstancedMesh(geometryBox, mats.snowBlock, blockPositions.snow.length);
    const windowMesh = new THREE.InstancedMesh(geometryBox, mats.window, blockPositions.window.length);

    const plankEdgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, blockPositions.plank.length);
    const woodEdgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, blockPositions.wood.length);
    const stoneEdgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, blockPositions.stone.length);
    const snowRoofEdgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, blockPositions.snow.length);
    const windowEdgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, blockPositions.window.length);

    const dummy = new THREE.Object3D();
    let plankIdx = 0;
    let woodIdx = 0;
    let stoneIdx = 0;
    let snowIdx = 0;
    let windowIdx = 0;

    blockPositions.plank.forEach(([x, y, z]) => {
        dummy.position.set(x, y, z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        plankMesh.setMatrixAt(plankIdx, dummy.matrix);
        plankEdgeMesh.setMatrixAt(plankIdx, dummy.matrix);
        registerBlock(x, y, z, 'plank', plankMesh, true, plankIdx, container);
        plankIdx++;
    });

    blockPositions.wood.forEach(([x, y, z]) => {
        dummy.position.set(x, y, z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        woodMesh.setMatrixAt(woodIdx, dummy.matrix);
        woodEdgeMesh.setMatrixAt(woodIdx, dummy.matrix);
        registerBlock(x, y, z, 'wood', woodMesh, true, woodIdx, container);
        woodIdx++;
    });

    blockPositions.stone.forEach(([x, y, z]) => {
        dummy.position.set(x, y, z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        stoneMesh.setMatrixAt(stoneIdx, dummy.matrix);
        stoneEdgeMesh.setMatrixAt(stoneIdx, dummy.matrix);
        registerBlock(x, y, z, 'stone', stoneMesh, true, stoneIdx, container);
        stoneIdx++;
    });

    blockScales.snow.forEach(([x, y, z, sx, sy, sz]) => {
        dummy.position.set(x, y, z);
        dummy.scale.set(sx, sy, sz);
        dummy.updateMatrix();
        snowRoofMesh.setMatrixAt(snowIdx, dummy.matrix);
        snowRoofEdgeMesh.setMatrixAt(snowIdx, dummy.matrix);
        registerBlock(x, y, z, 'snow', snowRoofMesh, true, snowIdx, container);
        snowIdx++;
    });

    blockPositions.window.forEach(([x, y, z]) => {
        dummy.position.set(x, y, z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        windowMesh.setMatrixAt(windowIdx, dummy.matrix);
        windowEdgeMesh.setMatrixAt(windowIdx, dummy.matrix);
        registerBlock(x, y, z, 'window', windowMesh, true, windowIdx, container);
        windowIdx++;
    });

    [
        plankEdgeMesh, woodEdgeMesh, stoneEdgeMesh, snowRoofEdgeMesh, windowEdgeMesh
    ].forEach((mesh) => { mesh.renderOrder = 1; });

    [
        plankMesh, woodMesh, stoneMesh, snowRoofMesh, windowMesh,
        plankEdgeMesh, woodEdgeMesh, stoneEdgeMesh, snowRoofEdgeMesh, windowEdgeMesh
    ].forEach((mesh) => mesh.computeBoundingSphere());

    container.add(plankMesh, woodMesh, stoneMesh, snowRoofMesh, windowMesh);
    container.add(plankEdgeMesh, woodEdgeMesh, stoneEdgeMesh, snowRoofEdgeMesh, windowEdgeMesh);
    lightsArray.forEach((light) => container.add(light));

    const houseObjects = [
        plankMesh, woodMesh, stoneMesh, snowRoofMesh, windowMesh,
        plankEdgeMesh, woodEdgeMesh, stoneEdgeMesh, snowRoofEdgeMesh, windowEdgeMesh,
        ...lightsArray
    ];
    if (outputArray) outputArray.push(...houseObjects);
    console.log(`[HOUSE] Generated at y=${floorY}: ${plankIdx} planks, ${woodIdx} wood, ${stoneIdx} stone`);
}

export async function generateGameWorld(container, opts, options = {}, progressCallback = null) {
    const updateProgress = (percentage, statusText) => {
        if (progressCallback && typeof progressCallback === 'function') {
            progressCallback(percentage, statusText);
        }
    };

    if (options.seed !== undefined) {
        setSeed(options.seed);
    } else {
        setSeed('');
    }

    updateProgress(4, 'Shaping the land...');
    buildGameHeightmap(opts, options.hills !== false);
    await nextFrame();

    updateProgress(12, 'Generating terrain...');
    await generateGameTerrain(container, opts, options, (p) => {
        updateProgress(12 + p * 40, 'Generating terrain...');
    });
    await nextFrame();

    updateProgress(54, 'Raising the world border...');
    await generateWorldBorder(container, opts);
    await nextFrame();

    updateProgress(62, 'Building structures...');
    generateHouse(container, {
        house: options.house,
        useGameHeight: true,
        floorY: sampleGameHeight(0, 0)
    });
    await nextFrame();

    updateProgress(72, 'Planting Christmas trees...');
    generateTrees(container, opts, {
        trees: options.trees,
        lights: options.lights,
        useGameHeight: true
    });
    await nextFrame();

    updateProgress(96, 'Finalizing world...');
    return sampleGameHeight(0, 0);
}

export function clearWorld(container) {
    const objectsToRemove = [];
    container.traverse((obj) => {
        if (obj !== container) objectsToRemove.push(obj);
    });

    objectsToRemove.forEach((obj) => {
        if (obj.geometry && !isSharedGeometry(obj.geometry)) {
            obj.geometry.dispose();
        }

        const disposeMat = (mat) => {
            if (!mat || isSharedMaterial(mat)) return;
            if (mat.map) mat.map.dispose();
            mat.dispose();
        };

        if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(disposeMat);
            else disposeMat(obj.material);
        }

        if (obj.parent) obj.parent.remove(obj);
    });

    clearRegistry();
    clearHeightmap();
    console.log(`[CLEANUP] Cleared ${objectsToRemove.length} objects from scene`);
}

export function getGroundHeight(x, z, SCENE_OPTS, useGameHeight = false) {
    if (useGameHeight) {
        return sampleGameHeight(x, z);
    }

    const r = SCENE_OPTS.worldRadius;
    const hillR = SCENE_OPTS.hillRadius;
    const platR = SCENE_OPTS.plateauRadius;
    const dist = Math.sqrt(x * x + z * z);
    if (dist > r) return 0;

    let h = 0;
    if (dist < platR) {
        h = PEAK_HEIGHT;
    } else if (dist < hillR) {
        const slopeFactor = (dist - platR) / (hillR - platR);
        const eased = (Math.cos(slopeFactor * Math.PI) + 1) / 2;
        h = Math.round(PEAK_HEIGHT * eased);
    } else {
        const wave1 = Math.sin(x * 0.15);
        const wave2 = Math.cos(z * 0.15);
        const wave3 = Math.sin((x + z) * 0.1);
        const noise = wave1 * wave2 + wave3 * 0.5;
        if (noise > 0.6) h = 1;
        if (noise > 1.2) h = 2;
    }
    return h;
}
