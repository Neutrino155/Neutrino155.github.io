async function initGallery() {
const idResponse = await fetch('mp-id-map.json');
if (!idResponse.ok) throw new Error(`MP-ID map request failed (${idResponse.status})`);
const materialIds = await idResponse.json();
const table = document.querySelector('#results-table');
const body = table.querySelector('tbody');
const columns = [
  {label: 'Branch', source: 0, type: 'number'},
  {label: 'MP ID', type: 'text'},
  {label: 'Formula', source: 1, type: 'text'},
  {label: 'Switching', source: 2, type: 'switching'},
  {label: 'P (µC/cm²)', source: 3, type: 'number'},
  {label: 'Barrier (meV/atom)', source: 4, type: 'number'},
  {label: 'Max distortion (Å)', source: 5, type: 'number'},
  {label: 'Polar SG', source: 11, type: 'text'},
  {label: 'Nonpolar SG', source: 12, type: 'text'},
  {label: 'Atoms', source: 10, type: 'number'},
  {label: 'Fit', source: 6, type: 'number'},
  {label: 'R²', source: 7, type: 'number'},
  {label: 'Branches', source: 8, type: 'number'},
  {label: 'Parents', source: 9, type: 'number'},
  {label: 'Dataset', source: 13, type: 'text'},
  {label: 'Report', source: 16, type: 'text'},
];
const headerRow = table.querySelector('thead tr');
headerRow.replaceChildren(...columns.map(column => {
  const heading = document.createElement('th');
  heading.setAttribute('aria-sort', 'none');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sort-button';
  button.dataset.sortType = column.type;
  button.textContent = column.label;
  const indicator = document.createElement('span');
  indicator.setAttribute('aria-hidden', 'true');
  indicator.textContent = '↕';
  button.append(indicator);
  heading.append(button);
  return heading;
}));
for (const row of Array.from(body.querySelectorAll('tr'))) {
  if (!row.dataset.previewPayload) {
    row.remove();
    continue;
  }
  const sourceCells = Array.from(row.cells);
  const sourcePath = sourceCells[14]?.dataset.sortValue || '';
  const mpId = materialIds[sourcePath];
  if (!mpId) throw new Error(`No MP ID found for ${sourcePath || 'a gallery row'}`);
  const idCell = document.createElement('td');
  idCell.dataset.sortValue = mpId;
  const idLink = document.createElement('a');
  idLink.href = `https://materialsproject.org/materials/${encodeURIComponent(mpId)}`;
  idLink.target = '_blank';
  idLink.rel = 'noopener noreferrer';
  idLink.textContent = mpId;
  idLink.title = `Open ${mpId} in the Materials Project`;
  idCell.append(idLink);
  const reorderedCells = columns.map(column => column.source === undefined ? idCell : sourceCells[column.source]);
  const fitCell = reorderedCells[10];
  const fitText = fitCell.textContent.toLowerCase();
  fitCell.textContent = fitText.includes('double well')
    ? fitText.includes('no double well') ? 'No double well' : 'Double well'
    : 'Unavailable';
  if (reorderedCells[15].querySelector('a')) reorderedCells[15].querySelector('a').textContent = 'Details';
  row.replaceChildren(...reorderedCells);
  row.setAttribute('aria-expanded', 'false');
  row.setAttribute('aria-controls', 'preview-panel');
  row.dataset.previewCollection = sourcePath.startsWith('mp-ferroelectric-ext/') ? 'MP Ferroelectric Ext' : 'MP Ferroelectric';
  reorderedCells[14].textContent = row.dataset.previewCollection;
}
const tableWrap = document.getElementById('table-wrap');
const scrollRange = document.getElementById('table-scroll-range');
const syncScrollWidth = () => { const maximum = Math.max(0, tableWrap.scrollWidth - tableWrap.clientWidth); scrollRange.max = String(Math.ceil(maximum)); scrollRange.value = String(Math.round(tableWrap.scrollLeft)); scrollRange.disabled = maximum <= 0; };
scrollRange.addEventListener('input', () => { tableWrap.scrollLeft = Number(scrollRange.value); });
tableWrap.addEventListener('scroll', () => { const value = String(Math.round(tableWrap.scrollLeft)); if (scrollRange.value !== value) scrollRange.value = value; });
document.getElementById('scroll-left').addEventListener('click', () => { tableWrap.scrollBy({left: -Math.max(240, tableWrap.clientWidth * 0.7), behavior: 'smooth'}); });
document.getElementById('scroll-right').addEventListener('click', () => { tableWrap.scrollBy({left: Math.max(240, tableWrap.clientWidth * 0.7), behavior: 'smooth'}); });
new ResizeObserver(syncScrollWidth).observe(tableWrap);
window.addEventListener('resize', syncScrollWidth);
syncScrollWidth();
const previewEnergy = document.getElementById('preview-energy');
const previewPolarization = document.getElementById('preview-polarization');
const resultsLayout = document.querySelector('.results-layout');
const previewPanel = document.querySelector('.preview-panel');
previewPanel.hidden = true;
const mobilePreviewQuery = window.matchMedia('(max-width: 1120px)');
const previewDetailRow = document.createElement('tr');
previewDetailRow.className = 'preview-detail-row';
const previewDetailCell = document.createElement('td');
previewDetailCell.colSpan = table.querySelectorAll('thead th').length;
previewDetailRow.append(previewDetailCell);
let previewRow = null;
let previewRequest = 0;
function placePreviewPanel(row) {
  if (mobilePreviewQuery.matches && row && !row.hidden) {
    previewPanel.hidden = false;
    resultsLayout.classList.add('has-selection');
    previewDetailCell.replaceChildren(previewPanel);
    row.after(previewDetailRow);
  } else {
    previewDetailRow.remove();
    resultsLayout.append(previewPanel);
    previewPanel.hidden = !row;
    resultsLayout.classList.toggle('has-selection', Boolean(row));
  }
}
function closePreview() {
  previewRequest += 1;
  body.querySelectorAll('tr.preview-selected').forEach(item => {
    item.classList.remove('preview-selected');
    item.setAttribute('aria-expanded', 'false');
  });
  previewRow = null;
  placePreviewPanel(null);
}
mobilePreviewQuery.addEventListener('change', () => {
  if (previewRow && !previewRow.hidden) selectPreview(previewRow);
  else closePreview();
});
function drawPreviewChart(canvas, title, series, yUnit, digits, coordinates) {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width < 10 || !series.some(item => item.values.length)) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(bounds.width * ratio));
  canvas.height = Math.max(1, Math.round(bounds.height * ratio));
  const c = canvas.getContext('2d'); c.setTransform(ratio, 0, 0, ratio, 0, 0);
  const width = bounds.width, height = bounds.height, left = 43, right = 8, top = 22, bottom = 10;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const pathCoordinates = coordinates?.length === series[0].values.length
    ? coordinates : series[0].values.map((_, index) => 1 - 2 * index / Math.max(1, series[0].values.length - 1));
  const coordinateHigh = Math.max(...pathCoordinates), coordinateLow = Math.min(...pathCoordinates);
  const xForCoordinate = coordinate => left + plotWidth * (coordinateHigh - coordinate) / Math.max(1e-12, coordinateHigh - coordinateLow);
  const all = series.flatMap(item => item.values.filter(Number.isFinite));
  if (!all.length) return;
  let low = Math.min(...all), high = Math.max(...all);
  if (high - low < 1e-8) { low -= 0.5; high += 0.5; }
  const padding = (high - low) * 0.12; low -= padding; high += padding;
  c.clearRect(0, 0, width, height); c.font = '10px system-ui'; c.fillStyle = '#496274'; c.fillText(title, 7, 14);
  for (let tick = 0; tick <= 3; tick += 1) {
    const y = top + plotHeight * tick / 3, value = high - (high - low) * tick / 3;
    c.strokeStyle = '#e5ebef'; c.beginPath(); c.moveTo(left, y); c.lineTo(width - right, y); c.stroke();
    c.fillStyle = '#718391'; c.textAlign = 'right'; c.fillText(value.toFixed(digits), left - 4, y + 3);
  }
  for (const item of series) {
    c.strokeStyle = item.color; c.lineWidth = 1.7; c.beginPath();
    item.values.forEach((value, index) => { const x = xForCoordinate(pathCoordinates[index]); const y = top + plotHeight * (high - value) / (high - low); index ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.stroke();
  }
  c.fillStyle = '#687f8e'; c.textAlign = 'center'; c.fillText('+P', xForCoordinate(1), height - 1); c.fillText('N', xForCoordinate(0), height - 1); c.fillText('−P', xForCoordinate(-1), height - 1);
}
function cartesianPreviewPolarization(frame) {
  const volume = Math.abs(frame.cell[0][0] * (frame.cell[1][1] * frame.cell[2][2] - frame.cell[1][2] * frame.cell[2][1]) - frame.cell[0][1] * (frame.cell[1][0] * frame.cell[2][2] - frame.cell[1][2] * frame.cell[2][0]) + frame.cell[0][2] * (frame.cell[1][0] * frame.cell[2][1] - frame.cell[1][1] * frame.cell[2][0]));
  return [0, 1, 2].map(axis => frame.cell.reduce((sum, vector, index) => sum + vector[axis] * frame.reduced_polarization[index], 0) / volume * 1602.176634);
}
async function selectPreview(row) {
  const payloadPath = row.dataset.previewPayload;
  if (!payloadPath) return;
  previewRow = row; previewRequest += 1; const request = previewRequest;
  body.querySelectorAll('tr.preview-selected').forEach(item => {
    item.classList.remove('preview-selected');
    item.setAttribute('aria-expanded', 'false');
  });
  row.classList.add('preview-selected');
  row.setAttribute('aria-expanded', 'true');
  placePreviewPanel(row);
  document.getElementById('preview-title').textContent = 'Loading branch…';
  try {
    const response = await fetch(payloadPath); if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json(); if (request !== previewRequest) return;
    const frames = payload.frames || [];
    const positiveIndex = Math.max(0, frames.findIndex(frame => frame.path_region === 'positive_polar_endpoint'));
    const endpointEnergy = frames[positiveIndex]?.energy_eV ?? frames[0]?.energy_eV ?? 0;
    const energies = frames.map(frame => (frame.energy_eV - endpointEnergy) / Math.max(1, payload.atom_count) * 1000);
    const coordinates = frames.map((frame, index) => Number.isFinite(frame.coordinate) ? frame.coordinate : 1 - 2 * index / Math.max(1, frames.length - 1));
    const polarizations = frames.map(cartesianPreviewPolarization);
    const path = payload.path_analysis || {};
    document.getElementById('preview-title').textContent = `${payload.formula || payload.query_id} · branch preview`;
    document.getElementById('preview-name').textContent = `${row.dataset.previewCollection} · ${payload.atom_count} atoms`;
    document.getElementById('preview-status').textContent = `Switch: ${(path.switching_status || 'unclear').toUpperCase()}`;
    document.getElementById('preview-barrier').textContent = `Barrier: ${Number.isFinite(path.barrier_mev_per_atom) ? path.barrier_mev_per_atom.toFixed(2) + ' meV/atom' : '—'}`;
    const fit = path.double_well_fit || {};
    document.getElementById('preview-fit').textContent = fit.available
      ? fit.detected_double_well ? 'Double well' : 'No double well'
      : 'Fit unavailable';
    document.getElementById('preview-open').href = `explorer/index.html?query=${encodeURIComponent(payload.query_id)}`;
    drawPreviewChart(previewEnergy, 'Energy above +P', [{values: energies, color: '#d87942'}], 'meV/atom', 1, coordinates);
    drawPreviewChart(previewPolarization, 'x red · y blue · z green', [
      {values: polarizations.map(value => value[0]), color: '#d95f68'},
      {values: polarizations.map(value => value[1]), color: '#377eb8'},
      {values: polarizations.map(value => value[2]), color: '#338c73'},
    ], 'µC/cm²', 1, coordinates);
  } catch (error) {
    if (request !== previewRequest) return;
    document.getElementById('preview-title').textContent = 'Preview unavailable';
    document.getElementById('preview-name').textContent = error.message;
  }
}
function togglePreview(row) {
  if (previewRow === row && !previewPanel.hidden) closePreview();
  else selectPreview(row);
}
body.addEventListener('click', event => { const row = event.target.closest('tr[data-preview-payload]'); if (row && !event.target.closest('a,button')) togglePreview(row); });
body.addEventListener('keydown', event => { const row = event.target.closest('tr[data-preview-payload]'); if (row && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); togglePreview(row); } });
document.querySelectorAll('.sort-button').forEach((button, column) => button.addEventListener('click', () => {
  const heading = button.closest('th');
  const ascending = heading.getAttribute('aria-sort') !== 'ascending';
  table.querySelectorAll('th').forEach(th => th.setAttribute('aria-sort', 'none'));
  heading.setAttribute('aria-sort', ascending ? 'ascending' : 'descending');
  const numeric = button.dataset.sortType === 'number';
  const switching = button.dataset.sortType === 'switching';
  const switchingRank = {positive: 0, unclear: 1, negative: 2};
  const selectedPreview = previewRow && !previewRow.hidden ? previewRow : null;
  previewDetailRow.remove();
  const rows = Array.from(body.querySelectorAll('tr[data-preview-payload]'));
  rows.sort((left, right) => {
    const a = left.cells[column].dataset.sortValue || '';
    const b = right.cells[column].dataset.sortValue || '';
    if (!a && !b) return Number(left.dataset.originalIndex) - Number(right.dataset.originalIndex);
    if (!a) return 1;
    if (!b) return -1;
    let order;
    if (switching) {
      order = (switchingRank[a.toLowerCase()] ?? 3) - (switchingRank[b.toLowerCase()] ?? 3);
    } else if (numeric) {
      const x = Number(a), y = Number(b);
      order = Number.isFinite(x) && Number.isFinite(y) ? x - y : a.localeCompare(b);
    } else order = a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'});
    return (ascending ? order : -order) || Number(left.dataset.originalIndex) - Number(right.dataset.originalIndex);
  });
  rows.forEach(row => body.append(row));
  if (selectedPreview) placePreviewPanel(selectedPreview);
}));
document.getElementById('filter').addEventListener('input',event=>{
  const q=event.target.value.toLowerCase();
  const rows=[...body.querySelectorAll('tr[data-preview-payload]')];
  rows.forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(q));
  if(previewRow?.hidden) closePreview();
});
syncScrollWidth();
}
initGallery().catch(error => {
  console.error('Could not prepare the ferroelectrics gallery:', error);
  document.querySelector('.summary').textContent = 'The gallery could not be loaded. Please refresh the page.';
});
