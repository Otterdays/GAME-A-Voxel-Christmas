import * as THREE from 'three';
import { PEAK_HEIGHT, GAME_PEAK_HEIGHT } from './config.js';
import { registerBlock, clearRegistry } from './block-registry.js';

// Seeded RNG
let _seedState = 12345;

export function setSeed(val) {
    if (val === undefined || val === null || val === '') {
        // Random seed if none provided
        _seedState = Math.floor(Math.random() * 2147483647);
        return;
    }
    
    // Simple hash to convert string/number to 32-bit integer
    let str = val.toString();
    let h = 2166136261; // FNV offset basis
    for(let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    _seedState = h >>> 0;
}

function random() {
    // Mulberry32
    _seedState += 0x6D2B79F5;
    let t = _seedState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Reusable Geometry
const geometryBox = new THREE.BoxGeometry(1, 1, 1);

// Edge geometry for block borders
const edgeGeometry = new THREE.EdgesGeometry(geometryBox);
const edgeMaterial = new THREE.LineBasicMaterial({ 
    color: 0x000000,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
});

// Materials
const mats = {
    dirt: new THREE.MeshStandardMaterial({ color: 0x4e3629, roughness: 1.0 }),
    snowBlock: new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 1.0 }),
    leaves: new THREE.MeshStandardMaterial({ color: 0x1e4d2b, roughness: 0.8 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 }),
    plank: new THREE.MeshStandardMaterial({ color: 0x8f6a4e, roughness: 0.8 }),
    window: new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xffaa00,
        emissiveIntensity: 2,
        transparent: true, opacity: 0.9
    })
};

// Track generated objects for cleanup
let generatedObjects = {
    terrain: [],
    house: [],
    trees: [],
    lights: []
};

function createVoxel(container, x, y, z, material, blockType = 'unknown', enableEdges = true) {
    // Create the main block mesh
    const mesh = new THREE.Mesh(geometryBox, material);
    mesh.position.set(x, y, z);
    mesh.renderOrder = 0;
    container.add(mesh);
    
    let edges = null;
    if (enableEdges) {
        // Create edge lines for block borders
        edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        edges.position.set(x, y, z);
        edges.renderOrder = 1; // Render after blocks to avoid z-fighting
        container.add(edges);
    }
    
    // Register block in registry
    registerBlock(x, y, z, blockType, mesh, false, null, container);
    
    // Return both mesh and edges for tracking
    return { mesh, edges };
}

