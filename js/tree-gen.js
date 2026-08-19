import * as THREE from 'three';
import { random, pick } from './rng.js';
import { registerBlock } from './block-registry.js';
import {
    geometryBox,
    edgeGeometry,
    edgeMaterial,
    mats,
    registerSharedGeometry,
    registerSharedMaterial
} from './voxels.js';
import { sampleGameHeight } from './heightmap.js';

const TREE_PROFILES = [
    { id: 'classic', trunkMin: 4, trunkMax: 5, layers: [2, 2, 1, 0] },
    { id: 'slim', trunkMin: 5, trunkMax: 7, layers: [1, 1, 1, 0] },
    { id: 'grand', trunkMin: 6, trunkMax: 8, layers: [3, 2, 2, 1, 0] },
    { id: 'stout', trunkMin: 3, trunkMax: 4, layers: [2, 2, 1] },
    { id: 'layered', trunkMin: 5, trunkMax: 6, layers: [2, 1, 2, 1, 0] }
];

const DECOR_KITS = [
    { lights: true, bulbs: true, topper: true },
    { lights: true, bulbs: false, topper: true },
    { lights: false, bulbs: true, topper: true },
    { lights: true, bulbs: true, topper: false },
    { lights: true, bulbs: false, topper: false },
    { lights: false, bulbs: true, topper: false }
];

const LIGHT_COLORS = [0xff2a2a, 0x3cff3c, 0x3c7cff, 0xffd700, 0xff7ad9];
const BULB_PALETTES = [
    [0xff2020, 0x20cc40, 0x2266ff, 0xffd700],
    [0xff69b4, 0xffffff, 0x7ecbff],
    [0xffd700, 0xc0c0c0, 0xffffff],
    [0xff2020, 0xffd700]
];
const TOPPER_KINDS = ['star', 'snowflake', 'spire'];

const bulbGeo = new THREE.SphereGeometry(0.22, 6, 6);
const lightGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
const starGeo = new THREE.OctahedronGeometry(0.42);
const snowflakeGeo = new THREE.IcosahedronGeometry(0.34, 0);
const spireGeo = new THREE.ConeGeometry(0.18, 0.7, 5);

const bulbMat = new THREE.MeshStandardMaterial({
    roughness: 0.25,
    metalness: 0.55
});
const lightMat = new THREE.MeshBasicMaterial();
const starMat = new THREE.MeshStandardMaterial({
    color: 0xffe566,
    emissive: 0xffcc33,
    emissiveIntensity: 2.4,
    roughness: 0.3,
    metalness: 0.4
});
const snowflakeMat = new THREE.MeshStandardMaterial({
    color: 0xf4fbff,
    emissive: 0xaad4ff,
    emissiveIntensity: 1.6,
    roughness: 0.4
});
const spireMat = new THREE.MeshStandardMaterial({
    color: 0xffd27a,
    emissive: 0xffaa33,
    emissiveIntensity: 1.8,
    roughness: 0.35,
    metalness: 0.5
});

registerSharedGeometry(bulbGeo);
registerSharedGeometry(lightGeo);
registerSharedGeometry(starGeo);
registerSharedGeometry(snowflakeGeo);
registerSharedGeometry(spireGeo);
registerSharedMaterial(bulbMat);
registerSharedMaterial(lightMat);
registerSharedMaterial(starMat);
registerSharedMaterial(snowflakeMat);
registerSharedMaterial(spireMat);

let lastTreePositions = [];

export function getTreePositions() {
    return lastTreePositions;
}

function menuGroundHeight(tx, tz) {
    const wave1 = Math.sin(tx * 0.15);
    const wave2 = Math.cos(tz * 0.15);
    const wave3 = Math.sin((tx + tz) * 0.1);
    const noise = wave1 * wave2 + wave3 * 0.5;
    let ty = 0;
    if (noise > 0.6) ty = 1;
    if (noise > 1.2) ty = 2;
    return ty;
}

