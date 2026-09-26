"use strict";

const $ = (id) => document.getElementById(id);
const initialQuery = new URLSearchParams(location.search).get("query");
const conversionToMicroCPerCm2 = 1602.176634;
const colors = {
  H: "#f6f7fb", C: "#35404b", N: "#4267d5", O: "#de5a55", F: "#57a85f",
  P: "#f28c36", S: "#e2be38", Cl: "#37a875", Ba: "#4f9c72", Ti: "#8795a3",
  Zr: "#688597", Pb: "#62606d", Bi: "#aa746e", Fe: "#d27443", Mn: "#8b68a8",
  Nb: "#758ba3", Ta: "#526b85", W: "#506372",
};
const periodicSymbols = [
  "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar",
  "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr",
  "Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe",
  "Cs", "Ba", "La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu",
  "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb", "Bi", "Po", "At", "Rn",
  "Fr", "Ra", "Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr",
  "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og",
];
function elementColor(symbol) {
  if (colors[symbol]) return colors[symbol];
  const atomicNumber = periodicSymbols.indexOf(symbol) + 1;
  const hue = ((Math.max(1, atomicNumber) * 137.508) % 360).toFixed(1);
  return `hsl(${hue} 62% 56%)`;
}
const radii = {
  H: 0.31, C: 0.76, N: 0.71, O: 0.66, F: 0.57, P: 1.07, S: 1.05, Cl: 1.02,
  Ba: 2.15, Ti: 1.6, Zr: 1.75, Pb: 1.46, Bi: 1.48, Fe: 1.32, Mn: 1.39,
  Nb: 1.64, Ta: 1.7, W: 1.62,
};
// ASE covalent radii in periodic-table order. Kept separately from the display
// radii above so bond finding works for elements outside the common oxide set.
const covalentRadii = [
  0.31, 0.28, 1.28, 0.96, 0.84, 0.76, 0.71, 0.66, 0.57, 0.58, 1.66, 1.41,
  1.21, 1.11, 1.07, 1.05, 1.02, 1.06, 2.03, 1.76, 1.70, 1.60, 1.53, 1.39,
  1.39, 1.32, 1.26, 1.24, 1.32, 1.22, 1.22, 1.20, 1.19, 1.20, 1.20, 1.16,
  2.20, 1.95, 1.90, 1.75, 1.64, 1.54, 1.47, 1.46, 1.42, 1.39, 1.45, 1.44,
  1.42, 1.39, 1.39, 1.38, 1.39, 1.40, 2.44, 2.15, 2.07, 2.04, 2.03, 2.01,
  1.99, 1.98, 1.98, 1.96, 1.94, 1.92, 1.92, 1.89, 1.90, 1.87, 1.87, 1.75,
  1.70, 1.62, 1.51, 1.44, 1.41, 1.36, 1.36, 1.32, 1.45, 1.46, 1.48, 1.40,
  1.50, 1.50, 2.60, 2.21, 2.15, 2.06, 2.00, 1.96, 1.90, 1.87, 1.80, 1.69,
  0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20,
  0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20,
];

let data;
let frameIndex = 0;
let selectedAtom = 0;
let yaw = 0.72;
let pitch = -0.42;
let zoom = 1;
let structureView = "3d";
let pan = { x: 0, y: 0 };
let playing = null;
let playDirection = 1;
let drag = null;
let chartDrag = null;
let lastProjectedAtoms = [];
let polyhedraCache = new WeakMap();
let coordinationCache = new WeakMap();
let coordinationTemplatesCache = new WeakMap();
let coordinationTemplateBuilds = new WeakMap();
let bondsCache = new WeakMap();

function finite(value, fallback = NaN) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function fmt(value, digits = 3) {
  const number = finite(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}

function norm(vector) {
  return Math.hypot(...vector);
}

function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function unit(vector) {
  const length = norm(vector);
  return length > 1e-12 ? vector.map((value) => value / length) : [1, 0, 0];
}

function cartesian(fractional, cell) {
  return [0, 1, 2].map((axis) =>
    fractional.reduce((sum, value, vector) => sum + value * cell[vector][axis], 0),
  );
}

function imageTranslationRanges(delta, maximumDistance, inverseCell) {
  return [0, 1, 2].map((axis) => {
    const fractionalReach = maximumDistance * Math.hypot(
      inverseCell[0][axis], inverseCell[1][axis], inverseCell[2][axis],
    );
    return [
      Math.ceil(-delta[axis] - fractionalReach - 1e-10),
      Math.floor(-delta[axis] + fractionalReach + 1e-10),
    ];
  });
}

function determinant(matrix) {
  return matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1])
    - matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0])
    + matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);
}

function inverse3(a) {
  const d = determinant(a);
  if (Math.abs(d) < 1e-12) throw new Error("cell matrix is singular");
  return [
    [(a[1][1] * a[2][2] - a[1][2] * a[2][1]) / d, (a[0][2] * a[2][1] - a[0][1] * a[2][2]) / d, (a[0][1] * a[1][2] - a[0][2] * a[1][1]) / d],
    [(a[1][2] * a[2][0] - a[1][0] * a[2][2]) / d, (a[0][0] * a[2][2] - a[0][2] * a[2][0]) / d, (a[0][2] * a[1][0] - a[0][0] * a[1][2]) / d],
    [(a[1][0] * a[2][1] - a[1][1] * a[2][0]) / d, (a[0][1] * a[2][0] - a[0][0] * a[2][1]) / d, (a[0][0] * a[1][1] - a[0][1] * a[1][0]) / d],
  ];
}

function multiply3(a, b) {
  return a.map((row) => b[0].map((_, j) => row.reduce((sum, value, k) => sum + value * b[k][j], 0)));
}

function cellVolume(cell) {
  return Math.abs(determinant(cell));
}

function cartesianPolarization(frame) {
  const cell = frame.cell;
  const reduced = frame.reduced_polarization;
  const volume = cellVolume(cell);
  return [0, 1, 2].map((axis) =>
    cell.reduce((sum, vector, index) => sum + vector[axis] * reduced[index], 0)
      / volume * conversionToMicroCPerCm2,
  );
}

function cellParameters(cell) {
  const lengths = cell.map(norm);
  const angle = (u, v) => Math.acos(Math.max(-1, Math.min(1,
    u.reduce((sum, x, i) => sum + x * v[i], 0) / (norm(u) * norm(v)),
  ))) * 180 / Math.PI;
  return { lengths, angles: [angle(cell[1], cell[2]), angle(cell[0], cell[2]), angle(cell[0], cell[1])] };
}

function principalStretches(deformation) {
  const transpose = deformation[0].map((_, column) => deformation.map((row) => row[column]));
  const symmetric = multiply3(deformation, transpose);
  // Jacobi diagonalization of F F^T; eigenvalue square roots are principal stretches.
  for (let iteration = 0; iteration < 24; iteration += 1) {
    let p = 0;
    let q = 1;
    for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) {
      if (Math.abs(symmetric[i][j]) > Math.abs(symmetric[p][q])) [p, q] = [i, j];
    }
    if (Math.abs(symmetric[p][q]) < 1e-12) break;
    const angle = 0.5 * Math.atan2(2 * symmetric[p][q], symmetric[q][q] - symmetric[p][p]);
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const app = symmetric[p][p];
    const aqq = symmetric[q][q];
    const apq = symmetric[p][q];
    symmetric[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    symmetric[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    symmetric[p][q] = symmetric[q][p] = 0;
    for (const k of [0, 1, 2]) {
      if (k === p || k === q) continue;
      const akp = symmetric[k][p];
      const akq = symmetric[k][q];
      symmetric[k][p] = symmetric[p][k] = c * akp - s * akq;
      symmetric[k][q] = symmetric[q][k] = s * akp + c * akq;
    }
  }
  return [0, 1, 2].map((i) => Math.sqrt(Math.max(0, symmetric[i][i]))).sort((a, b) => a - b);
}

function distortions(frame) {
  const initial = data.frames[positivePolarFrameIndex()];
  const deformation = multiply3(inverse3(initial.cell), frame.cell);
  let strainSquared = 0;
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      strainSquared += (deformation[i][j] - (i === j ? 1 : 0)) ** 2;
    }
  }
  const displacementSquared = frame.fractional_positions.reduce((sum, position, atom) => {
    const delta = position.map((value, axis) => {
      let difference = value - initial.fractional_positions[atom][axis];
      difference -= Math.round(difference);
      return difference;
    });
    return sum + norm(cartesian(delta, frame.cell)) ** 2;
  }, 0);
  const stretches = principalStretches(deformation);
  return {
    atomRmsA: Math.sqrt(displacementSquared / Math.max(1, frame.fractional_positions.length)),
    rmsStrainPercent: 100 * Math.sqrt(strainSquared / 3),
    maximumStretchDeviationPercent: 100 * Math.max(...stretches.map((x) => Math.abs(x - 1))),
    volumeChangePercent: 100 * (cellVolume(frame.cell) / cellVolume(initial.cell) - 1),
    stretches,
  };
}

