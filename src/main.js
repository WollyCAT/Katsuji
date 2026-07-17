const state = {
  selectedId: 'box-1',
  batchMode: false,
  exportStatus: 'Ready for high-quality export',
  drag: null,
  boxes: [{
    id: 'box-1', x: 120, y: 100, width: 430, height: 190,
    writingMode: 'horizontal-tb', direction: 'ltr', fontSize: 42, lineHeight: 1.35,
    color: '#141414', background: 'rgba(255,255,255,0.72)', text: '日本語の字幕を編集します', animation: 'fade-slide',
    segments: [
      { text: '日本語', color: '#1f4fd6', furigana: 'にほんご' },
      { text: 'の字幕を', color: '#141414', furigana: '' },
      { text: '編集', color: '#bd2d2d', furigana: 'へんしゅう' },
      { text: 'します', color: '#141414', furigana: '' }
    ]
  }]
};

const animations = { none: 'Static', fade: 'Fade in', 'fade-slide': 'Fade and slide', typewriter: 'Typewriter', emphasis: 'Emphasis pulse' };
const root = document.querySelector('#root');
const selected = () => state.boxes.find((box) => box.id === state.selectedId) ?? state.boxes[0];
const updateBox = (id, patch) => { state.boxes = state.boxes.map((box) => box.id === id ? { ...box, ...patch } : box); render(); };
const updateSelected = (patch) => updateBox(selected().id, patch);
const escapeHtml = (value) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

