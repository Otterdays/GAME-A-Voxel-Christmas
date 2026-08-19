import * as THREE from 'three';
import { registerBlock } from './block-registry.js';

export const geometryBox = new THREE.BoxGeometry(1, 1, 1);
export const edgeGeometry = new THREE.EdgesGeometry(geometryBox);
export const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x000000,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
});

export const mats = {
    dirt: new THREE.MeshStandardMaterial({ color: 0x4e3629, roughness: 1.0 }),
    snowBlock: new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 1.0 }),
    leaves: new THREE.MeshStandardMaterial({ color: 0x1e4d2b, roughness: 0.8 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 }),
    plank: new THREE.MeshStandardMaterial({ color: 0x8f6a4e, roughness: 0.8 }),
    ice: new THREE.MeshStandardMaterial({
        color: 0x7ec8e3,
        roughness: 0.25,
        metalness: 0.15
    }),
    window: new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xffaa00,
        emissiveIntensity: 2,
        transparent: true,
        opacity: 0.9
    })
};

const sharedGeometries = new Set([geometryBox, edgeGeometry]);
const sharedMaterials = new Set([...Object.values(mats), edgeMaterial]);

export function registerSharedGeometry(geo) {
    if (geo) sharedGeometries.add(geo);
}

export function registerSharedMaterial(mat) {
    if (mat) sharedMaterials.add(mat);
}

export function isSharedGeometry(geo) {
    return sharedGeometries.has(geo);
}

export function isSharedMaterial(mat) {
    return sharedMaterials.has(mat);
}

export function createVoxel(container, x, y, z, material, blockType = 'unknown', enableEdges = true) {
    const mesh = new THREE.Mesh(geometryBox, material);
    mesh.position.set(x, y, z);
    mesh.renderOrder = 0;
    container.add(mesh);

    let edges = null;
    if (enableEdges) {
        edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        edges.position.set(x, y, z);
        edges.renderOrder = 1;
        container.add(edges);
    }

    registerBlock(x, y, z, blockType, mesh, false, null, container);
    return { mesh, edges };
}

export function fillInstanced(mesh, edgeMesh, positions, blockType, container, dummy, register = true) {
    positions.forEach(([x, y, z], idx) => {
        dummy.position.set(x, y, z);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        if (edgeMesh) edgeMesh.setMatrixAt(idx, dummy.matrix);
        if (register) {
            registerBlock(x, y, z, blockType, mesh, true, idx, container);
        }
    });
}
