# Performance Analysis & Optimization Plan

## Executive Summary
Analysis of the voxel Christmas game using Three.js r181.2 best practices reveals several optimization opportunities. The game currently uses instanced rendering effectively but can benefit from additional optimizations for memory management, frustum culling, and rendering efficiency.

## Current Performance Profile

### Strengths ✅
- **Instanced Rendering**: Terrain uses `InstancedMesh` for dirt and snow blocks (excellent)
- **Shared Geometries**: Single `BoxGeometry` reused across all blocks
- **Shared Materials**: Material instances reused efficiently
- **Edge Geometry Optimization**: Separate instanced meshes for block borders

### Areas for Improvement 🔧

## Critical Optimizations

### 1. **Frustum Culling Issues**
**Problem**: Individual house/tree blocks and edge lines not benefiting from frustum culling
- House blocks created with `createVoxel()` are individual meshes (not instanced)
- Each tree block is a separate mesh
- Edge lines for non-instanced blocks are separate `LineSegments`

**Impact**: High draw call count, especially with many trees
- Menu world: ~140 trees × ~10 blocks/tree = ~1,400+ individual meshes
- Game world: ~400 trees × ~10 blocks/tree = ~4,000+ individual meshes

**Solution**: Convert house and tree generation to use `InstancedMesh`

```javascript
// Current (inefficient):
for (each block in house) {
  const voxel = createVoxel(container, x, y, z, material, type);
  // Creates 2 separate meshes (block + edges)
}

// Optimized:
const houseWoodMesh = new THREE.InstancedMesh(geometryBox, mats.wood, maxWoodBlocks);
const houseStoneMesh = new THREE.InstancedMesh(geometryBox, mats.stone, maxStoneBlocks);
// Set matrices for all instances at once
```

### 2. **Bounding Volume Updates Missing**
**Problem**: `InstancedMesh` bounding spheres not recomputed after `setMatrixAt()`
- Terrain generation sets instance matrices but never calls `computeBoundingSphere()`
- Without updated bounding volumes, frustum culling may be inaccurate
- Ray casting (block highlighting) may miss instances

**Location**: `js/world-gen.js:171-174`

**Solution**: Add bounding volume recomputation

```javascript
dirtMesh.count = dirtIdx;
snowMesh.count = snowIdx;
dirtEdgeMesh.count = dirtIdx;
if (snowEdgeMesh) snowEdgeMesh.count = snowIdx;

// ADD THESE:
dirtMesh.computeBoundingSphere();
snowMesh.computeBoundingSphere();
dirtEdgeMesh.computeBoundingSphere();
if (snowEdgeMesh) snowEdgeMesh.computeBoundingSphere();
```

### 3. **Particle System Optimization**
**Problem**: Particle updates modify entire buffer every frame
- `js/particles.js:80-87` - Snow system updates all positions every frame
- `js/particles.js:90-107` - Leaves system updates all positions every frame
- Sets `needsUpdate = true` on entire buffer (uploads ~30KB+ per frame)

**Solution**: Use partial buffer updates with `addUpdateRange()`

```javascript
// Current:
this.snowSystem.geometry.attributes.position.needsUpdate = true;

// Optimized:
const posAttr = this.snowSystem.geometry.attributes.position;
// Only update changed particles if possible, or use smaller chunks
posAttr.addUpdateRange(0, changedCount * 3);
posAttr.needsUpdate = true;
```

### 4. **Memory Leak Prevention**
**Problem**: No disposal of old geometries/materials when regenerating world
- `clearWorld()` disposes objects but doesn't clear from scene properly
- Block registry cleared but meshes may remain in GPU memory

**Solution**: Ensure complete cleanup

```javascript
// In clearWorld():
container.traverse(obj => {
  if (obj.geometry) {
    obj.geometry.dispose();
  }
  if (obj.material) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach(mat => mat.dispose());
    } else {
      obj.material.dispose();
    }
  }
  // ADD: Remove from parent
  if (obj.parent) {
    obj.parent.remove(obj);
  }
});
```

### 5. **Raycasting Performance**
**Problem**: Block highlighting raycasts against all objects every frame
- `js/main.js:125-164` - Raycasts against entire scene
- No BVH (Bounding Volume Hierarchy) for acceleration
- Raycasts against both instanced and non-instanced meshes

**Solution**: Use targeted raycasting with layers