function frameCoordinate(frame, index) {
  return finite(frame.coordinate, 1 - 2 * index / Math.max(1, data.frames.length - 1));
}

function positivePolarFrameIndex() {
  const tagged = data.frames.findIndex((frame) =>
    frame.path_region === "positive_polar_endpoint" || frame.polar_endpoint === "positive",
  );
  return tagged >= 0 ? tagged : 0;
}

function negativePolarFrameIndex() {
  let tagged = -1;
  data.frames.forEach((frame, index) => {
    if (frame.path_region === "negative_polar_endpoint" || frame.polar_endpoint === "negative") tagged = index;
  });
  return tagged >= 0 ? tagged : data.frames.length - 1;
}

function coordinateExtent() {
  const coordinates = data.frames.map((frame, index) => frameCoordinate(frame, index));
  return { high: Math.max(...coordinates), low: Math.min(...coordinates) };
}

function xForCoordinate(coordinate, left, width) {
  const { high, low } = coordinateExtent();
  return left + width * (high - coordinate) / Math.max(1e-12, high - low);
}

function quantumMatrix(frame) {
  const volume = cellVolume(frame.cell);
  return [0, 1, 2].map((cartAxis) =>
    [0, 1, 2].map((vector) => frame.cell[vector][cartAxis] / volume * conversionToMicroCPerCm2),
  );
}

function resizeCanvas(canvas) {
  const bounds = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(bounds.width * ratio));
  canvas.height = Math.max(1, Math.round(bounds.height * ratio));
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width: bounds.width, height: bounds.height };
}

function tooltipAt(event, index) {
  const frame = data.frames[index];
  const polarIndex = positivePolarFrameIndex();
  const energies = data.frames.map((item) =>
    (item.energy_eV - data.frames[polarIndex].energy_eV) / Math.max(1, data.atom_count) * 1000,
  );
  const barrier = Math.max(...energies);
  const polarization = cartesianPolarization(frame);
  const reduced = frame.reduced_polarization.map((value) => fmt(value, 4));
  const tooltip = $("chart-tooltip");
  tooltip.className = "sample-tooltip";
  tooltip.textContent = [
    `Image ${index + 1} / ${data.frames.length}  ·  branch ${fmt(frame.coordinate, 3)}`,
    `Energy above +P: ${fmt(energies[index], 2)} meV/atom`,
    `Maximum sampled rise from +P: ${fmt(barrier, 2)} meV/atom`,
    `P = (${polarization.map((value) => fmt(value, 2)).join(", ")}) µC/cm²`,
    `Reduced p = (${reduced.join(", ")}) quanta`,
  ].join("\n");
  tooltip.style.display = "block";
  tooltip.style.left = `${Math.min(window.innerWidth - 345, event.clientX + 12)}px`;
  tooltip.style.top = `${Math.min(window.innerHeight - 160, event.clientY + 12)}px`;
}

function chartImageIndex(canvas, event) {
  const bounds = canvas.getBoundingClientRect();
  const chartLeft = finite(canvas.dataset.chartLeft, 52);
  const chartWidth = finite(canvas.dataset.chartWidth, bounds.width - 64);
  const x = event.clientX - bounds.left;
  const fraction = Math.max(0, Math.min(1, (x - chartLeft) / chartWidth));
  const { high, low } = coordinateExtent();
  const target = high - fraction * (high - low);
  return data.frames.reduce((best, frame, index) =>
    Math.abs(frameCoordinate(frame, index) - target) < Math.abs(frameCoordinate(data.frames[best], best) - target)
      ? index : best, 0);
}

function scrubFromChart(canvas, event) {
  const nextIndex = chartImageIndex(canvas, event);
  if (nextIndex !== frameIndex) {
    frameIndex = nextIndex;
    draw();
  }
  tooltipAt(event, frameIndex);
}

function branchChart(canvas, title, series, selectedIndex) {
  const { context: c, width, height } = resizeCanvas(canvas);
  const left = 52;
  const right = 12;
  const top = 24;
  const bottom = 27;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const values = series.flatMap((item) => item.values.filter(Number.isFinite));
  if (!values.length) return;
  let low = Math.min(...values);
  let high = Math.max(...values);
  if (Math.abs(high - low) < 1e-9) high = low + 1;
  const padding = (high - low) * 0.12;
  low -= padding;
  high += padding;
  c.clearRect(0, 0, width, height);
  c.font = "11px system-ui";
  c.fillStyle = "#294b60";
  c.fillText(title, 7, 15);
  c.strokeStyle = "#e0e8ed";
  for (let tick = 0; tick <= 4; tick += 1) {
    const y = top + plotHeight * tick / 4;
    const value = high - (high - low) * tick / 4;
    c.beginPath();
    c.moveTo(left, y);
    c.lineTo(width - right, y);
    c.stroke();
    c.fillStyle = "#718391";
    c.textAlign = "right";
    c.fillText(fmt(value, title.startsWith("Energy") ? 0 : 1), left - 5, y + 4);
  }
  c.textAlign = "left";
  const xFor = (index) => xForCoordinate(frameCoordinate(data.frames[index], index), left, plotWidth);
  for (const item of series) {
    c.strokeStyle = item.color;
    c.lineWidth = 2;
    c.setLineDash(item.dash || []);
    c.beginPath();
    item.values.forEach((value, index) => {
      const x = xFor(index);
      const y = top + plotHeight * (high - value) / (high - low);
      index ? c.lineTo(x, y) : c.moveTo(x, y);
    });
    c.stroke();
  }
  c.setLineDash([]);
  const markerX = xFor(selectedIndex);
  c.strokeStyle = "#263e50";
  c.setLineDash([4, 4]);
  c.beginPath();
  c.moveTo(markerX, top);
  c.lineTo(markerX, top + plotHeight);
  c.stroke();
  c.setLineDash([]);
  c.fillStyle = "#70818d";
  c.textAlign = "center";
  c.fillText("+P", xForCoordinate(1, left, plotWidth), top + plotHeight + 19);
  c.fillText("N", xForCoordinate(0, left, plotWidth), top + plotHeight + 19);
  c.fillText("−P", xForCoordinate(-1, left, plotWidth), top + plotHeight + 19);
  if (coordinateExtent().high > 1.02) c.fillText("extension", left + 4, top + 12);
  if (coordinateExtent().low < -1.02) c.fillText("extension", width - right - 4, top + 12);
  canvas.dataset.chartLeft = String(left);
  canvas.dataset.chartWidth = String(plotWidth);
  if (!canvas.dataset.eventsReady) {
    canvas.dataset.eventsReady = "true";
    canvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      chartDrag = { canvas, pointerId: event.pointerId };
      canvas.setPointerCapture(event.pointerId);
      scrubFromChart(canvas, event);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (chartDrag?.canvas === canvas && chartDrag.pointerId === event.pointerId) {
        scrubFromChart(canvas, event);
      } else {
        tooltipAt(event, chartImageIndex(canvas, event));
      }
    });
    const endChartDrag = (event) => {
      if (chartDrag?.canvas === canvas && chartDrag.pointerId === event.pointerId) {
        chartDrag = null;
      }
    };
    canvas.addEventListener("pointerup", endChartDrag);
    canvas.addEventListener("pointercancel", endChartDrag);
    canvas.addEventListener("lostpointercapture", endChartDrag);
    canvas.addEventListener("pointerleave", () => {
      if (chartDrag?.canvas !== canvas) $("chart-tooltip").style.display = "none";
    });
    canvas.addEventListener("click", (event) => {
      frameIndex = chartImageIndex(canvas, event);
      draw();
    });
  }
}

function projectionBasis(cell) {
  const pairs = { ab: [0, 1], bc: [1, 2], ca: [2, 0] };
  const [firstIndex, secondIndex] = pairs[structureView] || [0, 1];
  const first = cell[firstIndex];
  const second = cell[secondIndex];
  const horizontal = unit(first);
  const vertical = unit(second.map((value, index) => value - dot(second, horizontal) * horizontal[index]));
  return { horizontal, vertical, depth: unit(cross(horizontal, vertical)), firstIndex, secondIndex };
}