function collectTree(tx, ty, tz, lightsEnabled, buffers) {
    const profile = pick(TREE_PROFILES);
    const trunkHeight = profile.trunkMin
        + Math.floor(random() * (profile.trunkMax - profile.trunkMin + 1));
    const treeY = ty + 1;

    for (let y = 0; y < trunkHeight; y++) {
        buffers.wood.push([tx, treeY + y, tz]);
    }

    const leafStart = treeY + trunkHeight - 2;
    const surfaceLeaves = [];

    for (let i = 0; i < profile.layers.length; i++) {
        const rad = profile.layers[i];
        const ly = leafStart + i;
        for (let lx = -rad; lx <= rad; lx++) {
            for (let lz = -rad; lz <= rad; lz++) {
                if (Math.abs(lx) === rad && Math.abs(lz) === rad && rad > 0) continue;
                if (lx === 0 && lz === 0 && ly < treeY + trunkHeight) continue;

                const vx = tx + lx;
                const vz = tz + lz;
                buffers.leaves.push([vx, ly, vz]);

                const isSurface = rad === 0 || Math.abs(lx) === rad || Math.abs(lz) === rad;
                if (isSurface) {
                    surfaceLeaves.push({ vx, ly, vz, lx, lz, rad });
                }
            }
        }
    }

    const topY = leafStart + profile.layers.length - 1;
    if (!lightsEnabled || random() > 0.72) {
        lastTreePositions.push({ x: tx, z: tz, decorated: false });
        return;
    }

    const kit = pick(DECOR_KITS);
    const palette = pick(BULB_PALETTES);

    if (kit.bulbs) {
        for (const leaf of surfaceLeaves) {
            if (random() > 0.16) continue;
            buffers.bulbs.push({
                x: leaf.vx,
                y: leaf.ly - 0.38,
                z: leaf.vz,
                color: palette[Math.floor(random() * palette.length)],
                scale: 0.7 + random() * 0.5
            });
        }
    }

    if (kit.lights) {
        for (const leaf of surfaceLeaves) {
            if (random() > 0.12) continue;
            const ox = leaf.lx ? Math.sign(leaf.lx) * 0.55 : (random() - 0.5) * 0.3;
            const oz = leaf.lz ? Math.sign(leaf.lz) * 0.55 : (random() - 0.5) * 0.3;
            buffers.lights.push({
                x: leaf.vx + ox,
                y: leaf.ly,
                z: leaf.vz + oz,
                color: pick(LIGHT_COLORS)
            });
        }
    }

    if (kit.topper) {
        const kind = pick(TOPPER_KINDS);
        buffers.toppers[kind].push({ x: tx, y: topY + 0.7, z: tz });
    }

    lastTreePositions.push({ x: tx, z: tz, decorated: true });
}

