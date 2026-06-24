const DRAG_THRESHOLD_PX = 8;
const TS_MAX_WORDS_PER_SQUARE = 8;
const FS2_SOLUTION_ORDER = [1, 2, 3, 4];

function swapElements(a, b) {
  if (a === b) return;
  const marker = document.createTextNode('');
  a.before(marker);
  b.before(a);
  marker.before(b);
  marker.remove();
}

function rotationStyleDeg(el) {
  return Number(el.dataset.rotation || 0);
}

function applyRotation(el) {
  el.style.transform = `rotate(${rotationStyleDeg(el)}deg)`;
}

function rotateItem(el) {
  el.dataset.rotation = String(rotationStyleDeg(el) + 90);
  applyRotation(el);
}

function fs2TileId(el) {
  const raw = el.getAttribute('data-fs-id');
  if (raw == null || raw === '') return NaN;
  return Number.parseInt(raw, 10);
}

function fs2RotationMod360(el) {
  const d = Number(el.dataset.rotation || 0);
  return ((d % 360) + 360) % 360;
}

function updateFs2SolvedState(container) {
  const tiles = [...container.querySelectorAll('.fs-2-img')];
  if (tiles.length !== FS2_SOLUTION_ORDER.length) {
    container.classList.remove('fs-2--solved');
    return;
  }
  const orderOk = tiles.every((el, i) => fs2TileId(el) === FS2_SOLUTION_ORDER[i]);
  const rotOk = tiles.every((el) => fs2RotationMod360(el) === 0);
  container.classList.toggle('fs-2--solved', orderOk && rotOk);
}

function randomizeFs2Start(container) {
  const tiles = [...container.querySelectorAll('.fs-2-img')];
  let guard = 0;
  do {
    for (const el of tiles) {
      const steps = Math.floor(Math.random() * 4);
      el.dataset.rotation = String(steps * 90);
      applyRotation(el);
    }
    const order = [...tiles];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.forEach((t) => container.appendChild(t));
    const orderOk = order.every((el, i) => fs2TileId(el) === FS2_SOLUTION_ORDER[i]);
    const rotOk = order.every((el) => fs2RotationMod360(el) === 0);
    guard++;
    if (!orderOk || !rotOk) break;
  } while (guard < 120);
}

function initFs2Grid() {
  const container = document.querySelector('.fs-2');
  if (!container) return;

  const items = () => [...container.querySelectorAll('.fs-2-img')];

  for (const img of container.querySelectorAll('img')) {
    img.draggable = false;
  }
  container.addEventListener('dragstart', (e) => e.preventDefault());

  for (const el of items()) {
    if (!el.dataset.rotation) el.dataset.rotation = '0';
    applyRotation(el);
  }
  randomizeFs2Start(container);
  updateFs2SolvedState(container);

  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let draggedEl = null;
  let clone = null;
  let grabOffsetX = 0;
  let grabOffsetY = 0;
  let isDragging = false;
  let sessionAbort = null;
  let suppressClick = false;

  function clearDropHighlights() {
    for (const el of items()) el.classList.remove('fs-2-drop-target');
  }

  function removeClone() {
    clone?.remove();
    clone = null;
  }

  function endSession() {
    if (!sessionAbort) return;
    sessionAbort.abort();
    sessionAbort = null;
    activePointerId = null;
    clearDropHighlights();
  }

  function onDocMove(e) {
    if (e.pointerId !== activePointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!isDragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      isDragging = true;
      suppressClick = true;
      const r = draggedEl.getBoundingClientRect();
      grabOffsetX = startX - r.left;
      grabOffsetY = startY - r.top;
      clone = draggedEl.cloneNode(true);
      clone.classList.add('fs-2-drag-clone');
      clone.classList.remove('fs-2-ghost-source', 'fs-2-drop-target');
      for (const img of clone.querySelectorAll('img')) {
        img.draggable = false;
      }
      document.body.appendChild(clone);
      clone.style.position = 'fixed';
      clone.style.left = '0';
      clone.style.top = '0';
      clone.style.width = `${r.width}px`;
      clone.style.height = `${r.height}px`;
      clone.style.margin = '0';
      clone.style.zIndex = '10000';
      clone.style.pointerEvents = 'none';
      clone.style.boxSizing = 'border-box';
      draggedEl.classList.add('fs-2-ghost-source');
    }

    if (isDragging && clone) {
      const deg = rotationStyleDeg(draggedEl);
      clone.style.transform = `translate(${e.clientX - grabOffsetX}px, ${e.clientY - grabOffsetY}px) rotate(${deg}deg)`;
      clearDropHighlights();
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const target = under?.closest?.('.fs-2-img');
      if (target && target !== draggedEl && container.contains(target)) {
        target.classList.add('fs-2-drop-target');
      }
    }
  }

  function onDocUp(e) {
    if (e.pointerId !== activePointerId) return;

    if (isDragging && clone) {
      const x = e.clientX;
      const y = e.clientY;
      clone.style.visibility = 'hidden';
      const under = document.elementFromPoint(x, y);
      clone.style.visibility = 'visible';
      const target = under?.closest?.('.fs-2-img');
      if (target && target !== draggedEl && container.contains(target)) {
        swapElements(draggedEl, target);
      }
    } else if (draggedEl && !isDragging) {
      rotateItem(draggedEl);
    }

    removeClone();
    draggedEl?.classList.remove('fs-2-ghost-source');
    clearDropHighlights();
    isDragging = false;
    draggedEl = null;
    endSession();

    requestAnimationFrame(() => updateFs2SolvedState(container));

    if (suppressClick) {
      const clear = () => {
        suppressClick = false;
      };
      requestAnimationFrame(() => requestAnimationFrame(clear));
    }
  }

  container.addEventListener(
    'click',
    (e) => {
      if (!suppressClick) return;
      e.preventDefault();
      e.stopPropagation();
    },
    true,
  );

  container.addEventListener('pointerdown', (e) => {
    const item = e.target.closest('.fs-2-img');
    if (!item || !container.contains(item) || e.button !== 0) return;

    e.preventDefault();
    sessionAbort = new AbortController();
    const { signal } = sessionAbort;

    activePointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    draggedEl = item;
    isDragging = false;
    suppressClick = false;

    window.addEventListener('pointermove', onDocMove, { capture: true, signal });
    window.addEventListener('pointerup', onDocUp, { capture: true, signal });
    window.addEventListener('pointercancel', onDocUp, { capture: true, signal });
  });
}

