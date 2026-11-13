import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import earthAlbedoUrl from '../../assets/images/earth_albedo_map_1794607324392.jpg';
import { COSMIC_ENVIRONMENTS } from './progression';
import {
  CosmicEnvironmentId,
  GameSimulation,
  MeteorEntity,
} from './types';

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _quatA = new THREE.Quaternion();
const _mat4 = new THREE.Matrix4();
const _scaleVec = new THREE.Vector3();
const _upVec = new THREE.Vector3(0, 1, 0);

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  rot: number;
  spin: number;
  color: THREE.Color;
}

interface ShootingStar {
  mesh: THREE.Mesh;
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface MeteorVisual {
  group: THREE.Group;
  coreMat: THREE.MeshStandardMaterial;
  accentMat: THREE.MeshStandardMaterial;
  wakeMesh: THREE.Mesh;
  wakeMat: THREE.MeshBasicMaterial;
  hitSphere: THREE.Mesh;
}

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function valueNoise2(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbmTileable(u: number, v: number, octaves = 5): number {
  let val = 0;
  let amp = 0.5;
  let freqX = 6;
  let freqY = 4;
  for (let i = 0; i < octaves; i++) {
    // Seamless wrap along U via periodic sampling
    const angle = u * Math.PI * 2;
    const nx = Math.cos(angle) * (freqX * 0.45) + 12.4;
    const nz = Math.sin(angle) * (freqX * 0.45) + 7.1;
    val += amp * valueNoise2(nx + v * freqY * 0.4, nz + v * freqY);
    freqX *= 2.0;
    freqY *= 2.0;
    amp *= 0.5;
  }
  return val;
}

function createProceduralCloudTexture(maxAniso: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const data = img.data;

  for (let y = 0; y < h; y++) {
    const v = y / h;
    const latBoost = Math.sin(v * Math.PI); // fewer dense clouds right at poles
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const swirl = fbmTileable(u + Math.sin(v * Math.PI * 2) * 0.04, v, 5);
      const wisps = fbmTileable(u * 2.1 + 0.3, v * 1.6, 3);
      const density = swirl * 0.72 + wisps * 0.28;
      const threshold = 0.49 - latBoost * 0.06;
      const alpha = Math.max(0, Math.min(1, (density - threshold) / 0.24));
      const idx = (y * w + x) * 4;
      data[idx] = 248;
      data[idx + 1] = 251;
      data[idx + 2] = 255;
      data[idx + 3] = Math.round(Math.pow(alpha, 1.35) * 235);
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

function createFallbackEarthTextures(maxAniso: number): {
  albedo: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
  night: THREE.CanvasTexture;
} {
  const w = 512;
  const h = 256;
  const albedoC = document.createElement('canvas');
  const roughC = document.createElement('canvas');
  const bumpC = document.createElement('canvas');
  const nightC = document.createElement('canvas');
  for (const c of [albedoC, roughC, bumpC, nightC]) {
    c.width = w;
    c.height = h;
  }

  const aCtx = albedoC.getContext('2d')!;
  const rCtx = roughC.getContext('2d')!;
  const bCtx = bumpC.getContext('2d')!;
  const nCtx = nightC.getContext('2d')!;

  const aImg = aCtx.createImageData(w, h);
  const rImg = rCtx.createImageData(w, h);
  const bImg = bCtx.createImageData(w, h);
  const nImg = nCtx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    const v = y / h;
    const lat = Math.abs(v - 0.5) * 2;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const idx = (y * w + x) * 4;
      const cont = fbmTileable(u, v, 5);
      const isPolar = lat > 0.84 + (cont - 0.5) * 0.14;
      const isLand = cont > 0.51;

      if (isPolar) {
        aImg.data[idx] = 232;
        aImg.data[idx + 1] = 240;
        aImg.data[idx + 2] = 248;
        rImg.data[idx] = rImg.data[idx + 1] = rImg.data[idx + 2] = 175;
        bImg.data[idx] = bImg.data[idx + 1] = bImg.data[idx + 2] = 160;
      } else if (isLand) {
        const elev = Math.min(1, (cont - 0.51) / 0.25);
        aImg.data[idx] = Math.round(48 + elev * 95);
        aImg.data[idx + 1] = Math.round(88 + elev * 68);
        aImg.data[idx + 2] = Math.round(46 + elev * 42);
        rImg.data[idx] = rImg.data[idx + 1] = rImg.data[idx + 2] = 228;
        const bVal = Math.round(135 + elev * 115);
        bImg.data[idx] = bImg.data[idx + 1] = bImg.data[idx + 2] = bVal;

        const city = hash2(Math.floor(x / 3), Math.floor(y / 3)) > 0.94 && elev < 0.45 ? 190 : 0;
        nImg.data[idx] = city;
        nImg.data[idx + 1] = Math.round(city * 0.72);
        nImg.data[idx + 2] = Math.round(city * 0.3);
      } else {
        const shelf = Math.max(0, 1 - (0.51 - cont) * 9);
        aImg.data[idx] = Math.round(10 + shelf * 18);
        aImg.data[idx + 1] = Math.round(40 + shelf * 52);
        aImg.data[idx + 2] = Math.round(92 + shelf * 58);
        rImg.data[idx] = rImg.data[idx + 1] = rImg.data[idx + 2] = 52;
        bImg.data[idx] = bImg.data[idx + 1] = bImg.data[idx + 2] = 90;
      }
      aImg.data[idx + 3] = 255;
      rImg.data[idx + 3] = 255;
      bImg.data[idx + 3] = 255;
      nImg.data[idx + 3] = 255;
    }
  }

  aCtx.putImageData(aImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);
  nCtx.putImageData(nImg, 0, 0);

  const mk = (canvas: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = maxAniso;
    return t;
  };

  return {
    albedo: mk(albedoC, true),
    roughness: mk(roughC, false),
    bump: mk(bumpC, false),
    night: mk(nightC, true),
  };
}

function buildEarthMapsFromImage(
  img: HTMLImageElement,
  maxAniso: number
): {
  albedo: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
  night: THREE.CanvasTexture;
} {
  const w = Math.min(1024, img.naturalWidth || 1024);
  const h = Math.min(512, img.naturalHeight || 512);

  const albedoC = document.createElement('canvas');
  const roughC = document.createElement('canvas');
  const bumpC = document.createElement('canvas');
  const nightC = document.createElement('canvas');
  for (const c of [albedoC, roughC, bumpC, nightC]) {
    c.width = w;
    c.height = h;
  }

  const aCtx = albedoC.getContext('2d')!;
  aCtx.drawImage(img, 0, 0, w, h);
  const aImg = aCtx.getImageData(0, 0, w, h);
  const px = aImg.data;

  // Seamlessly cross-fade horizontal wrap border (left 16px <-> right 16px)
  const seamBand = 18;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < seamBand; x++) {
      const t = x / seamBand; // 0 at seam -> 1 inside
      const leftIdx = (y * w + x) * 4;
      const rightIdx = (y * w + (w - 1 - x)) * 4;
      for (let c = 0; c < 3; c++) {
        const avg = (px[leftIdx + c] + px[rightIdx + c]) * 0.5;
        px[leftIdx + c] = Math.round(avg * (1 - t) + px[leftIdx + c] * t);
        px[rightIdx + c] = Math.round(avg * (1 - t) + px[rightIdx + c] * t);
      }
    }
  }
  aCtx.putImageData(aImg, 0, 0);