function commitInstanced(container, geo, mat, items, setter, edge = false) {
    if (items.length === 0) return [];
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    const dummy = new THREE.Object3D();
    const edgeMesh = edge
        ? new THREE.InstancedMesh(edgeGeometry, edgeMaterial, items.length)
        : null;
    if (edgeMesh) edgeMesh.renderOrder = 1;

    items.forEach((item, idx) => {
        setter(dummy, item, idx, mesh);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        if (edgeMesh) edgeMesh.setMatrixAt(idx, dummy.matrix);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    mesh.computeBoundingSphere();
    container.add(mesh);
    if (edgeMesh) {
        edgeMesh.computeBoundingSphere();
        container.add(edgeMesh);
        return [mesh, edgeMesh];
    }
    return [mesh];
}

function placeMenuTrees(opts, lightsEnabled, buffers) {
    const treeCount = opts.treeCount;
    const minRad = opts.hillRadius + 1;
    const maxRad = opts.worldRadius - 2;

    for (let i = 0; i < treeCount; i++) {
        const angle = random() * Math.PI * 2;
        const dist = minRad + random() * (maxRad - minRad);
        const tx = Math.floor(Math.cos(angle) * dist);
        const tz = Math.floor(Math.sin(angle) * dist);
        if (Math.hypot(tx, tz) > opts.worldRadius) continue;
        const ty = menuGroundHeight(tx, tz);
        collectTree(tx, ty, tz, lightsEnabled, buffers);
    }
}

function placeGameTrees(opts, lightsEnabled, buffers) {
    const treeCount = opts.treeCount;
    const minX = opts.worldMin + opts.borderWidth + 4;
    const maxX = opts.worldMax - opts.borderWidth - 4;
    const villageKeepout = opts.hillRadius + 4;
    const phaseA = random() * Math.PI * 2;
    const phaseB = random() * Math.PI * 2;
    let placed = 0;
    let attempts = 0;
    const maxAttempts = treeCount * 18;

    while (placed < treeCount && attempts < maxAttempts) {
        attempts++;
        const tx = minX + Math.floor(random() * (maxX - minX + 1));
        const tz = minX + Math.floor(random() * (maxX - minX + 1));
        if (Math.hypot(tx, tz) < villageKeepout) continue;

        const forest = (Math.sin(tx * 0.07 + phaseA) * Math.cos(tz * 0.06 + phaseB) + 1) * 0.5;
        if (forest < 0.28) continue;
        if (random() > forest) continue;

        const ty = sampleGameHeight(tx, tz);
        collectTree(tx, ty, tz, lightsEnabled, buffers);
        placed++;
    }
}

export function generateTrees(container, SCENE_OPTS, options = {}, outputArray = null) {
    const trees = options.trees !== false;
    const lightsEnabled = options.lights !== false;
    if (!trees) {
        lastTreePositions = [];
        return;
    }

    lastTreePositions = [];
    const useGame = options.useGameHeight === true;
    const buffers = {
        wood: [],
        leaves: [],
        bulbs: [],
        lights: [],
        toppers: { star: [], snowflake: [], spire: [] }
    };

    if (useGame) {
        placeGameTrees(SCENE_OPTS, lightsEnabled, buffers);
    } else {
        placeMenuTrees(SCENE_OPTS, lightsEnabled, buffers);
    }

    const dummy = new THREE.Object3D();
    const added = [];
    if (buffers.wood.length === 0 && buffers.leaves.length === 0) {
        console.log('[TREES] No trees placed');
        return;
    }

    const woodMesh = new THREE.InstancedMesh(geometryBox, mats.wood, Math.max(buffers.wood.length, 1));
    const leafMesh = new THREE.InstancedMesh(geometryBox, mats.leaves, Math.max(buffers.leaves.length, 1));
    const woodEdgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, Math.max(buffers.wood.length, 1));
    const leafEdgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, Math.max(buffers.leaves.length, 1));
    woodEdgeMesh.renderOrder = 1;
    leafEdgeMesh.renderOrder = 1;

    buffers.wood.forEach(([x, y, z], idx) => {
        dummy.position.set(x, y, z);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        woodMesh.setMatrixAt(idx, dummy.matrix);
        woodEdgeMesh.setMatrixAt(idx, dummy.matrix);
        registerBlock(x, y, z, 'wood', woodMesh, true, idx, container);
    });
    buffers.leaves.forEach(([x, y, z], idx) => {
        dummy.position.set(x, y, z);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        leafMesh.setMatrixAt(idx, dummy.matrix);
        leafEdgeMesh.setMatrixAt(idx, dummy.matrix);
        registerBlock(x, y, z, 'leaves', leafMesh, true, idx, container);
    });

    woodMesh.count = buffers.wood.length;
    leafMesh.count = buffers.leaves.length;
    woodEdgeMesh.count = buffers.wood.length;
    leafEdgeMesh.count = buffers.leaves.length;
    woodMesh.computeBoundingSphere();
    leafMesh.computeBoundingSphere();
    woodEdgeMesh.computeBoundingSphere();
    leafEdgeMesh.computeBoundingSphere();
    container.add(woodMesh, leafMesh, woodEdgeMesh, leafEdgeMesh);
    added.push(woodMesh, leafMesh, woodEdgeMesh, leafEdgeMesh);

    added.push(...commitInstanced(container, bulbGeo, bulbMat, buffers.bulbs, (d, item, idx, mesh) => {
        d.position.set(item.x, item.y, item.z);
        d.scale.set(item.scale, item.scale, item.scale);
        d.rotation.set(0, 0, 0);
        mesh.setColorAt(idx, new THREE.Color(item.color));
    }));
    added.push(...commitInstanced(container, lightGeo, lightMat, buffers.lights, (d, item, idx, mesh) => {
        d.position.set(item.x, item.y, item.z);
        d.scale.set(1, 1, 1);
        d.rotation.set(0, 0, 0);
        mesh.setColorAt(idx, new THREE.Color(item.color));
    }));
    added.push(...commitInstanced(container, starGeo, starMat, buffers.toppers.star, (d, item) => {
        d.position.set(item.x, item.y, item.z);
        d.scale.set(1, 1, 1);
        d.rotation.set(0, random() * Math.PI, 0);
    }));
    added.push(...commitInstanced(container, snowflakeGeo, snowflakeMat, buffers.toppers.snowflake, (d, item) => {
        d.position.set(item.x, item.y, item.z);
        d.scale.set(1, 1, 1);
        d.rotation.set(0.4, random() * Math.PI, 0.2);
    }));
    added.push(...commitInstanced(container, spireGeo, spireMat, buffers.toppers.spire, (d, item) => {
        d.position.set(item.x, item.y, item.z);
        d.scale.set(1, 1, 1);
        d.rotation.set(0, 0, 0);
    }));

    if (outputArray) outputArray.push(...added);
    console.log(
        `[TREES] ${lastTreePositions.length} trees: ${buffers.wood.length} wood, ` +
        `${buffers.leaves.length} leaves, ${buffers.bulbs.length} bulbs, ` +
        `${buffers.lights.length} lights, toppers ` +
        `${buffers.toppers.star.length}/${buffers.toppers.snowflake.length}/${buffers.toppers.spire.length}`
    );
}