const SS_GAME_SOLUTION = [4, 6, 1, 3, 5, 2];

function ssGameCardId(el) {
  const raw = el.getAttribute('data-ss-id');
  if (raw == null || raw === '') return NaN;
  return Number.parseInt(raw, 10);
}

function updateSsGameSolvedState(container) {
  const items = [...container.querySelectorAll('.ss-game-img')];
  const ok =
    items.length === SS_GAME_SOLUTION.length &&
    items.every((el, i) => ssGameCardId(el) === SS_GAME_SOLUTION[i]);
  container.classList.toggle('ss-game--solved', ok);
}

function initSsGameDrag() {
  const container = document.querySelector('.ss-game');
  if (!container) return;

  const items = () => [...container.querySelectorAll('.ss-game-img')];

  for (const img of container.querySelectorAll('img')) {
    img.draggable = false;
  }
  container.addEventListener('dragstart', (e) => e.preventDefault());

  updateSsGameSolvedState(container);

  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let draggedEl = null;
  let clone = null;
  let grabOffsetX = 0;
  let grabOffsetY = 0;
  let isDragging = false;
  let sessionAbort = null;
  let suppressClick = false;

  function clearDropHighlights() {
    for (const el of items()) el.classList.remove('ss-game-drop-target');
  }

  function removeClone() {
    clone?.remove();
    clone = null;
  }

  function endSession() {
    if (!sessionAbort) return;
    sessionAbort.abort();
    sessionAbort = null;
    activePointerId = null;
    clearDropHighlights();
  }

  function onDocMove(e) {
    if (e.pointerId !== activePointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!isDragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      isDragging = true;
      suppressClick = true;
      const r = draggedEl.getBoundingClientRect();
      grabOffsetX = startX - r.left;
      grabOffsetY = startY - r.top;
      clone = draggedEl.cloneNode(true);
      clone.classList.add('ss-game-drag-clone');
      clone.classList.remove('ss-game-ghost-source', 'ss-game-drop-target');
      for (const img of clone.querySelectorAll('img')) {
        img.draggable = false;
      }
      document.body.appendChild(clone);
      clone.style.position = 'fixed';
      clone.style.left = '0';
      clone.style.top = '0';
      clone.style.width = `${r.width}px`;
      clone.style.height = `${r.height}px`;
      clone.style.margin = '0';
      clone.style.zIndex = '10000';
      clone.style.pointerEvents = 'none';
      clone.style.boxSizing = 'border-box';
      draggedEl.classList.add('ss-game-ghost-source');
    }

    if (isDragging && clone) {
      clone.style.transform = `translate(${e.clientX - grabOffsetX}px, ${e.clientY - grabOffsetY}px)`;
      clearDropHighlights();
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const target = under?.closest?.('.ss-game-img');
      if (target && target !== draggedEl && container.contains(target)) {
        target.classList.add('ss-game-drop-target');
      }
    }
  }

  function onDocUp(e) {
    if (e.pointerId !== activePointerId) return;

    if (isDragging && clone) {
      const x = e.clientX;
      const y = e.clientY;
      clone.style.visibility = 'hidden';
      const under = document.elementFromPoint(x, y);
      clone.style.visibility = 'visible';
      const target = under?.closest?.('.ss-game-img');
      if (target && target !== draggedEl && container.contains(target)) {
        swapElements(draggedEl, target);
      }
      updateSsGameSolvedState(container);
    }

    removeClone();
    draggedEl?.classList.remove('ss-game-ghost-source');
    clearDropHighlights();
    isDragging = false;
    draggedEl = null;
    endSession();

    if (suppressClick) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        suppressClick = false;
      }));
    }
  }

  container.addEventListener(
    'click',
    (e) => {
      if (!suppressClick) return;
      e.preventDefault();
      e.stopPropagation();
    },
    true,
  );

  container.addEventListener('pointerdown', (e) => {
    const item = e.target.closest('.ss-game-img');
    if (!item || !container.contains(item) || e.button !== 0) return;

    e.preventDefault();
    sessionAbort = new AbortController();
    const { signal } = sessionAbort;

    activePointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    draggedEl = item;
    isDragging = false;
    suppressClick = false;

    window.addEventListener('pointermove', onDocMove, { capture: true, signal });
    window.addEventListener('pointerup', onDocUp, { capture: true, signal });
    window.addEventListener('pointercancel', onDocUp, { capture: true, signal });
  });
}