function render() {
  const box = selected();
  const vertical = state.boxes.filter((item) => item.writingMode === 'vertical-rl').length;
  root.innerHTML = `<main class="app">
    <aside class="panel left">
      <h1>Katsuji</h1>
      <p>Japanese text animation editor with editable furigana, vertical composition, color ranges, batch movement, and video export planning.</p>
      <button data-action="add-box">Add text box</button>
      <button class="${state.batchMode ? 'active' : ''}" data-action="batch">Batch move ${state.batchMode ? 'on' : 'off'}</button>
      <button data-action="delete" ${state.boxes.length === 1 ? 'disabled' : ''}>Delete selected</button>
      <section><h2>Timeline</h2>${state.boxes.map((item, index) => `<button data-select="${item.id}" class="row ${item.id === box.id ? 'active' : ''}">${index + 1}. ${escapeHtml(item.segments.map((s) => s.text).join(''))}</button>`).join('')}</section>
      <div class="status">${state.boxes.length} text boxes, ${vertical} vertical, ${state.boxes.length - vertical} horizontal</div>
    </aside>
    <section class="stageWrap"><div class="stage">${state.boxes.map(renderBox).join('')}</div></section>
    <aside class="panel right">
      <h2>Text properties</h2>
      <label>Plain text<textarea data-field="text">${escapeHtml(box.text)}</textarea></label>
      <div class="grid"><label>X<input type="number" data-field="x" value="${box.x}"></label><label>Y<input type="number" data-field="y" value="${box.y}"></label><label>Size<input type="number" data-field="fontSize" value="${box.fontSize}"></label><label>Line<input type="number" step="0.05" data-field="lineHeight" value="${box.lineHeight}"></label></div>
      <label>Layout<select data-field="writingMode"><option value="horizontal-tb" ${box.writingMode === 'horizontal-tb' ? 'selected' : ''}>Horizontal</option><option value="vertical-rl" ${box.writingMode === 'vertical-rl' ? 'selected' : ''}>Vertical right-to-left</option></select></label>
      <label>Animation<select data-field="animation">${Object.entries(animations).map(([value, label]) => `<option value="${value}" ${box.animation === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      <section><h2>Furigana and color ranges</h2>${box.segments.map((segment, index) => `<div class="segment"><input data-segment="${index}" data-key="text" value="${escapeHtml(segment.text)}"><input data-segment="${index}" data-key="furigana" placeholder="furigana" value="${escapeHtml(segment.furigana)}"><input type="color" data-segment="${index}" data-key="color" value="${segment.color}"></div>`).join('')}<button data-action="add-segment">Add range</button></section>
      <section><h2>Export</h2><p>${state.exportStatus}</p><button class="primary" data-action="export">Export video manifest</button></section>
    </aside>
  </main>`;
  bind();
}

function renderBox(box) {
  const style = `left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${box.height}px;writing-mode:${box.writingMode};direction:${box.direction};font-size:${box.fontSize}px;line-height:${box.lineHeight};background:${box.background}`;
  const ruby = box.segments.map((segment) => `<ruby style="color:${segment.color}">${escapeHtml(segment.text)}<rt>${escapeHtml(segment.furigana)}</rt></ruby>`).join('');
  return `<div class="textBox ${box.id === state.selectedId ? 'selected' : ''} anim-${box.animation}" data-box="${box.id}" style="${style}">${ruby}</div>`;
}

function bind() {
  document.querySelectorAll('[data-action]').forEach((el) => el.onclick = handleAction);
  document.querySelectorAll('[data-select]').forEach((el) => el.onclick = () => { state.selectedId = el.dataset.select; render(); });
  document.querySelectorAll('[data-field]').forEach((el) => el.oninput = () => handleField(el));
  document.querySelectorAll('[data-segment]').forEach((el) => el.oninput = () => handleSegment(el));
  document.querySelectorAll('[data-box]').forEach((el) => {
    el.onpointerdown = (event) => startDrag(event, el.dataset.box, el);
    el.onpointermove = drag;
    el.onpointerup = stopDrag;
  });
}

function handleAction(event) {
  const action = event.currentTarget.dataset.action;
  if (action === 'add-box') addBox();
  if (action === 'batch') { state.batchMode = !state.batchMode; render(); }
  if (action === 'delete') deleteSelected();
  if (action === 'add-segment') { const box = selected(); updateSelected({ segments: [...box.segments, { text: '漢字', color: box.color, furigana: 'かんじ' }] }); }
  if (action === 'export') exportVideo();
}
function handleField(el) {
  const key = el.dataset.field;
  let value = ['x', 'y', 'fontSize', 'lineHeight'].includes(key) ? Number(el.value) : el.value;
  const patch = key === 'writingMode' ? { writingMode: value, direction: value === 'vertical-rl' ? 'rtl' : 'ltr' } : { [key]: value };
  if (key === 'text') patch.segments = [{ text: value, color: selected().color, furigana: selected().segments[0]?.furigana ?? '' }];
  updateSelected(patch);
}
function handleSegment(el) {
  const box = selected();
  const segments = box.segments.map((segment, index) => index === Number(el.dataset.segment) ? { ...segment, [el.dataset.key]: el.value } : segment);
  updateSelected({ segments });
}
function addBox() {
  const id = `box-${Date.now()}`;
  state.boxes.push({ id, x: 160 + state.boxes.length * 24, y: 140 + state.boxes.length * 24, width: 360, height: 160, writingMode: 'horizontal-tb', direction: 'ltr', fontSize: 36, lineHeight: 1.35, color: '#222222', background: 'rgba(255,255,255,0.7)', text: '新しい文字', segments: [{ text: '新しい文字', color: '#222222', furigana: 'あたらしいもじ' }], animation: 'fade' });
  state.selectedId = id; render();
}
function deleteSelected() { if (state.boxes.length > 1) { state.boxes = state.boxes.filter((box) => box.id !== state.selectedId); state.selectedId = state.boxes[0].id; render(); } }
function startDrag(event, id, el) { const box = state.boxes.find((item) => item.id === id); state.selectedId = id; state.drag = { id, startX: event.clientX, startY: event.clientY, x: box.x, y: box.y }; el.setPointerCapture(event.pointerId); render(); }
function drag(event) { if (!state.drag) return; const dx = event.clientX - state.drag.startX; const dy = event.clientY - state.drag.startY; if (state.batchMode) { state.boxes = state.boxes.map((box) => ({ ...box, x: box.x + dx, y: box.y + dy })); state.drag.startX = event.clientX; state.drag.startY = event.clientY; } else { state.boxes = state.boxes.map((box) => box.id === state.drag.id ? { ...box, x: state.drag.x + dx, y: state.drag.y + dy } : box); } render(); }
function stopDrag() { state.drag = null; }
function exportVideo() { const blob = new Blob([JSON.stringify({ format: 'webm/mp4 handoff', resolution: '3840x2160', fps: 60, boxes: state.boxes }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'katsuji-video-export.json'; anchor.click(); URL.revokeObjectURL(url); state.exportStatus = 'Export manifest prepared for 4K 60fps renderer'; render(); }

render();
