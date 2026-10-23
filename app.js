import * as THREE from "./assets/vendor/three.module.js?v=ce1fa418de16a19495a9f72495580e3015d7745c296d3ce0485897f902ddedfb";
const $ = (s) => document.querySelector(s),
  clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)),
  mix = THREE.MathUtils.lerp;
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
let finish = "Signal red",
  finishHex = "#d9311c",
  view = "profile",
  painted,
  lamps = [],
  renderer,
  scene,
  camera,
  bike,
  frame,
  wheels = [],
  battery,
  motor,
  floor,
  target = 0,
  progress = 0,
  lightOn = false;
const state = { assist: 2 };
function download(text, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
document.querySelectorAll("[data-color]").forEach((b) =>
  b.addEventListener("click", () => {
    finish = b.dataset.name;
    finishHex = b.dataset.color;
    $("#finish-name").textContent = finish;
    if (painted) painted.color.set(finishHex);
    document.querySelectorAll("[data-color]").forEach((x) => {
      x.classList.toggle("active", x === b);
      x.setAttribute("aria-pressed", String(x === b));
    });
  }),
);
const viewButtons = [...document.querySelectorAll("[data-view]")];
function updateViews() {
  viewButtons.forEach((button) => {
    const selected = button.dataset.view === view;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}
viewButtons.forEach((button) =>
  button.addEventListener("click", () => {
    view = button.dataset.view;
    updateViews();
  }),
);
updateViews();
$("#lights").addEventListener("change", (e) => {
  lightOn = e.target.checked;
  lamps.forEach((l) => {
    l.material.emissiveIntensity = lightOn ? 4 : 0.1;
  });
});
$("#assist").addEventListener("input", (e) => {
  state.assist = +e.target.value;
  const rates = [4.5, 6, 9];
  $("#assist-value").textContent = ["Eco", "Balanced", "Boost"][
    state.assist - 1
  ];
  $("#range-value").textContent = Math.round(360 / rates[state.assist - 1]);
  $("#consumption").textContent = rates[state.assist - 1];
});
$("#save").addEventListener("click", () => {
  download(
    `VOLT V/01 | Concept specification\n\nFrame: ${finish}\nNight lights: ${lightOn ? "On" : "Off"}\nRiding assistance: ${$("#assist-value").textContent}\nIllustrative range: ${$("#range-value").textContent} km\nAssumption: 360 Wh / ${$("#consumption").textContent} Wh per km\n\nIndependent design concept by BlackStack Studio.\nThis document is a configuration summary. No order has been placed.\nThe bicycle is a concept, not certified production hardware.\n`,
    "volt-v01-specification.txt",
  );
  $("#save-status").textContent =
    "Specification downloaded. Your choices stay here.";
});
function measure() {
  const chapters = [...document.querySelectorAll("[data-chapter]")];
  target = 3;
  for (let i = 0; i < chapters.length - 1; i++) {
    const start = chapters[i].offsetTop;
    const end = chapters[i + 1].offsetTop;
    if (scrollY <= end) {
      target = i + clamp((scrollY - start) / Math.max(1, end - start));
      break;
    }
  }
  $(".progress i").style.width =
    `${clamp(scrollY / (document.documentElement.scrollHeight - innerHeight)) * 100}%`;
}
addEventListener("scroll", measure, { passive: true });
addEventListener("resize", measure);
measure();
try {
  scene = new THREE.Scene();
  scene.background = null;
  scene.fog = new THREE.Fog("#eae9e2", 12, 26);
  camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.1, 80);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0xeae9e2, 0);
  renderer.setPixelRatio(
    Math.min(devicePixelRatio, innerWidth < 701 ? 1.35 : 1.6),
  );
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  $("#stage").append(renderer.domElement);
  document.body.classList.add("webgl");
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa4a18c, 3));
  const sun = new THREE.DirectionalLight(0xffffff, 4);
  sun.position.set(4, 8, 4);
  sun.castShadow = false;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
  sun.shadow.bias = -0.0002;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xffffff, 2);
  rim.position.set(-4, 3, -5);
  scene.add(rim);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color("#b7b9b0");
  for (const p of [
    [0, 5, 0],
    [5, 2, 1],
    [-5, 1, -3],
  ]) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    panel.position.set(...p);
    panel.lookAt(0, 0, 0);
    envScene.add(panel);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.025).texture;
  pmrem.dispose();
  envScene.traverse((object) => {
    if (object.isMesh) {
      object.geometry.dispose();
      object.material.dispose();
    }
  });
  const rubber = new THREE.MeshStandardMaterial({
      color: "#20221f",
      roughness: 0.84,
    }),
    alloy = new THREE.MeshStandardMaterial({
      color: "#b8beb7",
      metalness: 0.86,
      roughness: 0.25,
    }),
    dark = new THREE.MeshStandardMaterial({
      color: "#353b36",
      metalness: 0.6,
      roughness: 0.38,
    });
  painted = new THREE.MeshStandardMaterial({
    color: finishHex,
    metalness: 0.55,
    roughness: 0.28,
  });
  bike = new THREE.Group();
  scene.add(bike);
  frame = new THREE.Group();
  bike.add(frame);
  function mesh(g, m, group = frame) {
    const x = new THREE.Mesh(g, m);
    x.castShadow = true;
    x.receiveShadow = true;
    group.add(x);
    return x;
  }
  function rod(a, b, r, m = painted, group = frame) {
    const av = new THREE.Vector3(...a),
      bv = new THREE.Vector3(...b),
      x = mesh(
        new THREE.CylinderGeometry(r, r, bv.distanceTo(av), 16),
        m,
        group,
      );
    x.position.copy(av.add(bv).multiplyScalar(0.5));
    x.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      bv.sub(new THREE.Vector3(...a)).normalize(),
    );
    return x;
  }
  const A = [-1.25, -0.55, 0],
    B = [-0.25, -0.6, 0],
    C = [-0.55, 0.65, 0],
    D = [0.72, 0.65, 0],
    E = [1.25, -0.55, 0];
  rod(B, C, 0.065);
  rod(C, D, 0.065);
  rod(B, D, 0.1);
  for (const z of [-0.1, 0.1]) {
    rod([A[0], A[1], z], [C[0], C[1] - 0.04, z], 0.035);
    rod([A[0], A[1], z], [B[0], B[1], z], 0.035);
    rod([D[0], D[1] + 0.08, z], [E[0], E[1], z], 0.038, dark);
  }
  rod([0.72, 0.54, 0], [0.77, 0.88, 0], 0.07);
  rod([-0.55, 0.65, 0], [-0.62, 0.99, 0], 0.035, alloy);
  const seat = mesh(new THREE.CapsuleGeometry(0.075, 0.33, 5, 12), rubber);
  seat.rotation.z = Math.PI / 2;
  seat.scale.z = 1.7;
  seat.position.set(-0.64, 1.01, 0);
  rod([0.77, 0.88, 0], [0.88, 1.12, 0], 0.03, alloy);
  rod([0.88, 1.12, -0.32], [0.88, 1.12, 0.32], 0.024, dark);
  for (const z of [-0.3, 0.3]) {
    rod([0.88, 1.12, z], [0.67, 1.13, z], 0.033, rubber);
  }
  for (const [xx, yy] of [
    [A[0], A[1]],
    [E[0], E[1]],
  ]) {
    const w = new THREE.Group();
    w.position.set(xx, yy, 0);
    bike.add(w);
    wheels.push(w);
    mesh(new THREE.TorusGeometry(0.7, 0.052, 16, 96), rubber, w);
    mesh(new THREE.TorusGeometry(0.648, 0.025, 10, 96), alloy, w);
    for (let i = 0; i < 32; i++) {
      const t = (i / 32) * Math.PI * 2;
      rod(
        [
          0.08 * Math.cos(t + 0.4),
          0.08 * Math.sin(t + 0.4),
          i % 2 ? 0.045 : -0.045,
        ],
        [0.64 * Math.cos(t), 0.64 * Math.sin(t), 0],
        0.004,
        alloy,
        w,
      );
    }
    const hub = mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.24, 24),
      dark,
      w,
    );
    hub.rotation.x = Math.PI / 2;
    const disc = mesh(new THREE.TorusGeometry(0.17, 0.011, 6, 40), alloy, w);
    disc.position.z = 0.13;
    for (let i = 0; i < 8; i++) {
      const t = (i * Math.PI) / 4;
      rod(
        [0, 0, 0.13],
        [0.17 * Math.cos(t), 0.17 * Math.sin(t), 0.13],
        0.007,
        alloy,
        w,
      );
    }
  }
  motor = mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.19, 32),
    dark,
    wheels[0],
  );
  motor.rotation.x = Math.PI / 2;
  const crank = mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.12, 32), dark);
  crank.rotation.x = Math.PI / 2;
  crank.position.set(B[0], B[1], 0.15);
  rod([B[0], B[1], 0.23], [B[0] + 0.16, B[1] - 0.22, 0.23], 0.02, alloy);
  rod([B[0], B[1], -0.2], [B[0] - 0.16, B[1] + 0.22, -0.2], 0.02, alloy);
  for (const p of [
    [B[0] + 0.16, B[1] - 0.22, 0.23],
    [B[0] - 0.16, B[1] + 0.22, -0.2],
  ]) {
    const pedal = mesh(new THREE.BoxGeometry(0.16, 0.035, 0.17), rubber);
    pedal.position.set(...p);
  }
  rod([A[0], A[1] + 0.09, 0.14], [B[0], B[1] + 0.1, 0.14], 0.008, rubber);
  rod([A[0], A[1] - 0.09, 0.14], [B[0], B[1] - 0.1, 0.14], 0.008, rubber);
  battery = new THREE.Group();
  bike.add(battery);
  const b = mesh(new THREE.CapsuleGeometry(0.075, 0.7, 8, 16), dark, battery);
  b.rotation.z = -0.67;
  b.position.set(0.22, 0.02, 0.09);
  const mark = mesh(
    new THREE.BoxGeometry(0.028, 0.12, 0.015),
    new THREE.MeshStandardMaterial({
      color: "#d8decb",
      emissive: "#b8d795",
      emissiveIntensity: 0.3,
    }),
    battery,
  );
  mark.position.set(0.28, 0.1, 0.17);
  mark.rotation.z = -0.67;
  for (const [x, y, z] of [
    [0.88, 1.12, 0],
    [-0.73, 0.86, 0],
  ]) {
    const l = mesh(
      new THREE.SphereGeometry(0.035, 12, 8),
      new THREE.MeshStandardMaterial({
        color: x > 0 ? "#ffffe9" : "#fc4a2c",
        emissive: x > 0 ? "#ffffdb" : "#ff381e",
        emissiveIntensity: 0.1,
      }),
    );
    l.position.set(x, y, z);
    lamps.push(l);
  }
  floor = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 2.2),
    new THREE.MeshBasicMaterial({
      map: shadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.3,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.32;
  floor.receiveShadow = true;
  scene.add(floor);
  function shadowTexture() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext("2d"),
      g = ctx.createRadialGradient(128, 64, 5, 128, 64, 64);
    g.addColorStop(0, "#35382f");
    g.addColorStop(1, "#35382f00");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
    return new THREE.CanvasTexture(c);
  }
  function batch(group) {
    for (const material of [painted, alloy, dark, rubber]) {
      const originals = group.children.filter(
        (o) => o.isMesh && o.material === material,
      );
      if (originals.length < 2) continue;
      const arrays = { position: [], normal: [], uv: [] };
      for (const o of originals) {
        o.updateMatrix();
        const g = o.geometry.index
          ? o.geometry.toNonIndexed()
          : o.geometry.clone();
        g.applyMatrix4(o.matrix);
        for (const name of Object.keys(arrays))
          arrays[name].push(g.attributes[name].array);
        g.dispose();
      }
      const merged = new THREE.BufferGeometry();
      for (const name of Object.keys(arrays)) {
        const len = arrays[name].reduce((n, a) => n + a.length, 0),
          a = new Float32Array(len);
        let at = 0;
        for (const b of arrays[name]) {
          a.set(b, at);
          at += b.length;
        }
        merged.setAttribute(
          name,
          new THREE.BufferAttribute(a, name === "uv" ? 2 : 3),
        );
      }
      for (const o of originals) {
        group.remove(o);
        o.geometry.dispose();
      }
      group.add(new THREE.Mesh(merged, material));
    }
  }
  batch(frame);
  wheels.forEach(batch);
  const grid = new THREE.GridHelper(40, 40, 0xb1b5a9, 0xd2d5c7);
  grid.position.y = -1.315;
  grid.material.transparent = true;
  grid.material.opacity = 0.07;
  scene.add(grid);

  // One batched road layer. Its travel comes from scroll distance, never time.
  const roadGeometry = new THREE.BufferGeometry();
  const roadVertices = [];
  for (let lane = -2; lane <= 2; lane++) {
    for (let mark = -5; mark <= 5; mark++) {
      const x = mark * 3.4 + (lane % 2) * 1.1;
      roadVertices.push(x, 0, lane * 1.35, x + 1.15, 0, lane * 1.35);
    }
  }
  roadGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(roadVertices, 3),
  );
  const roadMaterial = new THREE.LineBasicMaterial({
    color: "#7d8274",
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });
  const road = new THREE.LineSegments(roadGeometry, roadMaterial);
  scene.add(road);
  const bikeBounds = new THREE.Box3();
  const corner = new THREE.Vector3();
  function projectedBikeBounds() {
    bike.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    bikeBounds.setFromObject(bike);
    let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
    for (let i = 0; i < 8; i++) {
      corner.set(
        i & 1 ? bikeBounds.max.x : bikeBounds.min.x,
        i & 2 ? bikeBounds.max.y : bikeBounds.min.y,
        i & 4 ? bikeBounds.max.z : bikeBounds.min.z,
      ).project(camera);
      const x = (corner.x + 1) * innerWidth * 0.5;
      const y = (1 - corner.y) * innerHeight * 0.5;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
    return { top, bottom, left, right };
  }
  function mobileReadingSlot(q) {
    const pairs = [
      [".hero h1", ".hero-bottom"],
      [".inside .section-copy", ".model-label"],
      [".ride-heading", ".ride-copy"],
      [".config-intro", ".config-panel"],
    ];
    const index = Math.min(3, Math.floor(q + 0.08));
    const [before, after] = pairs[index];
    let top = Math.max(24, $(before).getBoundingClientRect().bottom + 20);
    let bottom = Math.min(innerHeight - 24, $(after).getBoundingClientRect().top - 20);
    const reading = [...document.querySelectorAll(
      "header,.hero h1,.hero-bottom,.inside .section-copy,.model-label,.ride-heading,.ride-copy,.spec-strip,.config-intro,.config-panel,footer",
    )].map((el) => el.getBoundingClientRect()).filter((rect) =>
      rect.height > 0 && rect.bottom > 24 && rect.top < innerHeight - 24,
    ).sort((a, b) => a.top - b.top);
    let entrance = index ? THREE.MathUtils.smoothstep(q, index - 0.08, index) : 1;
    if (bottom - top < 120) {
      let edge = 24, best = [24, 24];
      for (const rect of reading) {
        if (rect.top - 18 - edge > best[1] - best[0]) best = [edge, rect.top - 18];
        edge = Math.max(edge, rect.bottom + 18);
      }
      if (innerHeight - 24 - edge > best[1] - best[0]) best = [edge, innerHeight - 24];
      [top, bottom] = best;
      entrance = 1;
    }
    return {
      top,
      bottom,
      height: Math.max(0, bottom - top),
      entrance,
      reading,
    };
  }
  addEventListener("resize", () => {
    if (contextLost) return;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    wake();
  });
  let last = performance.now(),
    raf = 0,
    contextLost = false,
    frames = 0,
    slow = 0,
    phoneY = null,
    phoneScale = null;
  const stats = document.documentElement.dataset;
  function wake() {
    if (!raf && !document.hidden && !contextLost) {
      last = performance.now() - 1000 / 60;
      raf = requestAnimationFrame(tick);
    }
  }
  document.fonts.ready.then(() => {
    measure();
    wake();
  });
  function tick(now) {
    raf = 0;
    if (contextLost) {
      stats.renderMode = "fallback";
      return;
    }
    if (document.hidden) {
      stats.renderMode = "hidden";
      return;
    }
    const footerTop = document
      .querySelector("footer")
      .getBoundingClientRect().top;
    if (footerTop < 0) {
      stats.renderMode = "offscreen";
      return;
    }
    const elapsed = now - last;
    if (elapsed < 200 && elapsed > 28) {
      slow++;
      if (slow > 35 && renderer.getPixelRatio() > 1.1) {
        renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - 0.2));
        slow = 0;
      }
    } else slow = Math.max(0, slow - 1);
    const dt = Math.min(Math.max((now - last) / 1000, 1 / 120), 0.05);
    last = now;
    // Native scroll is the single playhead. Stop and reverse have no old queue.
    progress = target;
    const mobile = innerWidth < 701,
      q = progress;
    const ease = (a, b) => THREE.MathUtils.smoothstep(q, a, b);
    const chapterBlend = (values) => {
      let index = 0;
      while (index < values.length - 2 && q > values[index + 1][0]) index++;
      const [start, from] = values[index];
      const [end, to] = values[index + 1];
      return mix(from, to, THREE.MathUtils.smoothstep(q, start, end));
    };
    const explode = Math.sin(clamp((q - 0.82) / 0.92) * Math.PI);
    frame.position.y = explode * 0.16;
    battery.position.set(explode * 0.35, explode * 0.8, explode * 0.8);
    wheels[0].position.x = A[0] - explode * 0.45;
    wheels[1].position.x = E[0] + explode * 0.45;
    const distance = q * 8.4;
    const wheelAngle = -distance / 0.752;
    wheels.forEach((wheel) => (wheel.rotation.z = wheelAngle));
    const c1 = ease(0.35, 0.9),
      c2 = ease(1.65, 2.12),
      c3 = ease(2.5, 3);
    const bend = Math.sin(q * Math.PI * 1.45) * (1 - c3);
    const viewAngle = view === "front" ? -0.62 : view === "detail" ? 0.36 : -0.04;
    bike.rotation.y = mix(
      chapterBlend([[0, -0.45], [0.8, -0.08], [1.35, 0.2], [1.8, -0.24], [2.4, 0.18], [3, -0.04]]),
      viewAngle,
      c3,
    );
    bike.rotation.z = bend * -0.035;
    const detail = view === "detail";
    let camX = mobile ? 0 : mix(mix(mix(0, -1.6, c1), -0.4, c2), 1.65, c3),
      camZ = mobile
        ? mix(mix(mix(7.8, 8.8, c1), 7.9, c2), detail ? 6.6 : 8.4, c3)
        : mix(mix(mix(7.3, 7.8, c1), 7.5, c2), detail ? 5.4 : 7.4, c3),
      camY = mobile ? 1.2 : 2.0;
    let lookX = mobile
      ? 0
      : mix(mix(mix(0, -1, c1), -0.5, c2), detail ? -0.6 : 0.75, c3);
    let bikeX = mobile
      ? chapterBlend([[0, 0], [0.8, 0.1], [1.5, 0.05], [2.2, 0.12], [3, 0]])
      : chapterBlend([[0, 0], [0.8, 0.62], [1.5, 0.45], [2, 0.7], [2.45, 0.15], [3, -0.3]]);
    let bikeY = mobile
      ? chapterBlend([[0, -0.85], [0.85, -0.55], [1.55, -0.7], [2.25, -0.78], [3, 0.15]])
      : chapterBlend([[0, -0.45], [0.9, 0], [1.5, -0.03], [2, -0.18], [2.5, -0.12], [3, 0]]);
    let bikeScale = mobile
      ? chapterBlend([[0, 0.58], [0.9, 0.54], [1.55, 0.56], [2.2, 0.6], [3, 0.58]])
      : chapterBlend([[0, 1], [0.9, 0.94], [1.5, 0.94], [2.1, 1.05], [3, 1]]);
    if (reduce.matches) {
      bike.rotation.y =
        view === "front" ? -0.6 : view === "detail" ? 0.36 : -0.2;
      camX = mobile ? 0 : detail ? -0.6 : -1.3;
      camZ = detail ? (mobile ? 6 : 5.4) : mobile ? 8.4 : 7.8;
      lookX = mobile ? 0 : -0.5;
      bikeX = 0;
      bikeY = mobile ? -0.7 : 0;
      bikeScale = mobile ? 0.5 : 1;
      frame.position.y = 0;
      battery.position.set(0, 0, 0);
      wheels[0].position.x = A[0];
      wheels[1].position.x = E[0];
      wheels.forEach((w) => (w.rotation.z = 0));
    }
    camera.position.set(camX, camY, camZ);
    camera.lookAt(lookX, mobile ? 0.1 : 0, 0);
    bike.position.set(bikeX, bikeY, 0);
    bike.scale.setScalar(bikeScale);
    let sceneOpacity = 1, phoneMoving = false;
    if (mobile && !reduce.matches) {
      const slot = mobileReadingSlot(q);
      let bounds = projectedBikeBounds();
      const fit = Math.min(
        1,
        (innerWidth - 32) / Math.max(1, bounds.right - bounds.left),
        Math.max(65, slot.height) / Math.max(1, bounds.bottom - bounds.top),
      );
      bikeScale *= fit;
      bike.scale.setScalar(bikeScale);
      for (let pass = 0; pass < 2; pass++) {
        bounds = projectedBikeBounds();
        const centre = (bounds.top + bounds.bottom) * 0.5;
        const slotCentre = (slot.top + slot.bottom) * 0.5;
        const worldPerPixel =
          2 * camera.position.distanceTo(bike.position) * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) / innerHeight;
        bikeY += (centre - slotCentre) * worldPerPixel;
        bike.position.y = bikeY;
      }
      phoneY = phoneY === null ? bikeY : mix(phoneY, bikeY, 1 - Math.exp(-32 * dt));
      phoneScale = phoneScale === null ? bikeScale : mix(phoneScale, bikeScale, 1 - Math.exp(-32 * dt));
      phoneMoving = Math.abs(phoneY - bikeY) > 0.001 || Math.abs(phoneScale - bikeScale) > 0.0002;
      bikeY = phoneY;
      bikeScale = phoneScale;
      bike.position.y = bikeY;
      bike.scale.setScalar(bikeScale);
      bounds = projectedBikeBounds();
      let overlap = 0;
      for (const rect of slot.reading) overlap = Math.max(overlap,
        Math.max(0, Math.min(bounds.bottom, rect.bottom + 10) - Math.max(bounds.top, rect.top - 10)),
      );
      sceneOpacity = THREE.MathUtils.smoothstep(slot.height, 45, 95) * slot.entrance;
      sceneOpacity *= 1 - THREE.MathUtils.smoothstep(overlap, 0, 48);
    } else if (mobile) {
      // A still product in reduced-motion mode, hidden behind reading areas.
      const bounds = projectedBikeBounds();
      const readingAreas = document.querySelectorAll(
        "header,.hero h1,.hero-bottom,.inside .section-copy,.model-label,.ride-heading,.ride-copy,.spec-strip,.config-intro,.config-panel,footer",
      );
      for (const area of readingAreas) {
        const rect = area.getBoundingClientRect();
        if (rect.bottom > bounds.top - 12 && rect.top < bounds.bottom + 12) {
          sceneOpacity = 0;
          break;
        }
      }
    }
    renderer.domElement.style.opacity = String(sceneOpacity);
    const groundY = bikeY - 1.315 * bikeScale;
    floor.position.set(bikeX, groundY, 0);
    floor.scale.setScalar(bikeScale);
    grid.position.set(reduce.matches ? 0 : -(distance % 1), groundY - 0.004, 0);
    grid.material.opacity = reduce.matches ? 0.04 : mix(0.06, 0.13, c2) * (1 - c3 * 0.7);
    road.position.set(reduce.matches ? 0 : -(distance % 3.4), groundY + 0.002, 0);
    road.visible = !reduce.matches;
    roadMaterial.opacity = (0.12 + c2 * 0.2) * (1 - explode * 0.8) * (1 - c3);
    renderer.render(scene, camera);
    frames++;
    stats.renderFrames = String(frames);
    stats.drawCalls = String(renderer.info.render.calls);
    stats.triangles = String(renderer.info.render.triangles);
    stats.renderDpr = String(renderer.getPixelRatio());
    stats.renderMode = phoneMoving ? "active" : "idle";
    stats.journeyProgress = q.toFixed(5);
    stats.journeyDistance = (reduce.matches ? 0 : distance).toFixed(5);
    stats.wheelAngle = (reduce.matches ? 0 : wheelAngle).toFixed(5);
    const style = document.documentElement.style;
    style.setProperty("--ride", String(reduce.matches ? 0 : clamp(q / 3)));
    style.setProperty("--road-shift", `${reduce.matches ? 0 : -(distance % 3.4) * 38}px`);
    style.setProperty("--route-bend", String(reduce.matches ? 0 : bend));
    if (phoneMoving) raf = requestAnimationFrame(tick);
  }
  addEventListener("scroll", wake, { passive: true });
  document.querySelectorAll("button,input").forEach((el) => {
    el.addEventListener("click", wake);
    el.addEventListener("input", wake);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
      stats.renderMode = "hidden";
    } else {
      last = performance.now();
      wake();
    }
  });
  reduce.addEventListener("change", wake);
  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    contextLost = true;
    cancelAnimationFrame(raf);
    raf = 0;
    renderer.domElement.hidden = true;
    renderer.domElement.style.display = "none";
    document.body.classList.remove("webgl");
    stats.renderMode = "fallback";
  });
  wake();
} catch (e) {
  console.warn("3D view unavailable; configuration remains usable.", e);
}