function project(point, cell, width, height) {
  const center = cartesian([0.5, 0.5, 0.5], cell);
  const vector = point.map((value, i) => value - center[i]);
  if (structureView !== "3d") {
    const basis = projectionBasis(cell);
    const horizontalExtent = cell.reduce((sum, vector0) => sum + Math.abs(dot(vector0, basis.horizontal)), 0);
    const verticalExtent = cell.reduce((sum, vector0) => sum + Math.abs(dot(vector0, basis.vertical)), 0);
    const scale = Math.min(
      width * 0.76 / Math.max(horizontalExtent, 1e-8),
      height * 0.72 / Math.max(verticalExtent, 1e-8),
    ) * zoom;
    return {
      x: width / 2 + pan.x + dot(vector, basis.horizontal) * scale,
      y: height / 2 + pan.y - dot(vector, basis.vertical) * scale,
      z: dot(vector, basis.depth),
      scale,
    };
  }
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const x = cy * vector[0] - sy * vector[1];
  const y0 = sy * vector[0] + cy * vector[1];
  const y = cp * y0 - sp * vector[2];
  const z = sp * y0 + cp * vector[2];
  const extent = Math.max(...cell.map(norm), 1);
  const scale = Math.min(width, height) * 0.68 / extent * zoom;
  return {
    x: width / 2 + pan.x + x * scale,
    y: height / 2 + pan.y - y * scale,
    z,
    scale,
  };
}

const ligandElements = new Set(["O", "N", "F", "Cl", "Br", "I", "S", "Se", "Te"]);

function detectCoordinationShells(frame) {
  const { cell, fractional_positions: fractions, symbols } = frame;
  const inverseCell = inverse3(cell);
  const shells = [];
  for (let center = 0; center < symbols.length; center += 1) {
    if (symbols[center] === "H" || ligandElements.has(symbols[center])) continue;
    const candidates = [];
    for (let atom = 0; atom < symbols.length; atom += 1) {
      if (!ligandElements.has(symbols[atom])) continue;
      const delta0 = [0, 1, 2].map((axis) => fractions[atom][axis] - fractions[center][axis]);
      const maximumDistance = 1.28 * ((radii[symbols[center]] || 1.0) + (radii[symbols[atom]] || 0.9)) + 0.1;
      const ranges = imageTranslationRanges(delta0, maximumDistance, inverseCell);
      for (let sx = ranges[0][0]; sx <= ranges[0][1]; sx += 1) {
        for (let sy = ranges[1][0]; sy <= ranges[1][1]; sy += 1) {
          for (let sz = ranges[2][0]; sz <= ranges[2][1]; sz += 1) {
            if (atom === center && sx === 0 && sy === 0 && sz === 0) continue;
            const delta = [0, 1, 2].map((axis) => fractions[atom][axis] + [sx, sy, sz][axis] - fractions[center][axis]);
            const vector = cartesian(delta, cell);
            const distance = norm(vector);
            if (distance > 0.45 && distance <= maximumDistance) {
              candidates.push({ vector, distance, atom, translation: [sx, sy, sz] });
            }
          }
        }
      }
    }
    candidates.sort((a, b) => a.distance - b.distance);
    // Keep compact tetrahedral, octahedral, and seven-coordinate shells.
    let shellSize = Math.min(7, candidates.length);
    for (let index = 3; index < Math.min(shellSize, 7); index += 1) {
      const previous = candidates[index - 1].distance;
      const next = candidates[index].distance;
      if (next - previous > Math.max(0.35, previous * 0.16)) {
        shellSize = index;
        break;
      }
    }
    const selectedCandidates = candidates.slice(0, shellSize);
    const fit = regularCoordinationShape(selectedCandidates.map((item) => item.vector));
    if (fit) {
      const ligands = fit.assignment.map((index) => selectedCandidates[index]);
      shells.push({
        centerIndex: center,
        center: symbols[center],
        origin: cartesian(fractions[center], cell),
        vertices: ligands.map((item) => item.vector),
        ligands,
      });
    }
  }
  return shells;
}

function nearestLigandImage(frame, center, atom, inverseCell) {
  const delta = [0, 1, 2].map((axis) => frame.fractional_positions[atom][axis] - frame.fractional_positions[center][axis]);
  const initialTranslation = delta.map((value) => Math.round(-value));
  const initialVector = cartesian(delta.map((value, axis) => value + initialTranslation[axis]), frame.cell);
  let best = {
    atom,
    translation: initialTranslation,
    vector: initialVector,
    distance: norm(initialVector),
  };
  const ranges = imageTranslationRanges(delta, best.distance + 1e-8, inverseCell);
  for (let sx = ranges[0][0]; sx <= ranges[0][1]; sx += 1) {
    for (let sy = ranges[1][0]; sy <= ranges[1][1]; sy += 1) {
      for (let sz = ranges[2][0]; sz <= ranges[2][1]; sz += 1) {
        const translation = [sx, sy, sz];
        const vector = cartesian(delta.map((value, axis) => value + translation[axis]), frame.cell);
        const distance = norm(vector);
        if (distance < best.distance - 1e-10) best = { atom, translation, vector, distance };
      }
    }
  }
  return best;
}

function addCoordinationTemplates(found, shells) {
  for (const shell of shells) {
    const ligandAtoms = shell.ligands.map((ligand) => ligand.atom);
    const key = `${shell.centerIndex}:${ligandAtoms.length}:${ligandAtoms.slice().sort((a, b) => a - b).join(",")}`;
    if (!found.has(key)) found.set(key, { centerIndex: shell.centerIndex, ligandAtoms });
  }
}

function buildCoordinationTemplates(dataset) {
  if (coordinationTemplatesCache.has(dataset) || coordinationTemplateBuilds.has(dataset)) return;
  coordinationTemplateBuilds.set(dataset, true);
  const frames = dataset.frames?.length ? dataset.frames : [];
  const found = new Map();
  let index = 0;
  const scanNextFrame = () => {
    if (dataset !== data) {
      coordinationTemplateBuilds.delete(dataset);
      return;
    }
    if (index < frames.length) {
      const frame = frames[index];
      addCoordinationTemplates(found, coordinationCache.get(frame) || detectCoordinationShells(frame));
      index += 1;
      if (index < frames.length) {
        setTimeout(scanNextFrame, 0);
        return;
      }
    }
    coordinationTemplatesCache.set(dataset, [...found.values()]);
    coordinationTemplateBuilds.delete(dataset);
    coordinationCache = new WeakMap();
    polyhedraCache = new WeakMap();
    if (dataset === data) drawStructure();
  };
  setTimeout(scanNextFrame, 0);
}

function coordinationShells(frame) {
  const cached = coordinationCache.get(frame);
  if (cached) return cached;

  let templates = data && coordinationTemplatesCache.get(data);
  if (!templates) {
    if (data) buildCoordinationTemplates(data);
    const shells = detectCoordinationShells(frame);
    coordinationCache.set(frame, shells);
    return shells;
  }

  const inverseCell = inverse3(frame.cell);
  const shells = templates.map((template) => {
    const ligands = template.ligandAtoms.map((atom) =>
      nearestLigandImage(frame, template.centerIndex, atom, inverseCell),
    );
    return {
      centerIndex: template.centerIndex,
      center: frame.symbols[template.centerIndex],
      origin: cartesian(frame.fractional_positions[template.centerIndex], frame.cell),
      vertices: ligands.map((ligand) => ligand.vector),
      ligands,
    };
  });
  coordinationCache.set(frame, shells);
  return shells;
}

function permutations(values) {
  if (values.length < 2) return [values.slice()];
  const result = [];
  values.forEach((value, index) => {
    const rest = values.filter((_, item) => item !== index);
    for (const suffix of permutations(rest)) result.push([value, ...suffix]);
  });
  return result;
}

function largestEigenvector4(matrix) {
  const a = matrix.map((row) => row.slice());
  const vectors = Array.from({ length: 4 }, (_, row) =>
    Array.from({ length: 4 }, (_, column) => row === column ? 1 : 0),
  );
  for (let iteration = 0; iteration < 48; iteration += 1) {
    let p = 0;
    let q = 1;
    for (let row = 0; row < 4; row += 1) {
      for (let column = row + 1; column < 4; column += 1) {
        if (Math.abs(a[row][column]) > Math.abs(a[p][q])) [p, q] = [row, column];
      }
    }
    if (Math.abs(a[p][q]) < 1e-12) break;
    const tau = (a[q][q] - a[p][p]) / (2 * a[p][q]);
    const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
    const cosine = 1 / Math.sqrt(1 + t * t);
    const sine = t * cosine;
    const app = a[p][p];
    const aqq = a[q][q];
    const apq = a[p][q];
    a[p][p] = app - t * apq;
    a[q][q] = aqq + t * apq;
    a[p][q] = a[q][p] = 0;
    for (let index = 0; index < 4; index += 1) {
      if (index === p || index === q) continue;
      const aip = a[index][p];
      const aiq = a[index][q];
      a[index][p] = a[p][index] = cosine * aip - sine * aiq;
      a[index][q] = a[q][index] = sine * aip + cosine * aiq;
    }
    for (let index = 0; index < 4; index += 1) {
      const vip = vectors[index][p];
      const viq = vectors[index][q];
      vectors[index][p] = cosine * vip - sine * viq;
      vectors[index][q] = sine * vip + cosine * viq;
    }
  }
  let largest = 0;
  for (let index = 1; index < 4; index += 1) {
    if (a[index][index] > a[largest][largest]) largest = index;
  }
  return unit(vectors.map((row) => row[largest]));
}

