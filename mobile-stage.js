// Native document frames keep the live object clear of mobile text and controls.
export const phone = matchMedia("(max-width: 900px), (max-width: 1000px) and (pointer: coarse)");
export function mobileFrames(chapters, placements) {
  const slots = [...document.querySelectorAll(chapters)].map((chapter, i) => {
    const slot = document.createElement("div");
    slot.className = "mobile-scene-slot";
    slot.setAttribute("aria-hidden", "true");
    const anchor = chapter.querySelector(placements[i]);
    if (anchor) anchor.after(slot); else chapter.append(slot);
    return slot;
  });
  return (renderer, scene, camera, fitFrame) => {
    if (!phone.matches) {
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, renderer.domElement.width / renderer.getPixelRatio(), renderer.domElement.height / renderer.getPixelRatio());
      renderer.render(scene, camera);
      return;
    }
    const background = scene.background, aspect = camera.aspect, zoom = camera.zoom;
    scene.background = null;
    renderer.setScissorTest(false);
    renderer.setClearColor(background || "#161718", 0);
    renderer.clear();
    scene.background = background;
    renderer.setScissorTest(true);
    let visible = 0;
    for (const slot of slots) {
      const r = slot.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= innerHeight) continue;
      const bottom = innerHeight - r.bottom;
      renderer.setViewport(r.left, bottom, r.width, r.height);
      renderer.setScissor(r.left, Math.max(0, bottom), r.width,
        Math.min(innerHeight, innerHeight - r.top) - Math.max(0, bottom));
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
      fitFrame?.(r);
      renderer.render(scene, camera);
      visible++;
    }
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, innerWidth, innerHeight);
    camera.aspect = aspect;
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
    document.documentElement.dataset.mobileFrames = String(visible);
    return visible;
  };
}

export function mobileFallback(selector) {
  const item = document.querySelector(selector), parent = item.parentNode, next = item.nextSibling;
  function place() {
    if (phone.matches) document.querySelector(".mobile-scene-slot").append(item);
    else parent.insertBefore(item, next);
  }
  phone.addEventListener("change", place);
  place();
}
