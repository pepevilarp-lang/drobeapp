import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let renderer, scene, camera, controls, raf, ro, container;
let clickable = [];
let onSelectCb = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

export function mountWardrobe3D(cont, items, onSelect){
  unmountWardrobe3D();
  container = cont;
  onSelectCb = onSelect;

  const w = container.clientWidth, h = container.clientHeight || 440;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xE8F0FB);

  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.set(0, 0.6, 6.2);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3.2;
  controls.maxDistance = 9;
  controls.maxPolarAngle = Math.PI * 0.62;
  controls.minPolarAngle = Math.PI * 0.34;
  controls.enablePan = false;
  controls.target.set(0, 0.1, 0);

  const n = Math.max(1, items.length);
  const railLen = Math.max(4, n * 1.25);

  // pared trasera
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(railLen + 3, 7),
    new THREE.MeshBasicMaterial({ color: 0xDCE6F2 })
  );
  wall.position.set(0, 1, -1.4);
  scene.add(wall);

  // suelo
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(railLen + 3, 4),
    new THREE.MeshBasicMaterial({ color: 0xCBD7E6 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -2.4, 0);
  scene.add(floor);

  // riel
  const rail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, railLen, 18),
    new THREE.MeshBasicMaterial({ color: 0x9AA6B2 })
  );
  rail.rotation.z = Math.PI / 2;
  rail.position.y = 2;
  scene.add(rail);

  const loader = new THREE.TextureLoader();
  const spacing = railLen / (n + 1);
  clickable = [];

  items.forEach((it, i) => {
    const x = -railLen / 2 + spacing * (i + 1);
    const group = new THREE.Group();
    group.position.set(x, 0, 0);

    // percha (gancho vertical)
    const hook = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.55, 8),
      new THREE.MeshBasicMaterial({ color: 0x6B7682 })
    );
    hook.position.y = 1.72;
    group.add(hook);

    // prenda como plano texturizado
    const ph = 2.0, pw = 1.45;
    const mat = new THREE.MeshBasicMaterial({
      color: it.img ? 0xffffff : (it.color || 0xCAD6E2),
      transparent: true,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat);
    plane.position.y = 0.45;
    plane.userData = { item: it };

    if (it.img) {
      loader.load(it.img, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        mat.map = tex;
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
        const a = tex.image.width / tex.image.height;
        // ajustar ancho del plano al aspecto de la imagen, manteniendo alto
        plane.scale.x = (a * ph) / pw;
      }, undefined, () => { /* si falla, queda el color */ });
    }

    group.add(plane);
    clickable.push(plane);
    scene.add(group);
  });

  renderer.domElement.addEventListener('pointerdown', onPointer);

  ro = new ResizeObserver(() => {
    if (!renderer || !container) return;
    const W = container.clientWidth, H = container.clientHeight || 440;
    renderer.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  });
  ro.observe(container);

  const t0 = performance.now();
  (function loop(){
    raf = requestAnimationFrame(loop);
    const t = (performance.now() - t0) / 1000;
    clickable.forEach((p, i) => { p.rotation.z = Math.sin(t * 0.6 + i * 0.7) * 0.022; });
    controls.update();
    renderer.render(scene, camera);
  })();
}

function onPointer(e){
  if (!renderer) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickable, false);
  if (hits.length && onSelectCb) onSelectCb(hits[0].object.userData.item);
}

export function unmountWardrobe3D(){
  if (raf) cancelAnimationFrame(raf);
  raf = null;
  if (ro) { ro.disconnect(); ro = null; }
  if (renderer) {
    renderer.domElement.removeEventListener('pointerdown', onPointer);
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    renderer = null;
  }
  if (controls) { controls.dispose(); controls = null; }
  clickable = []; scene = null; camera = null; container = null;
}