function rotateByQuaternion(vector, quaternion) {
  let [w, x, y, z] = quaternion;
  const length = Math.hypot(w, x, y, z);
  [w, x, y, z] = [w, x, y, z].map((value) => value / length);
  return [
    (1 - 2 * (y * y + z * z)) * vector[0] + 2 * (x * y - z * w) * vector[1] + 2 * (x * z + y * w) * vector[2],
    2 * (x * y + z * w) * vector[0] + (1 - 2 * (x * x + z * z)) * vector[1] + 2 * (y * z - x * w) * vector[2],
    2 * (x * z - y * w) * vector[0] + 2 * (y * z + x * w) * vector[1] + (1 - 2 * (x * x + y * y)) * vector[2],
  ];
}

function fitRegularShell(template, targets) {
  const covariance = Array.from({ length: 3 }, () => [0, 0, 0]);
  for (let point = 0; point < template.length; point += 1) {
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        covariance[row][column] += template[point][row] * targets[point][column];
      }
    }
  }
  const trace = covariance[0][0] + covariance[1][1] + covariance[2][2];
  const z = [
    covariance[1][2] - covariance[2][1],
    covariance[2][0] - covariance[0][2],
    covariance[0][1] - covariance[1][0],
  ];
  const eigen = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  eigen[0][0] = trace;
  for (let axis = 0; axis < 3; axis += 1) {
    eigen[0][axis + 1] = eigen[axis + 1][0] = z[axis];
    for (let other = 0; other < 3; other += 1) {
      eigen[axis + 1][other + 1] = covariance[axis][other] + covariance[other][axis]
        - (axis === other ? trace : 0);
    }
  }
  const quaternion = largestEigenvector4(eigen);
  const rotated = template.map((point) => rotateByQuaternion(point, quaternion));
  const rms = Math.sqrt(rotated.reduce((sum, point, index) =>
    sum + point.reduce((inner, value, axis) => inner + (value - targets[index][axis]) ** 2, 0),
  0) / rotated.length);
  return { rotated, rms };
}