```javascript
// Set up layers for different object types
const LAYER_TERRAIN = 1;
const LAYER_STRUCTURES = 2;

// Only raycast against terrain layer
raycaster.layers.set(LAYER_TERRAIN);
dirtMesh.layers.set(LAYER_TERRAIN);
snowMesh.layers.set(LAYER_TERRAIN);
```

## Medium Priority Optimizations

### 6. **Render Order Optimization**
**Current**: All meshes use `renderOrder = 0` or `renderOrder = 1`
**Issue**: No optimization for opaque vs transparent rendering

**Solution**: Group by material properties
- Opaque objects: `renderOrder = 0`
- Transparent objects (windows): `renderOrder = 1`
- Edge lines: `renderOrder = 2`

### 7. **Geometry Disposal**
**Problem**: Shared geometries (`geometryBox`, `edgeGeometry`) never disposed
**Impact**: Minor memory leak on page unload
**Solution**: Add disposal on cleanup

### 8. **Post-Processing Optimization**
**Current**: Bloom pass runs every frame even when disabled
**Solution**: Skip composer when `postProcessingEnabled = false`

```javascript
// In animate() - Already implemented correctly ✅
if (postProcessingEnabled && composer) {
  composer.render();
} else {
  renderer.render(scene, camera);
}
```

### 9. **Material Updates**
**Problem**: Materials created once but never optimized
**Solution**: Set `material.needsUpdate = false` after first render

## Low Priority Optimizations

### 10. **LOD (Level of Detail)**
**Future Enhancement**: Implement LOD for distant trees
- Close: Full detail trees (current)
- Medium: Simplified trees (fewer blocks)
- Far: Single billboard sprite

### 11. **Occlusion Culling**
**Future Enhancement**: Don't render blocks hidden by terrain
- Currently all terrain blocks rendered even if underground
- Could skip rendering dirt blocks covered by snow

### 12. **Texture Atlasing**
**Future Enhancement**: Use texture atlas instead of solid colors
- Would enable more visual variety
- Requires UV coordinate setup

## Performance Metrics to Track

### Before Optimization
- Draw calls: ~1,500-4,500 (menu/game)
- Triangles: ~3,000-12,000
- GPU Memory: ~50-150MB
- Frame time: ~16ms (60 FPS)

### After Optimization (Expected)
- Draw calls: ~100-300 (menu/game)
- Triangles: Same
- GPU Memory: ~40-120MB
- Frame time: ~8-12ms (60-120 FPS)

## Implementation Priority

### Phase 1 (Critical - Immediate Impact)
1. Add `computeBoundingSphere()` to all InstancedMesh objects
2. Convert house generation to use InstancedMesh
3. Convert tree generation to use InstancedMesh
4. Fix memory cleanup in `clearWorld()`

### Phase 2 (High Impact)
5. Optimize particle buffer updates with `addUpdateRange()`
6. Implement raycasting layers
7. Add render order optimization

### Phase 3 (Polish)
8. Material optimization
9. Geometry disposal
10. Performance monitoring UI

## Testing Strategy

### Performance Benchmarks
1. **Menu World Test**: Measure FPS with 140 trees
2. **Game World Test**: Measure FPS with 400 trees
3. **Memory Test**: Monitor GPU memory over 5 world regenerations
4. **Draw Call Test**: Use `renderer.info` to track draw calls

### Test Code
```javascript
// Add to main.js for debugging
function logPerformanceStats() {
  console.log('Render Info:', {
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    points: renderer.info.render.points,
    lines: renderer.info.render.lines,
    memory: {
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures
    }
  });
}

// Call every 60 frames
if (frameCount % 60 === 0) {
  logPerformanceStats();
}
```

## Three.js Best Practices Applied

### From Official Documentation
1. **InstancedMesh for Repeated Geometry** ✅ (terrain)
2. **Shared Geometry/Materials** ✅
3. **Frustum Culling** ⚠️ (needs bounding sphere updates)
4. **Proper Disposal** ⚠️ (needs improvement)
5. **BufferAttribute Updates** ⚠️ (needs `addUpdateRange()`)
6. **Render Order** ⚠️ (needs optimization)

## References
- Three.js Performance Guide: https://threejs.org/manual/#en/optimize-lots-of-objects
- InstancedMesh API: https://threejs.org/docs/#api/en/objects/InstancedMesh
- BufferAttribute Updates: https://threejs.org/manual/#en/how-to-update-things
- Frustum Culling: https://threejs.org/docs/#api/en/math/Frustum