export function generateTerrainInstanced(container, SCENE_OPTS, options = {}, outputArray = null) {
    const hills = options.hills !== false; // Default to true if not specified
    const useGameHeight = options.useGameHeight || false;
    const peakHeight = useGameHeight ? GAME_PEAK_HEIGHT : PEAK_HEIGHT;
    const enableSnowEdges = options.enableSnowEdges !== false; // Default to true, can be disabled for menu
    
    const r = SCENE_OPTS.worldRadius;
    const hillR = SCENE_OPTS.hillRadius;
    const platR = SCENE_OPTS.plateauRadius;

    const dim = r * 2 + 1;
    const maxCount = dim * dim * 5;

    const dirtMesh = new THREE.InstancedMesh(geometryBox, mats.dirt, maxCount);
    const snowMesh = new THREE.InstancedMesh(geometryBox, mats.snowBlock, maxCount);
    dirtMesh.renderOrder = 0;
    snowMesh.renderOrder = 0;
    
    // Create edge instanced meshes for block borders
    const dirtEdgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, maxCount);
    dirtEdgeMesh.renderOrder = 1;
    const snowEdgeMesh = enableSnowEdges ? new THREE.InstancedMesh(edgeGeometry, edgeMaterial, maxCount) : null;
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
            } else {
                // Flat terrain when hills disabled
                h = 0;
            }

            for (let y = -1; y <= h; y++) {
                dummy.position.set(x, y, z);
                dummy.updateMatrix();
                if (y === h) {
                    snowMesh.setMatrixAt(snowIdx, dummy.matrix);
                    if (snowEdgeMesh) {
                        snowEdgeMesh.setMatrixAt(snowIdx, dummy.matrix);
                    }
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
    
    // [PERFORMANCE] Recompute bounding spheres for accurate frustum culling
    // Without this, Three.js doesn't know the actual bounds of instanced objects
    // and may incorrectly cull visible objects or fail to cull invisible ones
    dirtMesh.computeBoundingSphere();
    snowMesh.computeBoundingSphere();
    dirtEdgeMesh.computeBoundingSphere();
    if (snowEdgeMesh) snowEdgeMesh.computeBoundingSphere();
    
    container.add(dirtMesh);
    container.add(snowMesh);
    container.add(dirtEdgeMesh);
    if (snowEdgeMesh) container.add(snowEdgeMesh);
    
    // Track for cleanup
    generatedObjects.terrain.push(dirtMesh, snowMesh, dirtEdgeMesh);
    if (snowEdgeMesh) generatedObjects.terrain.push(snowEdgeMesh);
    
    // Add to output array if provided
    if (outputArray) {
        outputArray.push(dirtMesh, snowMesh, dirtEdgeMesh);
        if (snowEdgeMesh) outputArray.push(snowEdgeMesh);
    }
}

export function generateHouse(container, options = {}, outputArray = null) {
    const house = options.house !== false; // Default to true if not specified
    if (!house) return;
    
    const useGameHeight = options.useGameHeight || false;
    const peakHeight = useGameHeight ? GAME_PEAK_HEIGHT : PEAK_HEIGHT;
    const floorY = peakHeight;
    const hw = 2;
    
    /* HOUSE STRUCTURE ANALYSIS
     * Floor (y=0): 5x5 planks = 25 blocks
     * Walls (y=1-3): Perimeter wood/windows = ~40 blocks
     * Roof (y=4-7): Stone + snow layers = ~60 blocks
     * Total: ~125 blocks split across 5 materials
     */
    
    // Track block positions by material type
    const blockPositions = { plank: [], wood: [], stone: [], snow: [], window: [] };
    const blockScales = { snow: [] }; // Track scaled blocks (roof snow)
    const lightsArray = [];
    
    // First pass: collect all block positions
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
    
    // Roof generation
    const roofStart = floorY + 4;
    for (let i = 0; i <= hw + 1; i++) {
        const range = hw + 1 - i;
        for (let x = -range; x <= range; x++) {
            for (let z = -range; z <= range; z++) {
                blockPositions.stone.push([x, roofStart + i, z]);
                // Snow blocks on roof are scaled (0.2 height)
                blockPositions.snow.push([x, roofStart + i + 0.6, z]);
                blockScales.snow.push([x, roofStart + i + 0.6, z, 1, 0.2, 1]);
            }
        }
    }
    // Additional roof blocks
    blockPositions.stone.push([1, roofStart + 2, 1]);
    blockPositions.stone.push([1, roofStart + 3, 1]);
    
    // Create InstancedMesh objects for each material type
    const plankMesh = new THREE.InstancedMesh(geometryBox, mats.plank, blockPositions.plank.length);
    const woodMesh = new THREE.InstancedMesh(geometryBox, mats.wood, blockPositions.wood.length);
    const stoneMesh = new THREE.InstancedMesh(geometryBox, mats.stone, blockPositions.stone.length);
    const snowRoofMesh = new THREE.InstancedMesh(geometryBox, mats.snowBlock, blockPositions.snow.length);
    const windowMesh = new THREE.InstancedMesh(geometryBox, mats.window, blockPositions.window.length);
    
    // Create edge meshes
    const plankEdgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, blockPositions.plank.length);
    const woodEdgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, blockPositions.wood.length);
    const stoneEdgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, blockPositions.stone.length);
    const snowRoofEdgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, blockPositions.snow.length);
    const windowEdgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, blockPositions.window.length);
    
    const dummy = new THREE.Object3D();
    let plankIdx = 0, woodIdx = 0, stoneIdx = 0, snowIdx = 0, windowIdx = 0;
    
    // Set instance matrices for planks
    blockPositions.plank.forEach(([x, y, z]) => {
        dummy.position.set(x, y, z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        plankMesh.setMatrixAt(plankIdx, dummy.matrix);
        plankEdgeMesh.setMatrixAt(plankIdx, dummy.matrix);
        registerBlock(x, y, z, 'plank', plankMesh, true, plankIdx, container);
        plankIdx++;
    });
    
    // Set instance matrices for wood
    blockPositions.wood.forEach(([x, y, z]) => {
        dummy.position.set(x, y, z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        woodMesh.setMatrixAt(woodIdx, dummy.matrix);
        woodEdgeMesh.setMatrixAt(woodIdx, dummy.matrix);
        registerBlock(x, y, z, 'wood', woodMesh, true, woodIdx, container);
        woodIdx++;
    });
    
    // Set instance matrices for stone
    blockPositions.stone.forEach(([x, y, z]) => {
        dummy.position.set(x, y, z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        stoneMesh.setMatrixAt(stoneIdx, dummy.matrix);
        stoneEdgeMesh.setMatrixAt(stoneIdx, dummy.matrix);
        registerBlock(x, y, z, 'stone', stoneMesh, true, stoneIdx, container);
        stoneIdx++;
    });
    
    // Set instance matrices for snow (with scaling for roof)
    blockScales.snow.forEach(([x, y, z, sx, sy, sz]) => {
        dummy.position.set(x, y, z);
        dummy.scale.set(sx, sy, sz);
        dummy.updateMatrix();
        snowRoofMesh.setMatrixAt(snowIdx, dummy.matrix);
        snowRoofEdgeMesh.setMatrixAt(snowIdx, dummy.matrix);
        registerBlock(x, y, z, 'snow', snowRoofMesh, true, snowIdx, container);
        snowIdx++;
    });
    
    // Set instance matrices for windows
    blockPositions.window.forEach(([x, y, z]) => {
        dummy.position.set(x, y, z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        windowMesh.setMatrixAt(windowIdx, dummy.matrix);
        windowEdgeMesh.setMatrixAt(windowIdx, dummy.matrix);
        registerBlock(x, y, z, 'window', windowMesh, true, windowIdx, container);
        windowIdx++;
    });
    
    // Set render orders
    plankEdgeMesh.renderOrder = 1;
    woodEdgeMesh.renderOrder = 1;
    stoneEdgeMesh.renderOrder = 1;
    snowRoofEdgeMesh.renderOrder = 1;
    windowEdgeMesh.renderOrder = 1;
    
    // Compute bounding spheres
    plankMesh.computeBoundingSphere();
    woodMesh.computeBoundingSphere();
    stoneMesh.computeBoundingSphere();
    snowRoofMesh.computeBoundingSphere();
    windowMesh.computeBoundingSphere();
    plankEdgeMesh.computeBoundingSphere();
    woodEdgeMesh.computeBoundingSphere();
    stoneEdgeMesh.computeBoundingSphere();
    snowRoofEdgeMesh.computeBoundingSphere();
    windowEdgeMesh.computeBoundingSphere();
    
    // Add to scene
    container.add(plankMesh);
    container.add(woodMesh);
    container.add(stoneMesh);
    container.add(snowRoofMesh);
    container.add(windowMesh);
    container.add(plankEdgeMesh);
    container.add(woodEdgeMesh);
    container.add(stoneEdgeMesh);
    container.add(snowRoofEdgeMesh);
    container.add(windowEdgeMesh);
    
    // Add lights
    lightsArray.forEach(light => container.add(light));
    
    // Track for cleanup
    const houseObjects = [
        plankMesh, woodMesh, stoneMesh, snowRoofMesh, windowMesh,
        plankEdgeMesh, woodEdgeMesh, stoneEdgeMesh, snowRoofEdgeMesh, windowEdgeMesh,
        ...lightsArray
    ];
    generatedObjects.house.push(...houseObjects);
    
    // Add to output array if provided
    if (outputArray) {
        outputArray.push(...houseObjects);
    }
    
    console.log(`[HOUSE] Generated: ${plankIdx} planks, ${woodIdx} wood, ${stoneIdx} stone, ${snowIdx} snow, ${windowIdx} windows`);
}

export function generateTrees(container, SCENE_OPTS, options = {}, outputArray = null) {
    const trees = options.trees !== false; // Default to true if not specified
    const lights = options.lights !== false; // Default to true if not specified
    
    if (!trees) return;
    
    const useGameHeight = options.useGameHeight || false;
    const treeCount = SCENE_OPTS.treeCount;
    const minRad = SCENE_OPTS.hillRadius + 1;
    const maxRad = SCENE_OPTS.worldRadius - 2;
    
    // Calculate max instances (generous estimates)
    const maxWoodBlocks = treeCount * 6; // Max 6 blocks per trunk
    const maxLeafBlocks = treeCount * 25; // More leaves on some trees
    
    // Create shared InstancedMesh for all trees
    const woodMesh = new THREE.InstancedMesh(geometryBox, mats.wood, maxWoodBlocks);
    const leafMesh = new THREE.InstancedMesh(geometryBox, mats.leaves, maxLeafBlocks);
    const woodEdgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, maxWoodBlocks);
    const leafEdgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, maxLeafBlocks);
    
    let woodIdx = 0, leafIdx = 0;
    const dummy = new THREE.Object3D();
    const lightsArray = []; // Store lights separately (not instanced - different colors)
    
    // Generate all trees
    for (let i = 0; i < treeCount; i++) {
        const angle = random() * Math.PI * 2;
        const dist = minRad + random() * (maxRad - minRad);
        const tx = Math.floor(Math.cos(angle) * dist);
        const tz = Math.floor(Math.sin(angle) * dist);

        const distFromCenter = Math.sqrt(tx * tx + tz * tz);
        if (distFromCenter > SCENE_OPTS.worldRadius) continue;

        // Calculate ground height
        let ty = 0;
        if (useGameHeight) {
            ty = getGroundHeight(tx, tz, SCENE_OPTS, useGameHeight);
        } else {
            const wave1 = Math.sin(tx * 0.15);
            const wave2 = Math.cos(tz * 0.15);
            const wave3 = Math.sin((tx + tz) * 0.1);
            const noise = wave1 * wave2 + wave3 * 0.5;
            if (noise > 0.6) ty = 1;
            if (noise > 1.2) ty = 2;
        }
        
        const treeY = ty + 1;
        const trunkHeight = 4 + Math.floor(random() * 2); // 4-6 blocks
        
        // Generate trunk blocks
        for (let y = 0; y < trunkHeight; y++) {
            dummy.position.set(tx, treeY + y, tz);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            woodMesh.setMatrixAt(woodIdx, dummy.matrix);
            woodEdgeMesh.setMatrixAt(woodIdx, dummy.matrix);
            registerBlock(tx, treeY + y, tz, 'wood', woodMesh, true, woodIdx, container);
            woodIdx++;
        }
        
        // Generate leaf blocks (3x3x3 cube at top, with variations)
        const leafStart = treeY + trunkHeight - 2;
        const top = leafStart + 3;

        for (let ly = leafStart; ly <= top; ly++) {
            let rad = 0;
            if (ly === leafStart) rad = 2;
            else if (ly === leafStart + 1) rad = 2;
            else if (ly === leafStart + 2) rad = 1;
            else rad = 0;

            for (let lx = -rad; lx <= rad; lx++) {
                for (let lz = -rad; lz <= rad; lz++) {
                    if (Math.abs(lx) === rad && Math.abs(lz) === rad && rad > 0) continue;
                    if (lx === 0 && lz === 0 && ly < treeY + trunkHeight) continue;

                    const vx = tx + lx;
                    const vz = tz + lz;
                    dummy.position.set(vx, ly, vz);
                    dummy.scale.set(1, 1, 1);
                    dummy.updateMatrix();
                    leafMesh.setMatrixAt(leafIdx, dummy.matrix);
                    leafEdgeMesh.setMatrixAt(leafIdx, dummy.matrix);
                    registerBlock(vx, ly, vz, 'leaves', leafMesh, true, leafIdx, container);
                    leafIdx++;

                    // Lights: 4% chance (only if enabled)
                    if (lights && random() < 0.04) {
                        const lightObj = addLight(container, vx, ly, vz, lx, 0, lz);
                        lightsArray.push(lightObj);
                    }
                }
            }
        }
    }
    
    // Set actual instance counts
    woodMesh.count = woodIdx;
    leafMesh.count = leafIdx;
    woodEdgeMesh.count = woodIdx;
    leafEdgeMesh.count = leafIdx;
    
    // Compute bounding spheres
    woodMesh.computeBoundingSphere();
    leafMesh.computeBoundingSphere();
    woodEdgeMesh.computeBoundingSphere();
    leafEdgeMesh.computeBoundingSphere();
    
    // Add to scene
    woodEdgeMesh.renderOrder = 1;
    leafEdgeMesh.renderOrder = 1;
    
    container.add(woodMesh);
    container.add(leafMesh);
    container.add(woodEdgeMesh);
    container.add(leafEdgeMesh);
    
    // Add lights
    lightsArray.forEach(light => container.add(light));
    
    // Track for cleanup
    const treeObjects = [woodMesh, leafMesh, woodEdgeMesh, leafEdgeMesh, ...lightsArray];
    generatedObjects.trees.push(...treeObjects);
    
    // Add to output array if provided
    if (outputArray) {
        outputArray.push(...treeObjects);
    }
    
    console.log(`[TREES] Generated ${treeCount} trees: ${woodIdx} wood, ${leafIdx} leaves, ${lightsArray.length} lights`);
}

function buildTree(container, x, y, z, lightsEnabled = true) {
    const treeObjects = [];
    const h = 4 + Math.floor(random() * 2);
    for (let i = 0; i < h; i++) {
        const voxel = createVoxel(container, x, y + i, z, mats.wood, 'wood');
        treeObjects.push(voxel.mesh, voxel.edges);
    }

    const leafStart = y + h - 2;
    const top = leafStart + 3;

    for (let ly = leafStart; ly <= top; ly++) {
        let rad = 0;
        if (ly === leafStart) rad = 2;
        else if (ly === leafStart + 1) rad = 2;
        else if (ly === leafStart + 2) rad = 1;
        else rad = 0;

        for (let lx = -rad; lx <= rad; lx++) {
            for (let lz = -rad; lz <= rad; lz++) {
                if (Math.abs(lx) === rad && Math.abs(lz) === rad && rad > 0) continue;
                if (lx === 0 && lz === 0 && ly < y + h) continue;

                const vx = x + lx;
                const vz = z + lz;
                const voxel = createVoxel(container, vx, ly, vz, mats.leaves, 'leaves');
                treeObjects.push(voxel.mesh, voxel.edges);

                // Lights: 4% chance (only if enabled)
                if (lightsEnabled && random() < 0.04) {
                    const lightObj = addLight(container, vx, ly, vz, lx, 0, lz);
                    treeObjects.push(lightObj);
                }
            }
        }
    }
    
    return treeObjects;
}

function addLight(container, x, y, z, lx, ly, lz) {
    const colors = [0xff0000, 0x00ff00, 0x2266ff, 0xffd700];
    const c = colors[Math.floor(random() * colors.length)];
    const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const mat = new THREE.MeshStandardMaterial({
        color: c, emissive: c, emissiveIntensity: 10.0
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + (lx ? Math.sign(lx) * 0.6 : 0), y, z + (lz ? Math.sign(lz) * 0.6 : 0));
    container.add(mesh);
    return mesh;
}

// Clear all generated world objects from a container
// [PERFORMANCE] Cleanup function with complete disposal and removal
// Prevents memory leaks by properly disposing GPU resources and removing scene references
export function clearWorld(container) {
    const objectsToRemove = [];
    
    // Collect all objects to remove (can't remove while traversing)
    container.traverse(obj => {
        if (obj !== container) { // Don't remove the container itself
            objectsToRemove.push(obj);
        }
    });
    
    // Dispose and remove each object
    objectsToRemove.forEach(obj => {
        // Dispose geometry
        if (obj.geometry) {
            obj.geometry.dispose();
        }
        
        // Dispose materials
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(mat => {
                    if (mat.map) mat.map.dispose(); // Dispose textures
                    mat.dispose();
                });
            } else {
                if (obj.material.map) obj.material.map.dispose();
                obj.material.dispose();
            }
        }
        
        // Remove from parent (this is the missing piece!)
        if (obj.parent) {
            obj.parent.remove(obj);
        }
    });
    
    // Clear tracking arrays
    generatedObjects.terrain = [];
    generatedObjects.house = [];
    generatedObjects.trees = [];
    generatedObjects.lights = [];
    
    // Clear block registry
    clearRegistry();
    
    console.log(`[CLEANUP] Cleared ${objectsToRemove.length} objects from scene`);
}

// Calculate ground height at given X/Z position
export function getGroundHeight(x, z, SCENE_OPTS, useGameHeight = false) {
    const r = SCENE_OPTS.worldRadius;
    const hillR = SCENE_OPTS.hillRadius;
    const platR = SCENE_OPTS.plateauRadius;
    const peakHeight = useGameHeight ? GAME_PEAK_HEIGHT : PEAK_HEIGHT;
    
    const dist = Math.sqrt(x * x + z * z);
    
    if (dist > r) return 0;
    
    let h = 0;
    
    if (dist < platR) {
        h = peakHeight;
    } else if (dist < hillR) {
        const slopeFactor = (dist - platR) / (hillR - platR);
        const eased = (Math.cos(slopeFactor * Math.PI) + 1) / 2;
        h = Math.round(peakHeight * eased);
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