function fitPentagonalBipyramid(template, targets) {
  let best = null;
  for (let top = 0; top < targets.length; top += 1) {
    for (let bottom = 0; bottom < targets.length; bottom += 1) {
      if (top === bottom) continue;
      const axis = unit(targets[top].map((value, coordinate) => value - targets[bottom][coordinate]));
      const ringIndices = targets.map((_, index) => index).filter((index) => index !== top && index !== bottom);
      let inPlane = targets[ringIndices[0]].map((value, axisIndex) => value - dot(targets[ringIndices[0]], axis) * axis[axisIndex]);
      if (norm(inPlane) < 1e-8) {
        const trial = Math.abs(axis[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0];
        inPlane = trial.map((value, axisIndex) => value - dot(trial, axis) * axis[axisIndex]);
      }
      const u = unit(inPlane);
      const v = unit(cross(axis, u));
      const orderedRing = ringIndices.sort((a, b) => {
        const angle = (index) => Math.atan2(dot(targets[index], v), dot(targets[index], u));
        return angle(a) - angle(b);
      });
      const orderings = [
        orderedRing,
        [orderedRing[0], ...orderedRing.slice(1).reverse()],
      ];
      for (const ordering of orderings) {
        const assignment = [...ordering, top, bottom];
        const fit = fitRegularShell(template, assignment.map((index) => targets[index]));
        if (!best || fit.rms < best.rms) best = { ...fit, assignment };
      }
    }
  }
  return best;
}

function regularCoordinationShape(vectors) {
  const count = vectors.length;
  if (count !== 4 && count !== 6 && count !== 7) return null;
  const template = count === 4
    ? [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(unit)
    : count === 6
      ? [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
      : [
        ...Array.from({ length: 5 }, (_, index) => [
          Math.cos(2 * Math.PI * index / 5),
          Math.sin(2 * Math.PI * index / 5),
          0,
        ]),
        [0, 0, 1],
        [0, 0, -1],
      ];
  const targets = vectors.map(unit);
  let best = null;
  if (count === 7) {
    best = fitPentagonalBipyramid(template, targets);
  } else {
    for (const assignment of permutations(targets.map((_, index) => index))) {
      const fit = fitRegularShell(template, assignment.map((index) => targets[index]));
      if (!best || fit.rms < best.rms) best = { ...fit, assignment };
    }
  }
  // Drop strongly distorted or ambiguous local environments instead of
  // presenting them as ideal coordination polyhedra.
  if (!best || best.rms > 0.24) return null;
  // The ideal template only classifies and orders the shell. Draw the cage
  // through the actual ligand positions so each vertex sits on its atom.
  return { assignment: best.assignment };
}

function convexHullFaces(vertices) {
  const faces = new Map();
  const scale = Math.max(1, ...vertices.map(norm));
  const tolerance = scale * 1e-5;
  for (let i = 0; i < vertices.length - 2; i += 1) {
    for (let j = i + 1; j < vertices.length - 1; j += 1) {
      for (let k = j + 1; k < vertices.length; k += 1) {
        const normal0 = cross(vertices[j].map((x, axis) => x - vertices[i][axis]), vertices[k].map((x, axis) => x - vertices[i][axis]));
        if (norm(normal0) < 1e-8) continue;
        const normal = unit(normal0);
        const distances = vertices.map((point) => dot(point.map((x, axis) => x - vertices[i][axis]), normal));
        const positive = distances.some((value) => value > tolerance);
        const negative = distances.some((value) => value < -tolerance);
        if (positive && negative) continue;
        const indices = distances.map((value, index) => Math.abs(value) <= tolerance ? index : -1).filter((index) => index >= 0);
        if (indices.length < 3) continue;
        const signature = indices.join(",");
        if (faces.has(signature)) continue;
        const centroid = [0, 1, 2].map((axis) => indices.reduce((sum, index) => sum + vertices[index][axis], 0) / indices.length);
        const u = unit(vertices[indices[0]].map((x, axis) => x - centroid[axis]));
        const v = unit(cross(normal, u));
        indices.sort((a, b) => {
          const da = vertices[a].map((x, axis) => x - centroid[axis]);
          const db = vertices[b].map((x, axis) => x - centroid[axis]);
          return Math.atan2(dot(da, v), dot(da, u)) - Math.atan2(dot(db, v), dot(db, u));
        });
        faces.set(signature, indices);
      }
    }
  }
  return [...faces.values()];
}

function drawPolyhedra(context, frame, projectPoint, opacity = 1) {
  const shells = coordinationShells(frame);
  let shapes = polyhedraCache.get(frame);
  if (!shapes) {
    shapes = [];
    for (const shell of shells) {
      for (const indices of convexHullFaces(shell.vertices)) {
        shapes.push({
          vertices: indices.map((index) => shell.origin.map((value, axis) => value + shell.vertices[index][axis])),
          color: elementColor(shell.center),
        });
      }
    }
    polyhedraCache.set(frame, shapes);
  }
  const faces = shapes.map((shape) => {
    const points = shape.vertices.map(projectPoint);
    return { points, color: shape.color, depth: points.reduce((sum, point) => sum + point.z, 0) / points.length };
  });
  faces.sort((a, b) => a.depth - b.depth);
  for (const face of faces) {
    context.beginPath();
    face.points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
    context.closePath();
    context.fillStyle = face.color;
    context.globalAlpha = opacity * 0.18;
    context.fill();
    context.globalAlpha = opacity * 0.66;
    context.strokeStyle = face.color;
    context.lineWidth = 1;
    context.stroke();
  }
  context.globalAlpha = 1;

  // Neighbor ligands across a periodic face are outside the home-cell atom
  // list. Render their periodic images so every cage vertex has an atom.
  const imageAtoms = new Map();
  for (const shell of shells) {
    for (const ligand of shell.ligands) {
      if (ligand.translation.every((value) => value === 0)) continue;
      const key = `${ligand.atom}:${ligand.translation.join(",")}`;
      if (!imageAtoms.has(key)) {
        const fractional = frame.fractional_positions[ligand.atom].map(
          (value, axis) => value + ligand.translation[axis],
        );
        imageAtoms.set(key, { symbol: frame.symbols[ligand.atom], position: cartesian(fractional, frame.cell) });
      }
    }
  }
  const atomScale = finite($("atom-size").value, 2);
  for (const imageAtom of imageAtoms.values()) {
    const point = projectPoint(imageAtom.position);
    const radius = drawAtomMarker(context, point, imageAtom.symbol, atomScale, opacity);
    if ($("labels").checked) {
      context.save();
      context.globalAlpha = opacity;
      context.fillStyle = "#172b3b";
      context.font = "10px system-ui";
      context.textAlign = "center";
      context.fillText(imageAtom.symbol, point.x, point.y - radius - 3);
      context.restore();
    }
  }
}

function bondCoordinationLimit(symbol) {
  if (symbol === "H") return 1;
  if (["C", "Si", "Ge"].includes(symbol)) return 4;
  if (["B", "N", "P", "As", "Sb"].includes(symbol)) return 6;
  if (["He", "Ne", "Ar", "Kr", "Xe", "Rn", "Og"].includes(symbol)) return 0;
  return 12;
}

function covalentRadius(symbol) {
  const index = periodicSymbols.indexOf(symbol);
  return index >= 0 ? covalentRadii[index] : 0.9;
}

function bondNetwork(frame) {
  const cached = bondsCache.get(frame);
  if (cached) return cached;
  const { cell, fractional_positions: fractions, symbols } = frame;
  const inverseCell = inverse3(cell);
  const candidates = [];
  for (let i = 0; i < symbols.length; i += 1) {
    const start = i;
    for (let j = start; j < symbols.length; j += 1) {
      const radiusSum = covalentRadius(symbols[i]) + covalentRadius(symbols[j]);
      if (radiusSum < 0.55) continue;
      const maximumDistance = Math.min(3.55, 1.24 * radiusSum + 0.12);
      const pairDelta = [0, 1, 2].map((axis) => fractions[j][axis] - fractions[i][axis]);
      const ranges = imageTranslationRanges(pairDelta, maximumDistance, inverseCell);
      for (let sx = ranges[0][0]; sx <= ranges[0][1]; sx += 1) {
        for (let sy = ranges[1][0]; sy <= ranges[1][1]; sy += 1) {
          for (let sz = ranges[2][0]; sz <= ranges[2][1]; sz += 1) {
            const translation = [sx, sy, sz];
            if (i === j) {
              if (sx === 0 && sy === 0 && sz === 0) continue;
              const firstNonzero = translation.find((value) => value !== 0);
              if (firstNonzero < 0) continue;
            }
            const delta = [0, 1, 2].map((axis) =>
              fractions[j][axis] + translation[axis] - fractions[i][axis],
            );
            const vector = cartesian(delta, cell);
            const distance = norm(vector);
            const ratio = distance / radiusSum;
            if (distance < 0.45 || distance > maximumDistance || ratio > 1.30) continue;
            candidates.push({ i, j, translation, distance, ratio });
          }
        }
      }
    }
  }
  candidates.sort((a, b) => a.ratio - b.ratio || a.distance - b.distance);
  const coordination = Array(symbols.length).fill(0);
  const bonds = [];
  for (const bond of candidates) {
    const iLimit = bondCoordinationLimit(symbols[bond.i]);
    const jLimit = bondCoordinationLimit(symbols[bond.j]);
    const selfImage = bond.i === bond.j;
    const iCost = selfImage ? 2 : 1;
    if (iLimit === 0 || jLimit === 0 || coordination[bond.i] + iCost > iLimit) continue;
    if (!selfImage && coordination[bond.j] + 1 > jLimit) continue;
    coordination[bond.i] += iCost;
    if (!selfImage) coordination[bond.j] += 1;
    bonds.push(bond);
  }
  bondsCache.set(frame, bonds);
  return bonds;
}

function drawBonds(context, frame, viewportCell, width, height, opacity = 1, dashed = false) {
  const { fractional_positions: fractions, symbols } = frame;
  const bonds = bondNetwork(frame).map((bond) => {
    const startPosition = cartesian(fractions[bond.i], frame.cell);
    const endFraction = fractions[bond.j].map((value, axis) => value + bond.translation[axis]);
    const endPosition = cartesian(endFraction, frame.cell);
    const start = project(startPosition, viewportCell, width, height);
    const end = project(endPosition, viewportCell, width, height);
    return { ...bond, start, end, depth: (start.z + end.z) / 2 };
  });
  bonds.sort((a, b) => a.depth - b.depth);
  context.save();
  context.lineCap = "round";
  context.setLineDash(dashed ? [5, 4] : []);
  for (const bond of bonds) {
    const ratioStrength = Math.max(0, Math.min(1, 1.3 - bond.ratio));
    const depthStrength = 0.68 + 0.32 * ratioStrength;
    const alpha = opacity * depthStrength;
    const widthScale = Math.min(bond.start.scale, bond.end.scale);
    const lineWidth = Math.max(1.3, Math.min(4.8, widthScale * (0.025 + 0.022 * ratioStrength)));
    context.globalAlpha = alpha * (dashed ? 0.52 : 0.5);
    context.strokeStyle = dashed ? elementColor(symbols[bond.i]) : "#203b4c";
    context.lineWidth = lineWidth + (dashed ? 0.6 : 1.8);
    context.beginPath();
    context.moveTo(bond.start.x, bond.start.y);
    context.lineTo(bond.end.x, bond.end.y);
    context.stroke();
    const gradient = context.createLinearGradient(bond.start.x, bond.start.y, bond.end.x, bond.end.y);
    gradient.addColorStop(0, elementColor(symbols[bond.i]));
    gradient.addColorStop(0.5, dashed ? elementColor(symbols[bond.j]) : "#e5edf0");
    gradient.addColorStop(1, elementColor(symbols[bond.j]));
    if (dashed) {
      context.globalAlpha = alpha * 0.72;
      context.strokeStyle = gradient;
      context.lineWidth = lineWidth;
      context.beginPath();
      context.moveTo(bond.start.x, bond.start.y);
      context.lineTo(bond.end.x, bond.end.y);
      context.stroke();
    } else {
      context.globalAlpha = alpha * (0.62 + 0.24 * ratioStrength);
      context.strokeStyle = gradient;
      context.lineWidth = lineWidth;
      context.beginPath();
      context.moveTo(bond.start.x, bond.start.y);
      context.lineTo(bond.end.x, bond.end.y);
      context.stroke();
    }
    if (!dashed) {
      context.globalAlpha = alpha * 0.22;
      context.strokeStyle = "#ffffff";
      context.lineWidth = Math.max(0.6, lineWidth * 0.2);
      context.beginPath();
      context.moveTo(bond.start.x, bond.start.y);
      context.lineTo(bond.end.x, bond.end.y);
      context.stroke();
    }
  }
  context.restore();
}

function drawCellShadow(context, frame, viewportCell, width, height) {
  const corners = Array.from({ length: 8 }, (_, index) =>
    project(cartesian([index & 1, (index >> 1) & 1, (index >> 2) & 1], frame.cell), viewportCell, width, height),
  );
  context.save();
  context.strokeStyle = "#38aaa0";
  context.globalAlpha = 0.3;
  context.lineWidth = 1.15;
  context.setLineDash([4, 4]);
  for (let index = 0; index < 8; index += 1) {
    for (const bit of [1, 2, 4]) {
      if (index & bit) continue;
      context.beginPath();
      context.moveTo(corners[index].x, corners[index].y);
      context.lineTo(corners[index | bit].x, corners[index | bit].y);
      context.stroke();
    }
  }
  context.restore();
}

function wrapFractionalPosition(position) {
  return position.map((value) => value - Math.floor(value));
}

function periodicTrajectorySegments(startPosition, endPosition, startCell, endCell) {
  const start = wrapFractionalPosition(startPosition);
  const end = wrapFractionalPosition(endPosition);
  const delta = end.map((value, axis) => {
    let difference = value - start[axis];
    difference -= Math.round(difference);
    return difference;
  });
  const unwrappedEnd = start.map((value, axis) => value + delta[axis]);
  const events = [0, 1];
  for (let axis = 0; axis < 3; axis += 1) {
    if (Math.abs(delta[axis]) < 1e-12) continue;
    const direction = Math.sign(delta[axis]);
    let boundary = direction > 0 ? Math.floor(start[axis]) + 1 : Math.ceil(start[axis]) - 1;
    while (direction * (unwrappedEnd[axis] - boundary) > 1e-10) {
      const t = (boundary - start[axis]) / delta[axis];
      if (t > 1e-10 && t < 1 - 1e-10) events.push(t);
      boundary += direction;
    }
  }
  events.sort((a, b) => a - b);
  const uniqueEvents = events.filter((value, index) => index === 0 || value - events[index - 1] > 1e-9);
  const cellAt = (t) => startCell.map((row, i) =>
    row.map((value, j) => value + t * (endCell[i][j] - value)),
  );
  const segments = [];
  for (let index = 0; index < uniqueEvents.length - 1; index += 1) {
    const t0 = uniqueEvents[index];
    const t1 = uniqueEvents[index + 1];
    const midpoint = (t0 + t1) / 2;
    const image = start.map((value, axis) => Math.floor(value + delta[axis] * midpoint));
    const fractionalAt = (t) => start.map((value, axis) => value + delta[axis] * t - image[axis]);
    const fromCell = cellAt(t0);
    const toCell = cellAt(t1);
    segments.push({
      start: cartesian(fractionalAt(t0), fromCell),
      end: cartesian(fractionalAt(t1), toCell),
    });
  }
  return segments;
}

function drawPolarShadow(context, frame, viewportCell, width, height) {
  const points = frame.fractional_positions.map((fractional) =>
    project(cartesian(wrapFractionalPosition(fractional), frame.cell), viewportCell, width, height),
  );
  const atomScale = finite($("atom-size").value, 2);
  context.save();
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const radius = Math.max(3, Math.min(18,
      (radii[frame.symbols[index]] || 0.9) * 0.18 * point.scale * atomScale,
    ));
    const color = elementColor(frame.symbols[index]);
    context.globalAlpha = 0.22;
    context.fillStyle = color;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, 2 * Math.PI);
    context.fill();
    context.globalAlpha = 0.58;
    context.fillStyle = color;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, 2 * Math.PI);
    context.fill();
    context.globalAlpha = 0.8;
    context.strokeStyle = "#f4ffff";
    context.lineWidth = 1.1;
    context.stroke();
  }
  context.restore();
}

