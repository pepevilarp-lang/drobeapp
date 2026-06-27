import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let renderer, scene, camera, controls, raf, ro, container, onSelectCb;
let clickable = [], groups = [];
let last = 0;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const HOME = { pos: new THREE.Vector3(0, 0.5, 6.4), tgt: new THREE.Vector3(0, 0.1, 0) };
let tween = null;

function ease(x){ return 1 - Math.pow(1 - x, 3); }

export function mountWardrobe3D(cont, items, opts){
  unmountWardrobe3D();
  container = cont;
  onSelectCb = (opts && opts.onSelect) || null;

  const w = container.clientWidth, h = container.clientHeight || 460;
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xE6E0D4, 9, 18);

  camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
  camera.position.copy(HOME.pos);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.09;
  controls.enablePan = false;
  controls.minDistance = 3.4; controls.maxDistance = 9;
  controls.minPolarAngle = Math.PI * 0.33; controls.maxPolarAngle = Math.PI * 0.6;
  controls.rotateSpeed = 0.7;
  controls.target.copy(HOME.tgt);

  // luz
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 0.7); key.position.set(3, 6, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe6f0, 0.3); fill.position.set(-4, 2, 3); scene.add(fill);

  const n = Math.max(1, items.length);
  const railLen = Math.max(4.5, n * 1.35);

  // pared y suelo
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(railLen + 4, 8),
    new THREE.MeshStandardMaterial({ color: 0xEDE7DB, roughness: 1 }));
  wall.position.set(0, 1.2, -1.6); scene.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(railLen + 4, 6),
    new THREE.MeshStandardMaterial({ color: 0xDED7C8, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, -2.6, 0.2); scene.add(floor);

  // riel
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, railLen, 20),
    new THREE.MeshStandardMaterial({ color: 0x8A7D6A, metalness: 0.5, roughness: 0.4 }));
  rail.rotation.z = Math.PI / 2; rail.position.y = 2.05; scene.add(rail);

  const loader = new THREE.TextureLoader();
  const spacing = railLen / (n + 1);
  clickable = []; groups = [];

  items.forEach((it, i) => {
    const x = -railLen / 2 + spacing * (i + 1);
    const g = new THREE.Group(); g.position.set(x, 0, 0);

    // percha
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 8, 20, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x6B7682, metalness: 0.6, roughness: 0.3 }));
    hook.position.y = 1.92; hook.rotation.x = Math.PI; g.add(hook);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xB9AE99, roughness: 0.6 }));
    bar.position.y = 1.55; g.add(bar);

    // prenda
    const ph = 2.0, pw = 1.45;
    const mat = new THREE.MeshBasicMaterial({ color: it.img ? 0xffffff : 0xCAD6E2, transparent: true, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat);
    plane.position.y = 0.5; plane.userData = { item: it, group: g };
    if (it.img) {
      loader.load(it.img, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace; mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true;
        const a = tex.image.width / tex.image.height; plane.scale.x = (a * ph) / pw;
      }, undefined, () => {});
    }
    g.add(plane); clickable.push(plane); groups.push(g); scene.add(g);
  });

  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);
  ro = new ResizeObserver(() => {
    if (!renderer || !container) return;
    const W = container.clientWidth, H = container.clientHeight || 460;
    renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix();
  });
  ro.observe(container);

  last = performance.now();
  loop();
}

let downXY = null;
function onDown(e){ downXY = { x: e.clientX, y: e.clientY }; }
function onUp(e){
  if (!downXY) return;
  const moved = Math.hypot(e.clientX - downXY.x, e.clientY - downXY.y);
  downXY = null;
  if (moved > 8 || tween) return; // fue un giro, no un tap
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickable, false);
  if (hits.length) focusTo(hits[0].object.userData);
}

function focusTo(ud){
  const gp = ud.group.position;
  const toT = new THREE.Vector3(gp.x, 0.5, gp.z);
  const toP = new THREE.Vector3(gp.x, 0.75, gp.z + 2.8);
  controls.enabled = false;
  tween = { t: 0, dur: 0.55, fromP: camera.position.clone(), toP, fromT: controls.target.clone(), toT,
    cb: () => { if (onSelectCb) onSelectCb(ud.item); } };
}
export function resetView(){
  if (!camera) return;
  controls.enabled = false;
  tween = { t: 0, dur: 0.5, fromP: camera.position.clone(), toP: HOME.pos.clone(),
    fromT: controls.target.clone(), toT: HOME.tgt.clone(), cb: () => { controls.enabled = true; } };
}

function loop(){
  raf = requestAnimationFrame(loop);
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05); last = now;
  const t = now / 1000;
  groups.forEach((g, i) => { g.children.forEach(c => { if (c.geometry && c.geometry.type === 'PlaneGeometry') c.rotation.z = Math.sin(t * 0.5 + i * 0.6) * 0.018; }); });
  if (tween) {
    tween.t += dt / tween.dur;
    const e = ease(Math.min(tween.t, 1));
    camera.position.lerpVectors(tween.fromP, tween.toP, e);
    controls.target.lerpVectors(tween.fromT, tween.toT, e);
    if (tween.t >= 1) { const cb = tween.cb; tween = null; cb && cb(); }
  }
  controls.update();
  renderer.render(scene, camera);
}

export function unmountWardrobe3D(){
  if (raf) cancelAnimationFrame(raf); raf = null;
  if (ro) { ro.disconnect(); ro = null; }
  tween = null;
  if (renderer) {
    renderer.domElement.removeEventListener('pointerdown', onDown);
    renderer.domElement.removeEventListener('pointerup', onUp);
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    renderer = null;
  }
  if (controls) { controls.dispose(); controls = null; }
  clickable = []; groups = []; scene = null; camera = null; container = null;
}