  const rCtx = roughC.getContext('2d')!;
  const bCtx = bumpC.getContext('2d')!;
  const nCtx = nightC.getContext('2d')!;
  const rImg = rCtx.createImageData(w, h);
  const bImg = bCtx.createImageData(w, h);
  const nImg = nCtx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    const latNorm = Math.abs(y / h - 0.5) * 2;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = px[idx];
      const g = px[idx + 1];
      const b = px[idx + 2];
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

      // Detect ocean vs land vs polar ice
      const isIce = lum > 0.72 && Math.abs(r - b) < 28;
      const isOcean = !isIce && b > r + 10 && b >= g - 4 && lum < 0.52;

      const roughVal = isIce ? 184 : isOcean ? 92 : 228;
      rImg.data[idx] = rImg.data[idx + 1] = rImg.data[idx + 2] = roughVal;
      rImg.data[idx + 3] = 255;

      const bumpVal = isOcean ? 80 : isIce ? 148 : Math.round(122 + lum * 128);
      bImg.data[idx] = bImg.data[idx + 1] = bImg.data[idx + 2] = bumpVal;
      bImg.data[idx + 3] = 255;

      // Night-side city lights on habitable non-polar lowlands
      if (!isOcean && !isIce && latNorm < 0.72) {
        const cluster = valueNoise2(x * 0.09, y * 0.09);
        const speck = hash2(Math.floor(x / 2), Math.floor(y / 2));
        if (cluster > 0.64 && speck > 0.87) {
          const intensity = Math.round(145 + (speck - 0.87) * 840);
          nImg.data[idx] = Math.min(255, intensity);
          nImg.data[idx + 1] = Math.min(235, Math.round(intensity * 0.76));
          nImg.data[idx + 2] = Math.round(intensity * 0.36);
        }
      }
      nImg.data[idx + 3] = 255;
    }
  }

  rCtx.putImageData(rImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);
  nCtx.putImageData(nImg, 0, 0);

  const mk = (canvas: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = maxAniso;
    t.needsUpdate = true;
    return t;
  };

  return {
    albedo: mk(albedoC, true),
    roughness: mk(roughC, false),
    bump: mk(bumpC, false),
    night: mk(nightC, true),
  };
}

function createDisplacedRockGeometry(radius: number, detail: number, seedOffset: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const n =
      Math.sin(vx * 7.2 + seedOffset) * 0.12 +
      Math.cos(vy * 8.4 - seedOffset * 1.7) * 0.11 +
      Math.sin(vz * 6.5 + seedOffset * 0.6) * 0.1;
    const scale = 1 + n;
    pos.setXYZ(i, vx * scale, vy * scale, vz * scale);
  }
  geo.computeVertexNormals();
  return geo;
}

function createCoronaSpriteTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 252, 240, 1)');
  grad.addColorStop(0.2, 'rgba(255, 232, 185, 0.72)');
  grad.addColorStop(0.55, 'rgba(130, 190, 255, 0.18)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface PlanetSceneController {
  setEnvironment: (env: CosmicEnvironmentId) => void;
  pickMeteorAtClientPos: (clientX: number, clientY: number, sim: GameSimulation) => number | null;
  spawnHitBurst: (x: number, y: number, z: number, colorHex: string, count: number) => void;
  projectWorldToScreen: (
    x: number,
    y: number,
    z: number
  ) => { x: number; y: number; visible: boolean };
  getEarthScreenBounds: () => { cx: number; cy: number; rPx: number };
  dispose: () => void;
}