function drawStructure() {
  if (!data) return;
  const canvas = $("structure");
  const { context: c, width, height } = resizeCanvas(canvas);
  const frame = data.frames[frameIndex];
  const { cell, fractional_positions: fractions, symbols } = frame;
  c.clearRect(0, 0, width, height);
  const corners = Array.from({ length: 8 }, (_, index) =>
    project(cartesian([index & 1, (index >> 1) & 1, (index >> 2) & 1], cell), cell, width, height),
  );
  if ($("cell").checked && structureView !== "3d") {
    const { firstIndex, secondIndex } = projectionBasis(cell);
    const center = cartesian([0.5, 0.5, 0.5], cell);
    const face = [
      [-1, -1], [1, -1], [1, 1], [-1, 1],
    ].map(([u, v]) => center.map((value, axis) => value + u * cell[firstIndex][axis] / 2 + v * cell[secondIndex][axis] / 2))
      .map((point) => project(point, cell, width, height));
    c.beginPath();
    face.forEach((point, index) => index ? c.lineTo(point.x, point.y) : c.moveTo(point.x, point.y));
    c.closePath();
    c.fillStyle = "#338c7330";
    c.fill();
    c.strokeStyle = "#338c7380";
    c.lineWidth = 1.5;
    c.stroke();
  }
  if ($("cell").checked) {
    c.strokeStyle = "#9babb6";
    c.lineWidth = 1.15;
    for (let index = 0; index < 8; index += 1) {
      for (const bit of [1, 2, 4]) {
        if (index & bit) continue;
        c.beginPath();
        c.moveTo(corners[index].x, corners[index].y);
        c.lineTo(corners[index | bit].x, corners[index | bit].y);
        c.stroke();
      }
    }
  }
  const polarFrame = data.frames[positivePolarFrameIndex()];
  const showPolarShadow = $("motion").checked && frameIndex !== positivePolarFrameIndex() && polarFrame;
  if (showPolarShadow) {
    if ($("cell").checked) drawCellShadow(c, polarFrame, cell, width, height);
    if ($("polyhedra").checked) {
      drawPolyhedra(c, polarFrame, (position) => project(position, cell, width, height), 0.44);
    }
    if ($("bonds").checked) drawBonds(c, polarFrame, cell, width, height, 0.38, true);
    drawPolarShadow(c, polarFrame, cell, width, height);
  }
  const points = fractions.map((fractional) =>
    project(cartesian(fractional, cell), cell, width, height),
  );
  lastProjectedAtoms = points;
  if (showPolarShadow && data.frames.length > 1) {
    const base = polarFrame.fractional_positions;
    c.save();
    c.setLineDash([3, 3]);
    for (let atom = 0; atom < fractions.length; atom += 1) {
      if (polarFrame.symbols[atom] !== symbols[atom]) continue;
      const trajectory = periodicTrajectorySegments(base[atom], fractions[atom], polarFrame.cell, cell);
      c.strokeStyle = elementColor(symbols[atom]);
      c.globalAlpha = 0.48;
      c.lineWidth = 1.2;
      for (const segment of trajectory) {
        const start = project(segment.start, cell, width, height);
        const end = project(segment.end, cell, width, height);
        if (Math.hypot(end.x - start.x, end.y - start.y) < 2.5) continue;
        c.beginPath();
        c.moveTo(start.x, start.y);
        c.lineTo(end.x, end.y);
        c.stroke();
      }
    }
    c.restore();
  }
  if ($("polyhedra").checked) {
    drawPolyhedra(c, frame, (position) => project(position, cell, width, height));
  }
  if ($("bonds").checked) {
    drawBonds(c, frame, cell, width, height);
  }
  const atomScale = finite($("atom-size").value, 2);
  const ordered = points.map((point, index) => ({ point, index })).sort((a, b) => a.point.z - b.point.z);
  for (const { point, index } of ordered) {
    const radius = drawAtomMarker(c, point, symbols[index], atomScale);
    if (index === selectedAtom) {
      c.strokeStyle = "#f1a72f";
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(point.x, point.y, radius + 4, 0, 2 * Math.PI);
      c.stroke();
    }
    if ($("labels").checked) {
      c.fillStyle = "#172b3b";
      c.font = "10px system-ui";
      c.textAlign = "center";
      c.fillText(symbols[index], point.x, point.y - radius - 3);
    }
  }
  const unique = [...new Set(symbols)];
  $("legend").replaceChildren(...unique.map((symbol) => {
    const item = document.createElement("span");
    item.textContent = symbol;
    item.style.background = elementColor(symbol);
    return item;
  }));
  const branchName = frame.path_region === "positive_extension"
    ? "+P continuation"
    : frame.path_region === "negative_extension"
      ? "−P continuation"
      : frame.coordinate > 0 ? "+P → N" : frame.coordinate < 0 ? "N → −P" : "nonpolar candidate";
  const viewLabels = {
    "3d": "3D perspective",
    ab: "lattice ab face projection",
    bc: "lattice bc face projection",
    ca: "lattice ca face projection",
  };
  $("caption").textContent = `${branchName} · ${viewLabels[structureView]} · image ${frameIndex + 1}/${data.frames.length} · selected ${symbols[selectedAtom]} ${selectedAtom + 1}`;
  const parameters = cellParameters(cell);
  $("metrics").textContent = `Cell ${parameters.lengths.map((x) => fmt(x, 2)).join(" × ")} Å · volume ${fmt(cellVolume(cell), 1)} Å³ · angles ${parameters.angles.map((x) => fmt(x, 1)).join("° / ")}°`;
}

function drawAtomMarker(context, point, symbol, atomScale, opacity = 1) {
  const radius = Math.max(3, Math.min(18,
    (radii[symbol] || 0.9) * 0.18 * point.scale * atomScale,
  ));
  const gradient = context.createRadialGradient(
    point.x - radius * 0.32, point.y - radius * 0.38, radius * 0.08,
    point.x, point.y, radius,
  );
  const color = elementColor(symbol);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.28, color);
  gradient.addColorStop(1, "#1c2d3a");
  context.save();
  context.globalAlpha = opacity;
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, 2 * Math.PI);
  context.fill();
  context.restore();
  return radius;
}

function setStructureView(view) {
  structureView = view;
  pan = { x: 0, y: 0 };
  zoom = 1;
  const descriptions = {
    "3d": "Translucent element-colored atoms mark the +P endpoint; matching trajectory lines split at cell faces · Bond and polyhedra toggles apply to both poses · Drag to rotate · Shift-drag to pan",
    ab: "Translucent element-colored atoms mark the +P endpoint; matching trajectory lines split at cell faces · Bond and polyhedra toggles apply to both poses · Along the ab face normal · drag to pan",
    bc: "Translucent element-colored atoms mark the +P endpoint; matching trajectory lines split at cell faces · Bond and polyhedra toggles apply to both poses · Along the bc face normal · drag to pan",
    ca: "Translucent element-colored atoms mark the +P endpoint; matching trajectory lines split at cell faces · Bond and polyhedra toggles apply to both poses · Along the ca face normal · drag to pan",
  };
  document.querySelectorAll("[data-structure-view]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.structureView === view));
  });
  $("structure-hint").textContent = `${descriptions[view]} · scroll to zoom · click an atom to inspect its Born effective charge.`;
  drawStructure();
}

function tensorTable(matrix, rowLabels = ["x", "y", "z"], columnLabels = ["x", "y", "z"], digits = 4) {
  if (!Array.isArray(matrix) || matrix.length !== 3) return "<p class=muted>Not available</p>";
  const header = `<tr><th></th>${columnLabels.map((x) => `<th>${x}</th>`).join("")}</tr>`;
  const rows = matrix.map((row, index) =>
    `<tr><th>${rowLabels[index]}</th>${row.map((value) => `<td>${fmt(value, digits)}</td>`).join("")}</tr>`,
  ).join("");
  return `<table>${header}${rows}</table>`;
}

