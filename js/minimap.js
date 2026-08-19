import { getHeightmap, getWorldMeta } from './heightmap.js';
import { getTreePositions } from './tree-gen.js';

const VIEW_RADIUS = 72;

export class MiniMap {
    constructor(rootEl, canvas) {
        this.rootEl = rootEl;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.worldCanvas = document.createElement('canvas');
        this.ready = false;
        this._color = new Uint8ClampedArray(4);
    }

    build() {
        const meta = getWorldMeta();
        const heightmap = getHeightmap();
        if (!heightmap || !meta) {
            this.ready = false;
            return;
        }

        const size = meta.size;
        this.worldCanvas.width = size;
        this.worldCanvas.height = size;
        const ctx = this.worldCanvas.getContext('2d');
        const image = ctx.createImageData(size, size);
        const data = image.data;

        for (let z = 0; z < size; z++) {
            for (let x = 0; x < size; x++) {
                const h = heightmap[z * size + x];
                const i = (z * size + x) * 4;
                const onBorder = x < meta.borderWidth || x >= size - meta.borderWidth
                    || z < meta.borderWidth || z >= size - meta.borderWidth;
                if (onBorder) {
                    data[i] = 110;
                    data[i + 1] = 140;
                    data[i + 2] = 170;
                } else {
                    const shade = Math.max(0, Math.min(40, h * 6));
                    data[i] = 210 + shade;
                    data[i + 1] = 225 + Math.min(30, shade);
                    data[i + 2] = 235;
                }
                data[i + 3] = 255;
            }
        }

        const trees = getTreePositions();
        for (const tree of trees) {
            const px = tree.x - meta.min;
            const pz = tree.z - meta.min;
            if (px < 0 || pz < 0 || px >= size || pz >= size) continue;
            const i = (pz * size + px) * 4;
            if (tree.decorated) {
                data[i] = 30;
                data[i + 1] = 150;
                data[i + 2] = 70;
            } else {
                data[i] = 20;
                data[i + 1] = 90;
                data[i + 2] = 45;
            }
        }

        const houseR = 3;
        const cx = -meta.min;
        const cz = -meta.min;
        for (let z = cz - houseR; z <= cz + houseR; z++) {
            for (let x = cx - houseR; x <= cx + houseR; x++) {
                if (x < 0 || z < 0 || x >= size || z >= size) continue;
                const i = (z * size + x) * 4;
                data[i] = 170;
                data[i + 1] = 110;
                data[i + 2] = 60;
            }
        }

        ctx.putImageData(image, 0, 0);
        this.meta = meta;
        this.ready = true;
        const label = this.rootEl.querySelector('.minimap-size-label');
        if (label) label.textContent = `${meta.size} × ${meta.size}`;
    }

    setVisible(visible) {
        if (!this.rootEl) return;
        this.rootEl.classList.toggle('minimap-hidden', !visible);
        this.rootEl.classList.toggle('minimap-visible', visible);
    }

    update(playerX, playerZ, yaw) {
        if (!this.ready || !this.ctx || !this.meta) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const c = w / 2;
        const meta = this.meta;
        const scale = (w * 0.5) / VIEW_RADIUS;

        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.beginPath();
        ctx.arc(c, c, c - 3, 0, Math.PI * 2);
        ctx.clip();

        ctx.translate(c, c);
        ctx.rotate(-yaw);
        ctx.scale(scale, scale);
        ctx.drawImage(
            this.worldCanvas,
            -(playerX - meta.min),
            -(playerZ - meta.min)
        );
        ctx.restore();

        ctx.beginPath();
        ctx.arc(c, c, c - 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(180, 220, 255, 0.85)';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.save();
        ctx.translate(c, c);
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(5, 7);
        ctx.lineTo(0, 4);
        ctx.lineTo(-5, 7);
        ctx.closePath();
        ctx.fillStyle = '#ff4d4d';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.2;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

export function getPlayerYaw(camera, forward) {
    camera.getWorldDirection(forward);
    return Math.atan2(forward.x, -forward.z);
}
