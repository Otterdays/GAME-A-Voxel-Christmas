import * as THREE from 'three';

export class ParticleManager {
    constructor(scene, SCENE_OPTS) {
        this.scene = scene;
        this.SCENE_OPTS = SCENE_OPTS;
        this.snowSystem = null;
        this.snowVelocities = [];
        this.leafSystem = null;
        this.leafData = [];
        this.snowEnabled = true;
        this.leavesEnabled = true;

        this.initSnow();
        this.initLeaves();
    }

    initSnow() {
        const geo = new THREE.BufferGeometry();
        const positions = [];
        this.snowVelocities = [];
        const spread = this.SCENE_OPTS.worldRadius * 2.5;

        for (let i = 0; i < this.SCENE_OPTS.snowCount; i++) {
            positions.push(
                (Math.random() - 0.5) * spread,
                Math.random() * 30,
                (Math.random() - 0.5) * spread
            );
            this.snowVelocities.push(0.05 + Math.random() * 0.1);
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            color: 0xeeeeee, size: 0.25, transparent: true, opacity: 0.8
        });
        this.snowSystem = new THREE.Points(geo, mat);
        this.scene.add(this.snowSystem);
    }

    initLeaves() {
        const geo = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        this.leafData = [];
        const palette = [
            new THREE.Color(0xd6562b), new THREE.Color(0xe0a83c),
            new THREE.Color(0x8f5e30), new THREE.Color(0xbf2a2a)
        ];

        const spread = this.SCENE_OPTS.worldRadius * 2.2;

        for (let i = 0; i < this.SCENE_OPTS.leafCount; i++) {
            positions.push(
                (Math.random() - 0.5) * spread,
                Math.random() * 15 + 5,
                (Math.random() - 0.5) * spread
            );
            const col = palette[Math.floor(Math.random() * palette.length)];
            colors.push(col.r, col.g, col.b);
            this.leafData.push({
                speedY: 0.01 + Math.random() * 0.03,
                swayFreq: 0.002 + Math.random() * 0.002,
                swayAmp: 0.02 + Math.random() * 0.03,
                phase: Math.random() * Math.PI * 2
            });
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        const mat = new THREE.PointsMaterial({
            size: 0.4, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true
        });
        this.leafSystem = new THREE.Points(geo, mat);
        this.scene.add(this.leafSystem);
    }

    update() {
        // PERFORMANCE: Only update if systems exist and are enabled
        if (!this.snowSystem && !this.leafSystem) return;
        
        const now = Date.now();

        if (this.snowSystem && this.snowEnabled !== false) {
            const pos = this.snowSystem.geometry.attributes.position.array;
            const snowCount = this.SCENE_OPTS.snowCount;
            
            // OPTIMIZED: Batch updates in single loop
            for (let i = 0; i < snowCount; i++) {
                const idx = i * 3;
                pos[idx + 1] -= this.snowVelocities[i];
                pos[idx] += Math.sin(now * 0.001 + i) * 0.01;
                if (pos[idx + 1] < -2) pos[idx + 1] = 30;
            }
            // Only mark needsUpdate once after all updates
            this.snowSystem.geometry.attributes.position.needsUpdate = true;
        }

        if (this.leafSystem && this.leavesEnabled !== false) {
            const pos = this.leafSystem.geometry.attributes.position.array;
            const spread = this.SCENE_OPTS.worldRadius * 2.2;
            const leafCount = this.SCENE_OPTS.leafCount;
            
            // OPTIMIZED: Batch updates in single loop
            for (let i = 0; i < leafCount; i++) {
                const idx = i * 3;
                const data = this.leafData[i];
                pos[idx + 1] -= data.speedY;
                pos[idx] += Math.sin(now * data.swayFreq + data.phase) * data.swayAmp;
                pos[idx + 2] += Math.cos(now * data.swayFreq + data.phase) * data.swayAmp;

                if (pos[idx + 1] < 0) {
                    pos[idx + 1] = 15 + Math.random() * 5;
                    pos[idx] = (Math.random() - 0.5) * spread;
                    pos[idx + 2] = (Math.random() - 0.5) * spread;
                }
            }
            // Only mark needsUpdate once after all updates
            this.leafSystem.geometry.attributes.position.needsUpdate = true;
        }
    }

    setSnowEnabled(enabled) {
        this.snowEnabled = enabled;
        if (this.snowSystem) {
            this.snowSystem.visible = enabled;
        }
    }

    setLeavesEnabled(enabled) {
        this.leavesEnabled = enabled;
        if (this.leafSystem) {
            this.leafSystem.visible = enabled;
        }
    }
}