function renderReport() {
  const frame = data.frames[frameIndex];
  const parameters = cellParameters(frame.cell);
  const distortion = distortions(frame);
  const polarization = cartesianPolarization(frame);
  const quantum = quantumMatrix(frame);
  const polarIndex = positivePolarFrameIndex();
  const energyRise = (frame.energy_eV - data.frames[polarIndex].energy_eV) / Math.max(1, data.atom_count) * 1000;
  const barrier = Math.max(...data.frames.map((item) =>
    (item.energy_eV - data.frames[polarIndex].energy_eV) / Math.max(1, data.atom_count) * 1000,
  ));
  const symbol = frame.symbols[selectedAtom];
  const becs = frame.becs_e;
  const selectedBec = becs && becs[selectedAtom];
  const path = data.path_analysis || {};
  const fit = path.double_well_fit || {};
  const symmetry = data.symmetry || {};
  const allBecs = becs
    ? `<details><summary>All atomic Born effective charges (${becs.length} atoms)</summary><table><tr><th>Atom</th><th>Symbol</th><th>Zxx</th><th>Zxy</th><th>Zxz</th><th>Zyx</th><th>Zyy</th><th>Zyz</th><th>Zzx</th><th>Zzy</th><th>Zzz</th></tr>${becs.map((tensor, atom) => `<tr><td>${atom + 1}</td><td>${frame.symbols[atom]}</td>${tensor.flat().map((value) => `<td>${fmt(value, 4)}</td>`).join("")}</tr>`).join("")}</table></details>`
    : "<p class=muted>Born charges were not evaluated for this image.</p>";
  const axes = ["x", "y", "z"];
  const qTable = `<table><tr><th>Cartesian</th><th>qₐ</th><th>qᵦ</th><th>q𝚌</th></tr>${quantum.map((row, i) => `<tr><th>${axes[i]}</th>${row.map((value) => `<td>${fmt(value, 3)}</td>`).join("")}</tr>`).join("")}</table>`;
  const atomOptions = frame.symbols.map((item, index) =>
    `<option value="${index}" ${index === selectedAtom ? "selected" : ""}>Atom ${index + 1} · ${item}</option>`,
  ).join("");
  const coefficients = fit.coefficients_mev_per_atom;
  const fitParameters = Array.isArray(coefficients)
    ? `<table><tr><th>Coefficient</th>${coefficients.map((_, index) => `<th>c${index}</th>`).join("")}</tr><tr><th>Value (meV/atom)</th>${coefficients.map((value) => `<td>${fmt(value, 5)}</td>`).join("")}</tr></table>`
    : "<p class=muted>Quartic fit is unavailable for this branch.</p>";
  const extrema = (fit.stationary_points || []).length
    ? `<p>Fitted stationary points: ${(fit.stationary_points || []).map((point) => `${point.kind} at q=${fmt(point.q, 3)} (${fmt(point.energy_mev_per_atom_from_endpoint_mean, 3)} meV/atom relative to endpoint mean)`).join(" · ")}</p>`
    : "";
  $("details").innerHTML = `
    <div class="report-head"><div><h2>Per-image properties</h2><p class="hint">Image ${frameIndex + 1}/${data.frames.length} · branch coordinate ${fmt(frame.coordinate, 3)} · values for the selected structure.</p></div><label class="hint">Selected atom <select id="atom-select" class="atom-select">${atomOptions}</select></label></div>
    <div class="report-grid">
      <section class="report-block"><h3>Cell and distortion from +P endpoint</h3>
        <table><tr><th>Cell lengths (Å)</th><td>${parameters.lengths.map((x) => fmt(x, 4)).join(" · ")}</td></tr><tr><th>Cell angles (°)</th><td>${parameters.angles.map((x) => fmt(x, 3)).join(" · ")}</td></tr><tr><th>Volume (Å³)</th><td>${fmt(cellVolume(frame.cell), 4)}</td></tr><tr><th>Atomic RMS displacement (Å)</th><td>${fmt(distortion.atomRmsA, 4)}</td></tr><tr><th>Cell RMS deformation (%)</th><td>${fmt(distortion.rmsStrainPercent, 3)}</td></tr><tr><th>Maximum principal stretch deviation (%)</th><td>${fmt(distortion.maximumStretchDeviationPercent, 3)}</td></tr><tr><th>Volume change (%)</th><td>${fmt(distortion.volumeChangePercent, 3)}</td></tr></table>
      </section>
      <section class="report-block"><h3>Polarization</h3>
        <p class="pol-vector">P = (${polarization.map((x) => fmt(x, 3)).join(", ")}) µC/cm²<br>|P| = ${fmt(norm(polarization), 3)} µC/cm²</p>
        <p>Reduced p = (${frame.reduced_polarization.map((x) => fmt(x, 5)).join(", ")}) quantum units</p>
        <h3>Polarization quantum matrix</h3><p class="hint">Columns are qₐ, qᵦ, q𝚌; entries are Cartesian µC/cm² per quantum.</p>${qTable}
      </section>
      <section class="report-block"><h3>Path summary and spacegroups</h3>
        <table><tr><th>Switching classification</th><td>${String(path.switching_status || "unclear").toUpperCase()}</td></tr><tr><th>Polar spacegroup</th><td>${symmetry.polar_spacegroup || "—"}</td></tr><tr><th>Nonpolar parent hypothesis</th><td>${symmetry.nonpolar_spacegroup || "—"}</td></tr><tr><th>Sampled N-state parent</th><td>${symmetry.branch_parent_spacegroup || data.parent?.spacegroup || "—"}</td></tr><tr><th>Spontaneous polarization estimate (µC/cm²)</th><td>${fmt(path.spontaneous_polarization_uC_cm2, 4)}</td></tr><tr><th>Sampled barrier (meV/atom)</th><td>${fmt(path.barrier_mev_per_atom, 4)}</td></tr><tr><th>Maximum atomic displacement (Å)</th><td>${fmt(path.max_atomic_displacement_A, 4)}</td></tr><tr><th>Maximum cell stretch deviation (%)</th><td>${fmt(path.max_cell_stretch_deviation_percent, 3)}</td></tr><tr><th>Maximum cell volume change (%)</th><td>${fmt(path.max_cell_volume_change_percent, 3)}</td></tr></table>
        <h3>Quartic energy fit</h3><p>${fit.detected_double_well ? "Double-well topology detected" : fit.available ? "Fit available; double-well topology not detected" : "Fit unavailable"} · R² ${fmt(fit.fit_r_squared, 4)} · RMSE ${fmt(fit.fit_rmse_mev_per_atom, 4)} meV/atom</p>
        <p class="hint">${fit.model || "E(q)=c0+c1q+c2q²+c3q³+c4q⁴"}; q is the endpoint-normalized polarization coordinate. ${fit.fit_includes_extension_samples ? `Fit includes ${fmt(100 * finite(fit.fit_extension_fraction, 0), 1)}% geometric continuation beyond each polar endpoint.` : "Fit uses the sampled P–N–−P path."} ${fit.well_minima_bracketed_by_samples === false ? "At least one fitted well is not bracketed by sampled points." : ""}</p>${fitParameters}${extrema}
      </section>
      <section class="report-block"><h3>Response tensors</h3>
        <p class="hint">Born effective charge Z* for atom ${selectedAtom + 1} (${symbol}); tensor components in e.</p>${tensorTable(selectedBec)}
        <h3>Polarizability tensor</h3><p class="hint">MACE-Field units: e/(V Å).</p>${tensorTable(frame.polarizability_e_per_V_A, axes, axes, 5)}
        ${allBecs}
      </section>
    </div>
    <p class="barrier-note">Image energy relative to +P: ${fmt(energyRise, 3)} meV/atom. Maximum sampled energy rise over the extended geometric path: ${fmt(barrier, 3)} meV/atom; this is not a relaxed activation barrier.</p>`;
  $("atom-select").addEventListener("change", (event) => {
    selectedAtom = Number(event.target.value);
    draw();
  });
}

