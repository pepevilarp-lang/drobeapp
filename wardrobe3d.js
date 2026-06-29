import * as THREE from 'three';

let renderer, scene, camera, raf, ro, container, onSelectCb, onFocusCb;
let cards = [], items = [];
let pos = 0, target = 0, lastFocus = -1;
let dragging = false, startX = 0, startPos = 0, moved = 0, movedY = 0, startY = 0;
const raycaster = new THREE.Raycaster();

const CW = 1.7, CH = 2.45, MARGIN = 0.14, RADIUS = 0.12;

function roundedRect(w, h, r){
  const s = new THREE.Shape(), x = -w/2, y = -h/2;
  s.moveTo(x+r, y); s.lineTo(x+w-r, y); s.quadraticCurveTo(x+w, y, x+w, y+r);
  s.lineTo(x+w, y+h-r); s.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  s.lineTo(x+r, y+h); s.quadraticCurveTo(x, y+h, x, y+h-r);
  s.lineTo(x, y+r); s.quadraticCurveTo(x, y, x+r, y);
  return s;
}
function shadowTexture(){
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(20,22,27,0.30)'); g.addColorStop(1, 'rgba(20,22,27,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(64, 64, 62, 30, 0, 0, 7); ctx.fill();
  return new THREE.CanvasTexture(c);
}

export function mountWardrobe3D(cont, its, opts){
  unmountWardrobe3D();
  container = cont; items = its || [];
  onSelectCb = opts && opts.onSelect; onFocusCb = opts && opts.onFocus;

  const w = container.clientWidth, h = container.clientHeight || 460;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
  camera.position.set(0, 0, 5.4); camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = 'pan-y';

  scene.add(new THREE.AmbientLight(0xffffff, 1));

  const shadowTex = shadowTexture();
  const loader = new THREE.TextureLoader();
  const innerW = CW - MARGIN * 2, innerH = CH - MARGIN * 2;

  cards = items.map(function(it, i){
    const group = new THREE.Group();

    const frameMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const frame = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(CW, CH, RADIUS)), frameMat);
    group.add(frame);

    const imgMat = new THREE.MeshBasicMaterial({ color: 0xe9e6df, side: THREE.DoubleSide });
    const img = new THREE.Mesh(new THREE.PlaneGeometry(innerW, innerH), imgMat);
    img.position.z = 0.012; group.add(img);

    if (it.img) {
      loader.load(it.img, function(tex){
        tex.colorSpace = THREE.SRGBColorSpace;
        imgMat.map = tex; imgMat.color.set(0xffffff); imgMat.needsUpdate = true;
        const a = tex.image.width / tex.image.height;
        let pw = innerW, ph = innerW / a;
        if (ph > innerH) { ph = innerH; pw = innerH * a; }
        img.scale.set(pw / innerW, ph / innerH, 1);
      }, undefined, function(){});
    }

    const sh = new THREE.Mesh(new THREE.PlaneGeometry(CW * 1.25, CW * 0.55),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = -CH / 2 - 0.06; group.add(sh);

    group.userData = { item: it, index: i, frameMat: frameMat, imgMat: imgMat };
    scene.add(group);
    return group;
  });

  const dom = renderer.domElement;
  dom.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  ro = new ResizeObserver(function(){
    if (!renderer || !container) return;
    const W = container.clientWidth, H = container.clientHeight || 460;
    renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix();
  });
  ro.observe(container);

  pos = 0; target = 0; lastFocus = -1;
  loop();
}

function onDown(e){ dragging = true; startX = e.clientX; startY = e.clientY; startPos = target; moved = 0; movedY = 0; }
function onMove(e){
  if (!dragging) return;
  const dx = e.clientX - startX, dy = e.clientY - startY;
  moved = Math.max(moved, Math.abs(dx)); movedY = Math.max(movedY, Math.abs(dy));
  target = startPos - dx / 130;
  target = Math.max(0, Math.min(items.length - 1, target));
}
function onUp(e){
  if (!dragging) return;
  dragging = false;
  if (moved < 6 && movedY < 10) {
    const rect = renderer.domElement.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const py = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera({ x: px, y: py }, camera);
    const hits = raycaster.intersectObjects(cards, true);
    if (hits.length) {
      let grp = hits[0].object.parent;
      if (grp && grp.userData && grp.userData.index != null) {
        const idx = grp.userData.index;
        if (Math.round(pos) === idx) { onSelectCb && onSelectCb(items[idx]); }
        else { target = idx; }
      }
    }
  } else {
    target = Math.round(target);
  }
}

function loop(){
  raf = requestAnimationFrame(loop);
  pos += (target - pos) * 0.15;
  if (Math.abs(target - pos) < 0.001) pos = target;
  const focus = Math.round(pos);

  cards.forEach(function(g, i){
    const p = i - pos, ap = Math.abs(p);
    if (ap > 3.2) { g.visible = false; return; }
    g.visible = true;
    const dir = p < 0 ? -1 : 1;
    const x = p * 0.9 + dir * Math.min(ap, 1) * 0.62;
    const z = -Math.min(ap, 3) * 0.9;
    const rotY = -Math.max(-1, Math.min(1, p)) * 0.82;
    const sc = 1 - Math.min(ap, 1) * 0.14;
    g.position.set(x, 0, z); g.rotation.y = rotY; g.scale.setScalar(sc);
    g.renderOrder = 10 - Math.round(ap);
    const fd = 1 - Math.min(ap, 1) * 0.22;
    g.userData.frameMat.color.setRGB(fd, fd, fd);
    if (g.userData.imgMat.map) { const d = 1 - Math.min(ap, 1) * 0.4; g.userData.imgMat.color.setRGB(d, d, d); }
  });

  if (focus !== lastFocus) { lastFocus = focus; if (onFocusCb && items[focus]) onFocusCb(items[focus]); }
  renderer.render(scene, camera);
}

export function resetView(){ if (cards.length) target = Math.round(pos); }

export function unmountWardrobe3D(){
  if (raf) cancelAnimationFrame(raf); raf = null;
  if (ro) { ro.disconnect(); ro = null; }
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
  if (renderer) {
    renderer.domElement.removeEventListener('pointerdown', onDown);
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    renderer = null;
  }
  cards = []; scene = null; camera = null; container = null; dragging = false;
}
