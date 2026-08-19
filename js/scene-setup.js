import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PEAK_HEIGHT } from './config.js';

export function createRenderer({ antialias = true, pixelRatio = Math.min(window.devicePixelRatio, 2) } = {}) {
    const renderer = new THREE.WebGLRenderer({ antialias });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(pixelRatio);
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.domElement.id = 'game-canvas';
    
    // PERFORMANCE OPTIMIZATIONS
    renderer.sortObjects = true; // Enable object sorting for better batching
    renderer.shadowMap.enabled = false; // Disable shadows if not used (saves performance)
    renderer.physicallyCorrectLights = false; // Disable if not needed (saves calculations)
    
    return renderer;
}

export function createComposer(renderer, scene, camera) {
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5, 0.4, 0.85
    );
    bloomPass.threshold = 0.4;
    bloomPass.strength = 0.7;
    bloomPass.radius = 0.5;
    composer.addPass(bloomPass);

    composer.addPass(new OutputPass());
    return composer;
}

export function setupScene(SCENE_OPTS) {
    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SCENE_OPTS.bgColor);
    // Fog controlled by video settings panel - defaults to off for menu visibility
    // Created dynamically via updateVideoSettings() when fog toggle is enabled
    // scene.fog = new THREE.FogExp2(SCENE_OPTS.bgColor, 0.007);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(75, 45, 75);

    // 3. Renderer
    const renderer = createRenderer();
    document.body.appendChild(renderer.domElement);

    // 4. Lighting
    const ambient = new THREE.AmbientLight(0x404070, 0.6);
    scene.add(ambient);

    const moonLight = new THREE.DirectionalLight(0xaaccff, 1.2);
    moonLight.position.set(20, 50, -20);
    scene.add(moonLight);

    // 5. Post Processing
    const composer = createComposer(renderer, scene, camera);

    // 6. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;
    controls.target.set(0, PEAK_HEIGHT / 2, 0);

    return { scene, camera, renderer, composer, controls };
}