export function mountPlanetScene(
  container: HTMLElement,
  getSim: () => GameSimulation,
  onStep: (dt: number) => void,
  reducedMotionRef: { current: boolean },
  screenShakeRef: { current: boolean }
): PlanetSceneController {
  // Mandatory Software WebGL probe
  const isSoftwareGl = (() => {
    const probe = document.createElement('canvas').getContext('webgl2');
    if (!probe) return true;
    const ext = probe.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
    const gpu = String(probe.getParameter(param));
    probe.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  })();

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.dataset.testid = 'game-canvas';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 140);
  const baseCameraPos = new THREE.Vector3(0, 0.15, 11.4);
  camera.position.copy(baseCameraPos);
  camera.lookAt(0, 0, 0);

  // Studio environment reflections (RoomEnvironment)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  pmremGenerator.dispose();

  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  // Warm / cool lighting rig
  const sunDirection = new THREE.Vector3(1.0, 0.36, 0.44).normalize();
  const sunLight = new THREE.DirectionalLight(0xfff5e4, 3.35);
  sunLight.position.copy(sunDirection).multiplyScalar(18);
  sunLight.castShadow = !isSoftwareGl;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.near = 4;
  sunLight.shadow.camera.far = 30;
  sunLight.shadow.camera.left = -6;
  sunLight.shadow.camera.right = 6;
  sunLight.shadow.camera.top = 6;
  sunLight.shadow.camera.bottom = -6;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);

  const hemiFill = new THREE.HemisphereLight(0x3b82f6, 0x090d1a, 0.28);
  scene.add(hemiFill);

  const rimBackLight = new THREE.DirectionalLight(0x60a5fa, 0.55);
  rimBackLight.position.set(-10, -3, -8);
  scene.add(rimBackLight);

  // -------------------------------------------------------
  // 1. COSMIC SKY DOME + STARFIELD + CORONA + SHOOTING STARS
  // -------------------------------------------------------
  const skyUniforms = {
    uTime: { value: 0 },
    uSkyTop: { value: new THREE.Color('#03060E') },
    uSkyBottom: { value: new THREE.Color('#081022') },
    uNebulaA: { value: new THREE.Color('#1D4ED8') },
    uNebulaB: { value: new THREE.Color('#0EA5E9') },
    uGalaxyCore: { value: 0.15 },
    uStormBoost: { value: 0.0 },
  };

  const skyGeo = new THREE.SphereGeometry(52, 32, 24);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: skyUniforms,
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSkyTop;
      uniform vec3 uSkyBottom;
      uniform vec3 uNebulaA;
      uniform vec3 uNebulaB;
      uniform float uGalaxyCore;
      uniform float uStormBoost;
      varying vec3 vWorldDir;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
              mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
              mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z
        );
      }

      float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p = p * 2.07 + vec3(1.7, 9.2, 4.3);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float grad = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(uSkyBottom, uSkyTop, grad);

        // Tilted galactic / nebula dust band
        float bandPlane = abs(dir.y * 0.72 - dir.x * 0.52 + 0.08);
        float bandMask = exp(-bandPlane * 3.8);
        float cloudA = fbm(dir * 2.6 + vec3(uTime * 0.008, 0.0, -uTime * 0.005));
        float cloudB = fbm(dir * 4.4 - vec3(0.0, uTime * 0.01, 0.0));

        col += uNebulaA * smoothstep(0.32, 0.85, cloudA) * (0.28 + bandMask * 0.55);
        col += uNebulaB * smoothstep(0.42, 0.9, cloudB) * (0.18 + bandMask * 0.48);

        // Optional distant spiral core
        vec3 coreDir = normalize(vec3(-0.48, 0.34, -0.81));
        float coreDot = max(0.0, dot(dir, coreDir));
        col += mix(uNebulaA, uNebulaB, 0.6) * pow(coreDot, 16.0) * uGalaxyCore;

        // Subtle lightning / storm shimmer
        float storm = sin(uTime * 1.4 + cloudB * 8.0) * 0.5 + 0.5;
        col += uNebulaB * storm * uStormBoost * smoothstep(0.55, 0.9, cloudA) * 0.25;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  // Starfield (900 spectral stars)
  const starCount = 900;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const starPalette = [
    new THREE.Color('#E0F2FE'),
    new THREE.Color('#FFFBEB'),
    new THREE.Color('#BAE6FD'),
    new THREE.Color('#FDE68A'),
  ];
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 24 + Math.random() * 20;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi);
    const c = starPalette[i % starPalette.length];
    const bright = 0.6 + Math.random() * 0.4;
    starColors[i * 3] = c.r * bright;
    starColors[i * 3 + 1] = c.g * bright;
    starColors[i * 3 + 2] = c.b * bright;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  const starMat = new THREE.PointsMaterial({
    size: 0.14,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    depthWrite: false,
  });
  const starPoints = new THREE.Points(starGeo, starMat);
  scene.add(starPoints);

  // Cosmic Dust (220 subtle foreground/midground particles)
  const dustCount = 220;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 18;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 12;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    size: 0.055,
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  scene.add(dustPoints);

  // Distant sun corona sprite
  const coronaTex = createCoronaSpriteTexture();
  const sunSpriteMat = new THREE.SpriteMaterial({
    map: coronaTex,
    color: 0xfff7e8,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const sunSprite = new THREE.Sprite(sunSpriteMat);
  sunSprite.position.copy(sunDirection).multiplyScalar(28);
  sunSprite.scale.set(4.5, 4.5, 1);
  scene.add(sunSprite);

  // Background shooting stars
  const streakGeo = new THREE.PlaneGeometry(0.95, 0.025);
  const streakMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const shootingStars: ShootingStar[] = Array.from({ length: 3 }, () => {
    const mesh = new THREE.Mesh(streakGeo, streakMat);
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, active: false, x: 0, y: 0, z: -18, vx: 0, vy: 0, life: 0, maxLife: 1 };
  });
  let shootingStarTimer = 2.4;

  // -------------------------------------------------------
  // 2. PHOTOREALISTIC PLANET EARTH + CLOUDS + ATMOSPHERE + SHIELD
  // -------------------------------------------------------
  const earthGroup = new THREE.Group();
  // Axial tilt ~23.4 deg
  earthGroup.rotation.z = THREE.MathUtils.degToRad(21.5);
  earthGroup.rotation.x = THREE.MathUtils.degToRad(7.5);
  scene.add(earthGroup);

  const initialMaps = createFallbackEarthTextures(maxAniso);
  const cloudTex = createProceduralCloudTexture(maxAniso);

  const earthUniforms = {
    uSunDir: { value: sunDirection.clone() },
    uNightMap: { value: initialMaps.night },
    uImpactFlash: { value: 0 },
    uDamageLevel: { value: 0 },
  };

  const earthGeo = new THREE.SphereGeometry(1.75, 64, 48);
  const earthMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: initialMaps.albedo,
    roughnessMap: initialMaps.roughness,
    bumpMap: initialMaps.bump,
    bumpScale: 0.032,
    roughness: 1.0,
    metalness: 0.05,
  });

  earthMat.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDir = earthUniforms.uSunDir;
    shader.uniforms.uNightMap = earthUniforms.uNightMap;
    shader.uniforms.uImpactFlash = earthUniforms.uImpactFlash;
    shader.uniforms.uDamageLevel = earthUniforms.uDamageLevel;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vWorldNorm;
         varying vec2 vEarthUv;`
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
         vWorldNorm = normalize(mat3(modelMatrix) * normal);
         vEarthUv = uv;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform vec3 uSunDir;
         uniform sampler2D uNightMap;
         uniform float uImpactFlash;
         uniform float uDamageLevel;
         varying vec3 vWorldNorm;
         varying vec2 vEarthUv;`
      )
      .replace(
        '#include <dithering_fragment>',
        `
         float sunDot = dot(normalize(vWorldNorm), normalize(uSunDir));
         // Warm twilight Rayleigh scattering band right along terminator
         float terminator = exp(-pow(sunDot * 5.2, 2.0));
         gl_FragColor.rgb += vec3(0.45, 0.16, 0.04) * terminator * 0.34;

         // Night-side city lights masked cleanly on dark hemisphere
         float nightMask = smoothstep(0.06, -0.22, sunDot);
         vec3 cityLight = texture2D(uNightMap, vEarthUv).rgb;
         gl_FragColor.rgb += cityLight * nightMask * 0.95;

         // Planetary impact flash & slight thermal damage warning
         gl_FragColor.rgb += vec3(1.0, 0.35, 0.15) * uImpactFlash * 0.36;
         gl_FragColor.rgb += vec3(0.55, 0.08, 0.04) * uDamageLevel * 0.12;
         #include <dithering_fragment>
        `
      );
  };

  const earthMesh = new THREE.Mesh(earthGeo, earthMat);
  earthMesh.rotation.y = -1.65; // Face Americas/Atlantic/Africa nicely at launch
  earthMesh.receiveShadow = !isSoftwareGl;
  earthGroup.add(earthMesh);

  // Swap in real NASA Blue Marble texture once decoded
  let activeEarthMaps = initialMaps;
  let disposed = false;
  const earthImg = new Image();
  earthImg.crossOrigin = 'anonymous';
  earthImg.onload = () => {
    if (disposed) return;
    const realMaps = buildEarthMapsFromImage(earthImg, maxAniso);
    const oldMaps = activeEarthMaps;
    activeEarthMaps = realMaps;
    earthMat.map = realMaps.albedo;
    earthMat.roughnessMap = realMaps.roughness;
    earthMat.bumpMap = realMaps.bump;
    earthUniforms.uNightMap.value = realMaps.night;
    earthMat.needsUpdate = true;
    oldMaps.albedo.dispose();
    oldMaps.roughness.dispose();
    oldMaps.bump.dispose();
    oldMaps.night.dispose();
  };
  earthImg.src = earthAlbedoUrl;

  // Natural cloud sphere
  const cloudGeo = new THREE.SphereGeometry(1.784, 56, 40);
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: cloudTex,
    transparent: true,
    opacity: 0.78,
    roughness: 0.95,
    metalness: 0.0,
    depthWrite: false,
  });
  const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
  earthGroup.add(cloudMesh);

  // Inner subtle blue daytime scattering veil (FrontSide)
  const innerAtmoGeo = new THREE.SphereGeometry(1.798, 48, 36);
  const innerAtmoUniforms = {
    uSunDir: { value: sunDirection.clone() },
    uRimTint: { value: new THREE.Color('#4DA6FF') },
    uDamageLevel: { value: 0 },
    uImpactFlash: { value: 0 },
  };
  const innerAtmoMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: innerAtmoUniforms,
    vertexShader: `
      varying vec3 vNormalWorld;
      varying vec3 vViewDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vNormalWorld = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      uniform vec3 uRimTint;
      uniform float uDamageLevel;
      uniform float uImpactFlash;
      varying vec3 vNormalWorld;
      varying vec3 vViewDir;
      void main() {
        float fresnel = pow(1.0 - max(0.0, dot(vNormalWorld, vViewDir)), 3.2);
        float sunMask = smoothstep(-0.25, 0.75, dot(vNormalWorld, normalize(uSunDir)));
        vec3 baseCol = mix(uRimTint, vec3(1.0, 0.28, 0.18), clamp(uDamageLevel * 0.65 + uImpactFlash * 0.85, 0.0, 1.0));
        float alpha = fresnel * (0.28 + sunMask * 0.58) + uImpactFlash * fresnel * 0.45;
        gl_FragColor = vec4(baseCol, clamp(alpha, 0.0, 0.85));
      }
    `,
  });
  const innerAtmoMesh = new THREE.Mesh(innerAtmoGeo, innerAtmoMat);
  earthGroup.add(innerAtmoMesh);

  // Outer Rayleigh atmospheric halo (BackSide)
  const outerAtmoGeo = new THREE.SphereGeometry(1.94, 48, 36);
  const outerAtmoMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: innerAtmoUniforms,
    vertexShader: `
      varying vec3 vNormalWorld;
      varying vec3 vViewDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vNormalWorld = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      uniform vec3 uRimTint;
      uniform float uDamageLevel;
      uniform float uImpactFlash;
      varying vec3 vNormalWorld;
      varying vec3 vViewDir;
      void main() {
        float intensity = pow(0.66 - dot(vNormalWorld, vViewDir), 3.4);
        float sunSide = smoothstep(-0.35, 0.65, dot(-vNormalWorld, normalize(uSunDir)));
        vec3 haloCol = mix(uRimTint, vec3(1.0, 0.3, 0.16), clamp(uDamageLevel * 0.7 + uImpactFlash * 0.9, 0.0, 1.0));
        float alpha = max(0.0, intensity) * (0.22 + sunSide * 0.55);
        gl_FragColor = vec4(haloCol, clamp(alpha, 0.0, 0.72));
      }
    `,
  });
  const outerAtmoMesh = new THREE.Mesh(outerAtmoGeo, outerAtmoMat);
  earthGroup.add(outerAtmoMesh);

  // Translucent Planetary Energy Shield sphere with hexagonal lattice & impact ripples
  const shieldUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uRipple: { value: 0 },
  };
  const shieldGeo = new THREE.SphereGeometry(2.08, 42, 30);
  const shieldMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: shieldUniforms,
    vertexShader: `
      varying vec3 vNorm;
      varying vec3 vView;
      varying vec3 vLocalPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vNorm = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - wp.xyz);
        vLocalPos = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform float uRipple;
      varying vec3 vNorm;
      varying vec3 vView;
      varying vec3 vLocalPos;
      void main() {
        if (uOpacity <= 0.005) discard;
        float viewDot = abs(dot(vNorm, vView));
        float rim = pow(1.0 - viewDot, 2.8);
        float scan = smoothstep(0.95, 1.0, sin(vLocalPos.y * 28.0 - uTime * 3.0)) * 0.24 * (1.0 - viewDot * 0.6);
        float shimmer = (sin(vLocalPos.x * 14.0 + uTime * 2.2) * cos(vLocalPos.z * 14.0 - uTime * 1.8)) * 0.08 + 0.92;
        float pulse = 0.9 + 0.1 * sin(uTime * 4.5) + uRipple * 1.1;
        vec3 col = mix(vec3(0.22, 0.74, 0.97), vec3(0.75, 0.96, 1.0), rim + uRipple * 0.5);
        float alpha = (rim * 0.85 + scan + 0.045) * shimmer * uOpacity * pulse;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.82));
      }
    `,
  });
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.visible = false;
  earthGroup.add(shieldMesh);

  // Gravity Field singularity vortex mesh
  const gravityGroup = new THREE.Group();
  const gravCoreGeo = new THREE.SphereGeometry(0.18, 16, 12);
  const gravCoreMat = new THREE.MeshBasicMaterial({ color: 0x312e81 });
  const gravRingGeo = new THREE.TorusGeometry(0.48, 0.025, 10, 32);
  const gravRingMat = new THREE.MeshBasicMaterial({
    color: 0x818cf8,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
  });
  gravityGroup.add(new THREE.Mesh(gravCoreGeo, gravCoreMat));
  const gravRingA = new THREE.Mesh(gravRingGeo, gravRingMat);
  const gravRingB = new THREE.Mesh(gravRingGeo, gravRingMat);
  gravRingB.rotation.x = Math.PI * 0.42;
  gravityGroup.add(gravRingA, gravRingB);
  gravityGroup.visible = false;
  scene.add(gravityGroup);

  // -------------------------------------------------------
  // 3. SHARED METEOR GEOMETRIES + COMPOSITE 3-PART FACTORIES
  // -------------------------------------------------------
  const sharedGeos = {
    rockCore: createDisplacedRockGeometry(1.0, 1, 1.2),
    rockHeavy: createDisplacedRockGeometry(1.0, 2, 3.7),
    shard: createDisplacedRockGeometry(0.28, 0, 5.1),
    armorPlate: new THREE.BoxGeometry(0.76, 0.24, 0.76),
    volatileRing: new THREE.TorusGeometry(1.08, 0.085, 8, 24),
    cosmicCore: new THREE.OctahedronGeometry(0.95, 0),
    cosmicRing: new THREE.TorusGeometry(1.36, 0.055, 8, 28),
    wakeCone: new THREE.ConeGeometry(0.88, 2.5, 12, 1, true),
    hitProxy: new THREE.SphereGeometry(1.45, 10, 8),
    shockRing: new THREE.RingGeometry(0.78, 1.0, 32),
    laserCyl: new THREE.CylinderGeometry(0.032, 0.032, 1, 8),
  };

  // Shift wakeCone so apex is near rock and tail extends along +Y
  sharedGeos.wakeCone.translate(0, 1.15, 0);

  const hitProxyMat = new THREE.MeshBasicMaterial({ visible: false });
  const meteorVisuals = new Map<number, MeteorVisual>();
  const interactableProxies: THREE.Mesh[] = [];

  function createMeteorVisual(m: MeteorEntity): MeteorVisual {
    const group = new THREE.Group();
    const s = m.radius;

    let coreColor = 0x6b5c52;
    let accentColor = 0xf97316;
    let wakeColor = 0xfb923c;
    let coreRough = 0.9;
    let coreMetal = 0.08;
    let accentRough = 0.35;
    let accentMetal = 0.2;
    let accentEmissive = 0xea580c;

    switch (m.type) {
      case 'heavy':
        coreColor = 0x4b423c;
        accentColor = 0xf59e0b;
        wakeColor = 0xf97316;
        accentEmissive = 0xd97706;
        break;
      case 'armored':
        coreColor = 0x334155;
        accentColor = 0x94a3b8;
        wakeColor = 0x60a5fa;
        coreRough = 0.75;
        accentRough = 0.24;
        accentMetal = 0.86;
        accentEmissive = 0x1e293b;
        break;
      case 'splitting':
        coreColor = 0x57534e;
        accentColor = 0xfbbf24;
        wakeColor = 0xfacc15;
        accentEmissive = 0xf59e0b;
        break;
      case 'explosive':
        coreColor = 0x3f2724;
        accentColor = 0xf43f5e;
        wakeColor = 0xef4444;
        accentEmissive = 0xef4444;
        break;
      case 'cosmic':
        coreColor = 0x0284c7;
        accentColor = 0xa78bfa;
        wakeColor = 0x38bdf8;
        coreRough = 0.16;
        coreMetal = 0.55;
        accentRough = 0.22;
        accentMetal = 0.65;
        accentEmissive = 0x38bdf8;
        break;
      case 'regular':
      default:
        break;
    }

    const coreMat = new THREE.MeshStandardMaterial({
      color: coreColor,
      roughness: coreRough,
      metalness: coreMetal,
      emissive: m.type === 'cosmic' ? 0x0ea5e9 : 0x2a140c,
      emissiveIntensity: m.type === 'cosmic' ? 0.45 : 0.15,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: accentRough,
      metalness: accentMetal,
      emissive: accentEmissive,
      emissiveIntensity: m.type === 'armored' ? 0.18 : 0.75,
    });
    const wakeMat = new THREE.MeshBasicMaterial({
      color: wakeColor,
      transparent: true,
      opacity: m.type === 'cosmic' ? 0.42 : 0.32,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Build distinct composite silhouette per category
    if (m.type === 'cosmic') {
      const crystal = new THREE.Mesh(sharedGeos.cosmicCore, coreMat);
      crystal.scale.setScalar(s);
      const ringA = new THREE.Mesh(sharedGeos.cosmicRing, accentMat);
      ringA.scale.setScalar(s);
      ringA.rotation.x = Math.PI * 0.35;
      const ringB = new THREE.Mesh(sharedGeos.cosmicRing, accentMat);
      ringB.scale.setScalar(s * 0.82);
      ringB.rotation.y = Math.PI * 0.45;
      group.add(crystal, ringA, ringB);
    } else if (m.type === 'armored') {
      const core = new THREE.Mesh(sharedGeos.rockHeavy, coreMat);
      core.scale.setScalar(s * 0.92);
      group.add(core);
      const offsets: Array<[number, number, number]> = [
        [0.52, 0.38, 0.2],
        [-0.52, -0.34, 0.18],
        [0.15, -0.52, -0.42],
        [-0.2, 0.48, -0.42],
      ];
      for (const [ox, oy, oz] of offsets) {
        const plate = new THREE.Mesh(sharedGeos.armorPlate, accentMat);
        plate.scale.setScalar(s);
        plate.position.set(ox * s, oy * s, oz * s);
        plate.lookAt(ox * 2, oy * 2, oz * 2);
        group.add(plate);
      }
    } else if (m.type === 'explosive') {
      const core = new THREE.Mesh(sharedGeos.rockCore, coreMat);
      core.scale.setScalar(s);
      const bandA = new THREE.Mesh(sharedGeos.volatileRing, accentMat);
      bandA.scale.setScalar(s * 0.96);
      bandA.rotation.x = 0.7;
      const bandB = new THREE.Mesh(sharedGeos.volatileRing, accentMat);
      bandB.scale.setScalar(s * 0.96);
      bandB.rotation.y = 0.95;
      group.add(core, bandA, bandB);
    } else if (m.type === 'splitting') {
      const lobeA = new THREE.Mesh(sharedGeos.rockCore, coreMat);
      lobeA.scale.set(s * 0.76, s * 0.88, s * 0.76);
      lobeA.position.x = -s * 0.32;
      const lobeB = new THREE.Mesh(sharedGeos.rockCore, coreMat);
      lobeB.scale.set(s * 0.72, s * 0.85, s * 0.72);
      lobeB.position.x = s * 0.34;
      const seam = new THREE.Mesh(sharedGeos.volatileRing, accentMat);
      seam.scale.setScalar(s * 0.85);
      seam.rotation.y = Math.PI * 0.5;
      group.add(lobeA, lobeB, seam);
    } else if (m.type === 'heavy') {
      const hull = new THREE.Mesh(sharedGeos.rockHeavy, coreMat);
      hull.scale.setScalar(s);
      const ridgeA = new THREE.Mesh(sharedGeos.rockCore, coreMat);
      ridgeA.scale.setScalar(s * 0.56);
      ridgeA.position.set(s * 0.48, s * 0.25, s * 0.15);
      const magmaCore = new THREE.Mesh(sharedGeos.volatileRing, accentMat);
      magmaCore.scale.setScalar(s * 0.88);
      magmaCore.rotation.set(0.6, 0.4, 0.2);
      const shard = new THREE.Mesh(sharedGeos.shard, accentMat);
      shard.scale.setScalar(s * 1.1);
      shard.position.set(-s * 0.78, s * 0.35, 0);
      group.add(hull, ridgeA, magmaCore, shard);
    } else {
      // Regular meteor: primary rock body + glowing crater vein + trailing pebble shards
      const hull = new THREE.Mesh(sharedGeos.rockCore, coreMat);
      hull.scale.setScalar(s);
      const shardA = new THREE.Mesh(sharedGeos.shard, coreMat);
      shardA.scale.setScalar(s * 1.15);
      shardA.position.set(s * 0.82, s * 0.35, -s * 0.2);
      const glowVein = new THREE.Mesh(sharedGeos.shard, accentMat);
      glowVein.scale.setScalar(s * 0.82);
      glowVein.position.set(-s * 0.42, -s * 0.25, s * 0.35);
      group.add(hull, shardA, glowVein);
    }

    // Fiery exhaust wake oriented opposite velocity each frame
    const wakeMesh = new THREE.Mesh(sharedGeos.wakeCone, wakeMat);
    wakeMesh.scale.set(s * 0.85, s * 1.45, s * 0.85);
    scene.add(wakeMesh);

    // Invisible slightly larger proxy for crisp raycasting
    const hitSphere = new THREE.Mesh(sharedGeos.hitProxy, hitProxyMat);
    hitSphere.scale.setScalar(s);
    hitSphere.userData.meteorId = m.id;
    group.add(hitSphere);
    interactableProxies.push(hitSphere);

    group.position.set(m.x, m.y, m.z);
    scene.add(group);

    return {
      group,
      coreMat,
      accentMat,
      wakeMesh,
      wakeMat,
      hitSphere,
    };
  }

  // Pooled shockwaves (max 18) & laser beams (max 10)
  const shockwavePool: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }> = Array.from(
    { length: 18 },
    () => {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(sharedGeos.shockRing, mat);
      mesh.visible = false;
      scene.add(mesh);
      return { mesh, mat };
    }
  );

  const laserPool: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }> = Array.from(
    { length: 10 },
    () => {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(sharedGeos.laserCyl, mat);
      mesh.visible = false;
      scene.add(mesh);
      return { mesh, mat };
    }
  );

  // Zero-GC InstancedMesh Particle Pool (160 debris & spark shards)
  const MAX_PARTICLES = 160;
  const particleGeo = new THREE.OctahedronGeometry(0.065, 0);
  const particleMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.92,
  });
  const particleInstanced = new THREE.InstancedMesh(particleGeo, particleMat, MAX_PARTICLES);
  particleInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  particleInstanced.frustumCulled = false;
  scene.add(particleInstanced);

  const particles: ParticleSlot[] = Array.from({ length: MAX_PARTICLES }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    maxLife: 0.5,
    scale: 0,
    rot: 0,
    spin: 0,
    color: new THREE.Color(0xfb923c),
  }));
  let particleCursor = 0;

  // Initialize hidden matrices so no stray unit mesh renders at origin
  _mat4.makeScale(0, 0, 0);
  for (let i = 0; i < MAX_PARTICLES; i++) {
    particleInstanced.setMatrixAt(i, _mat4);
    particleInstanced.setColorAt(i, particles[i].color);
  }
  particleInstanced.instanceMatrix.needsUpdate = true;
  if (particleInstanced.instanceColor) particleInstanced.instanceColor.needsUpdate = true;

  const spawnHitBurst = (x: number, y: number, z: number, colorHex: string, count: number) => {
    const burstColor = new THREE.Color(colorHex);
    for (let i = 0; i < count; i++) {
      const slot = particles[particleCursor];
      particleCursor = (particleCursor + 1) % MAX_PARTICLES;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 1.4 + Math.random() * 3.2;
      slot.active = true;
      slot.x = x;
      slot.y = y;
      slot.z = z;
      slot.vx = Math.sin(phi) * Math.cos(theta) * speed;
      slot.vy = Math.sin(phi) * Math.sin(theta) * speed;
      slot.vz = Math.cos(phi) * speed * 0.7;
      slot.maxLife = 0.35 + Math.random() * 0.45;
      slot.life = slot.maxLife;
      slot.scale = 0.7 + Math.random() * 1.1;
      slot.rot = Math.random() * Math.PI;
      slot.spin = (Math.random() - 0.5) * 9;
      slot.color.copy(burstColor);
    }
  };

  const applyEnvironment = (envId: CosmicEnvironmentId) => {
    const meta = COSMIC_ENVIRONMENTS[envId] ?? COSMIC_ENVIRONMENTS.deep_space;
    skyUniforms.uSkyTop.value.set(meta.skyTop);
    skyUniforms.uSkyBottom.value.set(meta.skyBottom);
    skyUniforms.uNebulaA.value.set(meta.nebulaPrimary);
    skyUniforms.uNebulaB.value.set(meta.nebulaSecondary);
    skyUniforms.uGalaxyCore.value = envId === 'distant_galaxy' ? 1.15 : envId === 'nebula' ? 0.55 : 0.15;
    skyUniforms.uStormBoost.value = envId === 'cosmic_storm' ? 1.0 : 0.0;

    sunLight.color.set(meta.sunColor);
    sunLight.intensity = meta.sunIntensity;
    sunSpriteMat.color.set(meta.sunColor);
    innerAtmoUniforms.uRimTint.value.set(meta.rimTint);
  };

  applyEnvironment(getSim().environment);

  // ResizeObserver for crisp responsive projection
  let viewportW = Math.max(320, container.clientWidth);
  let viewportH = Math.max(320, container.clientHeight);
  const updateSize = () => {
    const rect = container.getBoundingClientRect();
    viewportW = Math.max(320, rect.width || window.innerWidth);
    viewportH = Math.max(320, rect.height || window.innerHeight);
    camera.aspect = viewportW / viewportH;
    // Pull camera back smoothly on narrow portrait screens so orbital approaches stay visible
    baseCameraPos.z = camera.aspect < 0.85 ? 14.6 : camera.aspect < 1.15 ? 12.6 : 11.4;
    camera.updateProjectionMatrix();
    renderer.setSize(viewportW, viewportH, false);
  };
  updateSize();
  const resizeObserver = new ResizeObserver(updateSize);
  resizeObserver.observe(container);

  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  // Pre-render first frame immediately so first paint is lush
  renderer.render(scene, camera);

  // Sync visual meshes to simulation state
  const seenIds = new Set<number>();
  const raycaster = new THREE.Raycaster();
  const ndcPointer = new THREE.Vector2();

  const pickMeteorAtClientPos = (
    clientX: number,
    clientY: number,
    sim: GameSimulation
  ): number | null => {
    const rect = renderer.domElement.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    ndcPointer.x = (px / rect.width) * 2 - 1;
    ndcPointer.y = -(py / rect.height) * 2 + 1;

    raycaster.setFromCamera(ndcPointer, camera);
    const hits = raycaster.intersectObjects(interactableProxies, false);
    if (hits.length > 0) {
      const id = hits[0].object.userData.meteorId as number | undefined;
      if (id !== undefined) return id;
    }

    // Screen-space proximity fallback (<= 42px) for fast-moving or small fragments
    let bestId: number | null = null;
    let bestDistPx = 42;
    for (const m of sim.meteors) {
      if (m.destroyed) continue;
      _vec3A.set(m.x, m.y, m.z).project(camera);
      if (_vec3A.z < -1 || _vec3A.z > 1) continue;
      const sx = (_vec3A.x * 0.5 + 0.5) * rect.width;
      const sy = (-_vec3A.y * 0.5 + 0.5) * rect.height;
      const d = Math.hypot(sx - px, sy - py);
      const radiusAllowance = Math.max(30, m.hitRadius * 52);
      if (d <= radiusAllowance && d < bestDistPx) {
        bestDistPx = d;
        bestId = m.id;
      }
    }
    return bestId;
  };

  const projectWorldToScreen = (x: number, y: number, z: number) => {
    _vec3A.set(x, y, z).project(camera);
    const visible = _vec3A.z >= -1 && _vec3A.z <= 1;
    return {
      x: (_vec3A.x * 0.5 + 0.5) * viewportW,
      y: (-_vec3A.y * 0.5 + 0.5) * viewportH,
      visible,
    };
  };

  const getEarthScreenBounds = () => {
    const center = projectWorldToScreen(0, 0, 0);
    const edge = projectWorldToScreen(1.75, 0, 0);
    return {
      cx: center.x,
      cy: center.y,
      rPx: Math.abs(edge.x - center.x),
    };
  };

  // Render Loop (with Software-WebGL afterDraw pacing)
  let frameId = 0;
  let lastTime = performance.now();
  let elapsed = 0;

  function afterDraw(cb: () => void) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  }

  const updateVisuals = (dt: number, sim: GameSimulation) => {
    elapsed += dt;
    skyUniforms.uTime.value = elapsed;

    // Gentle planetary rotation & clouds drift
    const rotMul = reducedMotionRef.current ? 0.3 : 1.0;
    earthMesh.rotation.y += dt * 0.042 * rotMul;
    cloudMesh.rotation.y += dt * 0.056 * rotMul;

    const damageRatio = Math.max(0, 1 - sim.session.planetHp / Math.max(1, sim.session.maxPlanetHp));
    earthUniforms.uImpactFlash.value = sim.planetImpactFlash;
    earthUniforms.uDamageLevel.value = damageRatio;
    innerAtmoUniforms.uImpactFlash.value = sim.planetImpactFlash;
    innerAtmoUniforms.uDamageLevel.value = damageRatio;

    // Planetary Shield visual state
    const shieldSlot = sim.powerUps.shield;
    const shieldActive = shieldSlot.activeRemaining > 0;
    if (shieldActive) {
      shieldMesh.visible = true;
      const fade = Math.min(1, shieldSlot.activeRemaining / 1.2);
      shieldUniforms.uTime.value = elapsed;
      shieldUniforms.uOpacity.value = fade;
      shieldUniforms.uRipple.value = sim.shieldRippleTimer;
    } else {
      shieldMesh.visible = false;
      shieldUniforms.uOpacity.value = 0;
    }

    // Gravity singularity visual
    if (sim.gravityTarget && sim.powerUps.gravity_field.activeRemaining > 0) {
      gravityGroup.visible = true;
      gravityGroup.position.set(sim.gravityTarget.x, sim.gravityTarget.y, sim.gravityTarget.z);
      gravRingA.rotation.z += dt * 3.8;
      gravRingB.rotation.y += dt * 4.4;
    } else {
      gravityGroup.visible = false;
    }

    // Subtle cosmic starfield rotation & shooting stars
    starPoints.rotation.y += dt * 0.008 * rotMul;
    dustPoints.rotation.y -= dt * 0.014 * rotMul;

    shootingStarTimer -= dt;
    if (shootingStarTimer <= 0 && !reducedMotionRef.current) {
      shootingStarTimer = 2.5 + Math.random() * 4.5;
      const slot = shootingStars.find((s) => !s.active);
      if (slot) {
        slot.active = true;
        slot.x = (Math.random() - 0.5) * 22;
        slot.y = 4 + Math.random() * 6;
        slot.z = -14 - Math.random() * 10;
        slot.vx = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 7);
        slot.vy = -(4 + Math.random() * 4);
        slot.maxLife = 0.65;
        slot.life = slot.maxLife;
        slot.mesh.visible = true;
        slot.mesh.rotation.z = Math.atan2(slot.vy, slot.vx);
      }
    }
    for (const s of shootingStars) {
      if (!s.active) continue;
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.mesh.position.set(s.x, s.y, s.z);
      if (s.life <= 0) {
        s.active = false;
        s.mesh.visible = false;
      }
    }

    // Sync active meteors
    seenIds.clear();
    for (const m of sim.meteors) {
      if (m.destroyed) continue;
      seenIds.add(m.id);
      let vis = meteorVisuals.get(m.id);
      if (!vis) {
        vis = createMeteorVisual(m);
        meteorVisuals.set(m.id, vis);
      }
      vis.group.position.set(m.x, m.y, m.z);
      vis.group.rotation.set(m.rotX, m.rotY, m.rotZ);

      // Hit flash response
      if (m.hitFlash > 0) {
        vis.coreMat.emissive.setHex(0xffffff);
        vis.coreMat.emissiveIntensity = 0.85 * m.hitFlash;
      } else {
        vis.coreMat.emissive.setHex(m.type === 'cosmic' ? 0x0ea5e9 : 0x2a140c);
        vis.coreMat.emissiveIntensity = m.type === 'cosmic' ? 0.45 : 0.15;
      }

      // Orient exhaust wake trailing opposite velocity
      vis.wakeMesh.position.set(m.x, m.y, m.z);
      _vec3A.set(-m.vx, -m.vy, -m.vz);
      if (_vec3A.lengthSq() > 0.0001) {
        _vec3A.normalize();
        _quatA.setFromUnitVectors(_upVec, _vec3A);
        vis.wakeMesh.quaternion.copy(_quatA);
      }
      vis.wakeMat.opacity = (m.type === 'cosmic' ? 0.44 : 0.34) * (0.85 + Math.sin(elapsed * 18 + m.id) * 0.15);
    }

    // Remove destroyed meteors from scene & raycast list
    for (const [id, vis] of meteorVisuals.entries()) {
      if (!seenIds.has(id)) {
        scene.remove(vis.group);
        scene.remove(vis.wakeMesh);
        const proxyIdx = interactableProxies.indexOf(vis.hitSphere);
        if (proxyIdx >= 0) interactableProxies.splice(proxyIdx, 1);
        vis.coreMat.dispose();
        vis.accentMat.dispose();
        vis.wakeMat.dispose();
        meteorVisuals.delete(id);
      }
    }

    // Sync shockwave rings
    for (let i = 0; i < shockwavePool.length; i++) {
      const slot = shockwavePool[i];
      const sw = sim.shockwaves[i];
      if (!sw) {
        slot.mesh.visible = false;
        continue;
      }
      slot.mesh.visible = true;
      const t = 1 - sw.life / sw.maxLife;
      const rad = 0.25 + t * sw.maxRadius;
      slot.mesh.position.set(sw.x, sw.y, sw.z + 0.15);
      slot.mesh.scale.setScalar(rad);
      slot.mesh.lookAt(camera.position);
      slot.mat.color.set(sw.color);
      slot.mat.opacity = (1 - t) * 0.78;
    }

    // Sync orbital laser beams
    for (let i = 0; i < laserPool.length; i++) {
      const slot = laserPool[i];
      const beam = sim.laserBeams[i];
      if (!beam) {
        slot.mesh.visible = false;
        continue;
      }
      slot.mesh.visible = true;
      _vec3A.set(beam.fromX, beam.fromY, beam.fromZ);
      _vec3B.set(beam.toX, beam.toY, beam.toZ);
      const len = _vec3A.distanceTo(_vec3B);
      slot.mesh.position.copy(_vec3A).lerp(_vec3B, 0.5);
      _vec3B.sub(_vec3A).normalize();
      _quatA.setFromUnitVectors(_upVec, _vec3B);
      slot.mesh.quaternion.copy(_quatA);
      slot.mesh.scale.set(1, len, 1);
      slot.mat.opacity = Math.max(0, beam.life / beam.maxLife) * 0.95;
    }

    // Update instanced debris particles
    let anyParticleUpdated = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles[i];
      if (!p.active) continue;
      anyParticleUpdated = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _mat4.makeScale(0, 0, 0);
        particleInstanced.setMatrixAt(i, _mat4);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rot += p.spin * dt;
      const sc = p.scale * (p.life / p.maxLife);
      _vec3A.set(p.x, p.y, p.z);
      _quatA.setFromEuler(new THREE.Euler(p.rot, p.rot * 0.7, 0));
      _scaleVec.setScalar(sc);
      _mat4.compose(_vec3A, _quatA, _scaleVec);
      particleInstanced.setMatrixAt(i, _mat4);
      particleInstanced.setColorAt(i, p.color);
    }
    if (anyParticleUpdated) {
      particleInstanced.instanceMatrix.needsUpdate = true;
      if (particleInstanced.instanceColor) particleInstanced.instanceColor.needsUpdate = true;
    }

    // Subtle idle orbital camera drift + impact shake
    const shakeMag =
      screenShakeRef.current && !reducedMotionRef.current ? sim.trauma * sim.trauma * 0.28 : 0;
    const targetCamX =
      (sim.phase === 'title' ? Math.sin(elapsed * 0.25) * 0.35 : 0) +
      (Math.random() - 0.5) * shakeMag;
    const targetCamY =
      0.15 +
      (sim.phase === 'title' ? Math.cos(elapsed * 0.2) * 0.16 : 0) +
      (Math.random() - 0.5) * shakeMag;
    const damp = 1 - Math.exp(-6 * dt);
    camera.position.x += (targetCamX - camera.position.x) * damp;
    camera.position.y += (targetCamY - camera.position.y) * damp;
    camera.position.z += (baseCameraPos.z - camera.position.z) * damp;
    camera.lookAt(0, 0, 0);
  };

  const tick = () => {
    if (disposed) return;
    const now = performance.now();
    const rawDt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    onStep(rawDt);
    updateVisuals(rawDt, getSim());
    renderer.render(scene, camera);

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }
  };

  if (isSoftwareGl) {
    afterDraw(tick);
  } else {
    frameId = requestAnimationFrame(tick);
  }

  return {
    setEnvironment: applyEnvironment,
    pickMeteorAtClientPos,
    spawnHitBurst,
    projectWorldToScreen,
    getEarthScreenBounds,
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      for (const vis of meteorVisuals.values()) {
        vis.coreMat.dispose();
        vis.accentMat.dispose();
        vis.wakeMat.dispose();
      }
      meteorVisuals.clear();
      Object.values(sharedGeos).forEach((g) => g.dispose());
      earthGeo.dispose();
      earthMat.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      cloudTex.dispose();
      innerAtmoGeo.dispose();
      innerAtmoMat.dispose();
      outerAtmoGeo.dispose();
      outerAtmoMat.dispose();
      shieldGeo.dispose();
      shieldMat.dispose();
      activeEarthMaps.albedo.dispose();
      activeEarthMaps.roughness.dispose();
      activeEarthMaps.bump.dispose();
      activeEarthMaps.night.dispose();
      skyGeo.dispose();
      skyMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      coronaTex.dispose();
      sunSpriteMat.dispose();
      streakGeo.dispose();
      streakMat.dispose();
      gravCoreGeo.dispose();
      gravCoreMat.dispose();
      gravRingGeo.dispose();
      gravRingMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      particleInstanced.dispose();
      hitProxyMat.dispose();
      shockwavePool.forEach((s) => s.mat.dispose());
      laserPool.forEach((l) => l.mat.dispose());
      envTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