function setSummary() {
  const parent = data.parent || {};
  const validation = data.validation || {};
  const symmetry = data.symmetry || {};
  const items = [
    ["Formula", data.formula], ["Atoms", data.atom_count],
    ["Parent candidate", parent.candidate_id || "—"],
    ["Parent symmetry", parent.pointgroup || "—"],
    ["Polar spacegroup", symmetry.polar_spacegroup || "—"],
    ["Nonpolar spacegroup", symmetry.nonpolar_spacegroup || "—"],
    ["Sampled N-state spacegroup", symmetry.branch_parent_spacegroup || parent.spacegroup || "—"],
  ];
  if (validation.polar_mpid) items.push(["Validated polar ID", validation.polar_mpid]);
  if (validation.nonpolar_mpid) items.push(["Validated parent ID", validation.nonpolar_mpid]);
  if (validation.rank1_rmsd_A !== undefined) {
    items.push(["Rank 1 atom / cell RMSD", `${fmt(validation.rank1_rmsd_A)} / ${fmt(validation.rank1_cell_rmsd_A)} Å`]);
  }
  if (validation.path_dtw_rmsd_A !== undefined) items.push(["Path DTW RMSD", `${fmt(validation.path_dtw_rmsd_A)} Å`]);
  if (validation.branch_rmse !== undefined) items.push(["Branch RMSE mod quantum", fmt(validation.branch_rmse, 4)]);
  $("summary").replaceChildren(...items.map(([label, value]) => {
    const item = document.createElement("div");
    const caption = document.createElement("span");
    const content = document.createElement("strong");
    caption.textContent = label;
    content.textContent = value ?? "—";
    item.append(caption, content);
    return item;
  }));
  $("title").textContent = `${data.formula || data.query_id} · P–N–−P branch`;
  selectedAtom = Math.min(selectedAtom, Math.max(0, data.atom_count - 1));
}

function draw() {
  if (!data) return;
  const polarIndex = positivePolarFrameIndex();
  const energies = data.frames.map((frame) =>
    (frame.energy_eV - data.frames[polarIndex].energy_eV) / Math.max(1, data.atom_count) * 1000,
  );
  const cartesianP = data.frames.map(cartesianPolarization);
  const energySeries = [{ values: energies, color: "#d87942" }];
  const fit = data.path_analysis?.double_well_fit;
  if ($("fit-toggle").checked && fit?.available && Array.isArray(fit.coefficients_mev_per_atom)) {
    const qValues = fit.order_parameter_samples || data.path_analysis.order_parameter_samples || [];
    const coefficients = fit.coefficients_mev_per_atom;
    const endpointMean = (energies[polarIndex] + energies[negativePolarFrameIndex()]) / 2;
    const fitValues = qValues.map((q) => coefficients.reduce((sum, coefficient, power) => sum + coefficient * q ** power, endpointMean));
    if (fitValues.length === energies.length) energySeries.push({ values: fitValues, color: "#27495d", dash: [6, 4] });
  }
  branchChart($("energy"), energySeries.length > 1 ? "Energy above +P (meV/atom) · dashed quartic fit" : "Energy above +P (meV/atom)", energySeries, frameIndex);
  branchChart($("polarization"), "Cartesian P (µC/cm²) · x red · y blue · z green", [
    { values: cartesianP.map((value) => value[0]), color: "#d95f68" },
    { values: cartesianP.map((value) => value[1]), color: "#377eb8" },
    { values: cartesianP.map((value) => value[2]), color: "#338c73" },
  ], frameIndex);
  drawStructure();
  renderReport();
  $("frame").max = String(Math.max(0, data.frames.length - 1));
  $("frame").value = String(frameIndex);
  $("frame-label").textContent = `${frameIndex + 1}/${data.frames.length}`;
}

function xyz() {
  const frame = data.frames[frameIndex];
  const lines = [String(frame.symbols.length), `Lattice="${frame.cell.flat().join(" ")}" Properties=species:S:1:pos:R:3 pbc="T T T"`];
  frame.symbols.forEach((symbol, atom) => {
    lines.push(`${symbol} ${cartesian(frame.fractional_positions[atom], frame.cell).map((x) => x.toFixed(8)).join(" ")}`);
  });
  return `${lines.join("\n")}\n`;
}

async function loadQuery(id) {
  const response = await fetch(`data/${encodeURIComponent(id)}.json`);
  if (!response.ok) throw new Error(`data fetch failed (${response.status})`);
  data = await response.json();
  polyhedraCache = new WeakMap();
  coordinationCache = new WeakMap();
  coordinationTemplatesCache = new WeakMap();
  coordinationTemplateBuilds = new WeakMap();
  bondsCache = new WeakMap();
  frameIndex = positivePolarFrameIndex();
  playDirection = 1;
  selectedAtom = 0;
  const params = new URLSearchParams(location.search);
  params.set("query", id);
  history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
  setSummary();
  $("structure-hint").textContent = "Translucent element-colored atoms mark the +P endpoint; matching trajectory lines split at cell faces · Bond and polyhedra toggles apply to both poses · Drag to rotate · Shift-drag to pan · scroll to zoom · click an atom to inspect its Born effective charge.";
  draw();
}

async function load() {
  try {
    const manifest = await fetch("manifest.json").then((response) => {
      if (!response.ok) throw new Error(`manifest fetch failed (${response.status})`);
      return response.json();
    });
    const ids = manifest.queries.map((item) => item.query_id);
    if (!ids.length) {
      document.querySelector("main").innerHTML = "<p class=error>No sampled P-N--P branches were produced for these inputs.</p>";
      return;
    }
    const selectorLabel = $("material-selector");
    const selector = $("material");
    selectorLabel.hidden = ids.length < 2;
    selector.replaceChildren(...manifest.queries.map((item) => {
      const option = document.createElement("option");
      option.value = item.query_id;
      const source = item.name?.split("/", 1)[0] || "mp-ferroelectric";
      const collection = source === "mp-ferroelectric-ext" ? "ferroelectric-ext" : "ferroelectric";
      option.textContent = `${item.formula || ""} · ${collection}`;
      return option;
    }));
    selector.addEventListener("change", () => {
      loadQuery(selector.value).catch((error) => {
        document.querySelector("main").innerHTML = `<p class="error">Could not load recovery data: ${error.message}.</p>`;
      });
    });
    const id = ids.includes(initialQuery) ? initialQuery : ids[0];
    selector.value = id;
    await loadQuery(id);
  } catch (error) {
    document.querySelector("main").innerHTML = `<p class="error">Could not load recovery data: ${error.message}. Serve this directory locally with <code>python -m http.server</code>.</p>`;
  }
}

$("frame").addEventListener("input", (event) => { frameIndex = Number(event.target.value); draw(); });
["cell", "bonds", "polyhedra", "motion", "labels"].forEach((id) => $(id).addEventListener("change", drawStructure));
$("polyhedra").parentElement.title = "Draw regular tetrahedra (four ligands), octahedra (six), and pentagonal bipyramids (seven); skip five-coordinate and noticeably distorted shells.";
$("fit-toggle").addEventListener("change", draw);
$("atom-size").addEventListener("input", (event) => {
  $("atom-size-value").textContent = `${Number(event.target.value).toFixed(2)}×`;
  drawStructure();
});
$("play").addEventListener("click", () => {
  if (playing) {
    clearInterval(playing);
    playing = null;
    $("play").textContent = "Play";
    return;
  }
  playDirection = frameIndex >= data.frames.length - 1 ? -1 : 1;
  $("play").textContent = "Pause";
  playing = setInterval(() => {
    if (data.frames.length < 2) return;
    if (frameIndex >= data.frames.length - 1) playDirection = -1;
    else if (frameIndex <= 0) playDirection = 1;
    frameIndex += playDirection;
    draw();
  }, 260);
});
$("reset").addEventListener("click", () => {
  yaw = 0.72;
  pitch = -0.42;
  setStructureView("3d");
});
document.querySelectorAll("[data-structure-view]").forEach((button) => {
  button.addEventListener("click", () => setStructureView(button.dataset.structureView));
});
$("download").addEventListener("click", () => {
  const anchor = document.createElement("a");
  const blob = new Blob([xyz()], { type: "chemical/x-xyz" });
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `${data.query_id}_image_${frameIndex + 1}.extxyz`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
});
const structureCanvas = $("structure");
structureCanvas.addEventListener("pointerdown", (event) => {
  drag = {
    x: event.clientX,
    y: event.clientY,
    moved: false,
    pan: structureView !== "3d" || event.shiftKey,
  };
  structureCanvas.setPointerCapture(event.pointerId);
});
structureCanvas.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
  if (drag.pan) {
    pan.x += dx;
    pan.y += dy;
  } else {
    yaw += dx * 0.009;
    pitch = Math.max(-1.45, Math.min(1.45, pitch + dy * 0.009));
  }
  drag.x = event.clientX;
  drag.y = event.clientY;
  drawStructure();
});
structureCanvas.addEventListener("pointerup", (event) => {
  if (drag && !drag.moved && lastProjectedAtoms.length) {
    const bounds = structureCanvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    let closest = -1;
    let distance = 20;
    lastProjectedAtoms.forEach((point, index) => {
      const current = Math.hypot(point.x - x, point.y - y);
      if (current < distance) { closest = index; distance = current; }
    });
    if (closest >= 0) { selectedAtom = closest; draw(); }
  }
  drag = null;
});
structureCanvas.addEventListener("pointercancel", () => { drag = null; });
structureCanvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  zoom = Math.max(0.55, Math.min(2.6, zoom * Math.exp(-event.deltaY * 0.001)));
  drawStructure();
}, { passive: false });
window.addEventListener("resize", draw);
load();