function initThirdSectionWords() {
  const section = document.querySelector('.third-section');
  if (!section) return;

  const tsWordOrder = [...section.querySelectorAll(':scope > p')];
  const starPlaceholders = new Map();

  for (const p of tsWordOrder) {
    p.classList.add('ts-word');
  }

  for (const img of section.querySelectorAll('.square-star')) {
    img.draggable = false;
  }
  section.addEventListener('dragstart', (e) => e.preventDefault());

  function squareWordCount(wordsEl) {
    return wordsEl.querySelectorAll(':scope > p').length;
  }

  function tsStarSrcForWord(p) {
    let slot = 0;
    for (let n = 1; n <= 14; n += 1) {
      if (p.classList.contains(`p${n}`)) {
        slot = n;
        break;
      }
    }
    if (slot === 0) slot = tsWordOrder.indexOf(p) + 1;
    slot = Math.min(Math.max(slot, 1), 16);
    const file = slot === 16 ? 'star16.svg' : `star-${slot}.svg`;
    return `./img/third-section/${file}`;
  }

  function tsPositionClassForWord(p) {
    for (let n = 1; n <= 14; n += 1) {
      if (p.classList.contains(`p${n}`)) return `p${n}`;
    }
    const i = tsWordOrder.indexOf(p);
    return i >= 0 ? `p${i + 1}` : 'p1';
  }

  function insertStarAfterWordLeaves(p) {
    const i = tsWordOrder.indexOf(p);
    if (i === -1) return;
    let before = null;
    for (let j = i + 1; j < tsWordOrder.length; j += 1) {
      const q = tsWordOrder[j];
      if (q.parentNode === section) {
        before = q;
        break;
      }
    }
    let img = starPlaceholders.get(p);
    if (!img) {
      img = document.createElement('img');
      img.className = 'ts-word-star';
      img.alt = '';
      img.draggable = false;
      starPlaceholders.set(p, img);
    }
    img.src = tsStarSrcForWord(p);
    img.className = `ts-word-star ${tsPositionClassForWord(p)}`;
    section.insertBefore(img, before);
  }

  function removeStarPlaceholder(p) {
    const img = starPlaceholders.get(p);
    if (img) {
      img.remove();
      starPlaceholders.delete(p);
    }
  }

  function restoreWordToOriginalSlot(p) {
    removeStarPlaceholder(p);
    const i = tsWordOrder.indexOf(p);
    if (i === -1) return;
    let before = null;
    for (let j = i + 1; j < tsWordOrder.length; j += 1) {
      const q = tsWordOrder[j];
      if (q.parentNode === section) {
        before = q;
        break;
      }
    }
    section.insertBefore(p, before);
    p.classList.remove('ts-word--in-square');
  }

  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let draggedEl = null;
  let clone = null;
  let grabOffsetX = 0;
  let grabOffsetY = 0;
  let isDragging = false;
  let sessionAbort = null;
  let dragOriginParent = null;
  let dragOriginNext = null;

  function removeClone() {
    clone?.remove();
    clone = null;
  }

  function endSession() {
    if (!sessionAbort) return;
    sessionAbort.abort();
    sessionAbort = null;
    activePointerId = null;
  }

  function snapBackToOrigin(p) {
    if (dragOriginParent === section) {
      return;
    }
    if (dragOriginParent?.classList?.contains('ts-square-words')) {
      if (dragOriginNext && dragOriginNext.parentNode === dragOriginParent) {
        dragOriginParent.insertBefore(p, dragOriginNext);
      } else {
        dragOriginParent.appendChild(p);
      }
    }
  }

  function onDocMove(e) {
    if (e.pointerId !== activePointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!isDragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      isDragging = true;
      const r = draggedEl.getBoundingClientRect();
      grabOffsetX = startX - r.left;
      grabOffsetY = startY - r.top;
      clone = draggedEl.cloneNode(true);
      clone.classList.add('ts-word-clone');
      clone.classList.remove('ts-word-ghost', 'ts-word--in-square');
      for (let i = 1; i <= 14; i += 1) {
        clone.classList.remove(`p${i}`);
      }
      document.body.appendChild(clone);
      clone.style.position = 'fixed';
      clone.style.left = `${e.clientX - grabOffsetX}px`;
      clone.style.top = `${e.clientY - grabOffsetY}px`;
      clone.style.boxSizing = 'border-box';
      draggedEl.classList.add('ts-word-ghost');
    }

    if (isDragging && clone) {
      clone.style.left = `${e.clientX - grabOffsetX}px`;
      clone.style.top = `${e.clientY - grabOffsetY}px`;
    }
  }

  function onDocUp(e) {
    if (e.pointerId !== activePointerId) return;

    if (isDragging && clone) {
      clone.style.visibility = 'hidden';
      const under = document.elementFromPoint(e.clientX, e.clientY);
      clone.style.visibility = 'visible';
      let wordsHost = under?.closest?.('.ts-square-words');
      if (!wordsHost) {
        const sq = under?.closest?.('.ts-content-square');
        if (sq && section.contains(sq)) {
          wordsHost = sq.querySelector('.ts-square-words');
        }
      }

      if (wordsHost && section.contains(wordsHost)) {
        const sameHost = dragOriginParent === wordsHost;
        const count = squareWordCount(wordsHost);
        const wouldAdd = !sameHost;
        if (!wouldAdd || count < TS_MAX_WORDS_PER_SQUARE) {
          const cameFromField = dragOriginParent === section;
          wordsHost.appendChild(draggedEl);
          draggedEl.classList.add('ts-word--in-square');
          if (cameFromField) {
            insertStarAfterWordLeaves(draggedEl);
          }
        } else {
          snapBackToOrigin(draggedEl);
        }
      } else if (dragOriginParent?.classList?.contains('ts-square-words')) {
        restoreWordToOriginalSlot(draggedEl);
      }
    }

    removeClone();
    draggedEl?.classList.remove('ts-word-ghost');
    draggedEl = null;
    endSession();
  }

  section.addEventListener('pointerdown', (e) => {
    const p = e.target.closest('p');
    if (!p || !section.contains(p) || !p.classList.contains('ts-word') || e.button !== 0) {
      return;
    }

    e.preventDefault();
    sessionAbort = new AbortController();
    const { signal } = sessionAbort;

    activePointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    draggedEl = p;
    dragOriginParent = p.parentNode;
    dragOriginNext = p.nextSibling;
    isDragging = false;

    window.addEventListener('pointermove', onDocMove, { capture: true, signal });
    window.addEventListener('pointerup', onDocUp, { capture: true, signal });
    window.addEventListener('pointercancel', onDocUp, { capture: true, signal });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initFs2Grid();
  initSsGameDrag();
  initThirdSectionWords();
});
