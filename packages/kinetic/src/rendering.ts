import {
  cellNoise,
  coherentCellNoise,
  createCellGeometry,
  type KineticCell,
  type KineticCellShape,
} from "./geometry.js";

export type KineticColorMode = "bands" | "gradient" | "single";

export type ResolvedCellConfiguration = Readonly<{
  colorMode: KineticColorMode;
  colors: readonly string[];
  gap: number;
  shape: KineticCellShape;
  sizes: readonly [number, number, number];
}>;

export type ResolvedFlowConfiguration = Readonly<{
  growth: number;
  intensity: number;
  maxCells: number;
  maxWaves: number;
  multi: boolean;
  overflow: number;
  recovery: number;
  seed: number;
  seedLocked: boolean;
  speed: number;
  thickness: number;
  turbulence: number;
  turbulenceScale: number;
}>;

export type KineticFlowFrame = Readonly<{
  progress: number;
  seed: number;
  strength: number;
  x: number;
  y: number;
}>;

export type KineticRenderState = Readonly<{
  flows: readonly KineticFlowFrame[];
}>;

export type KineticRenderConfiguration = Readonly<{
  cells: ResolvedCellConfiguration;
  flow: ResolvedFlowConfiguration;
  wave: boolean;
}>;

type Rgb = readonly [number, number, number, number];

const DEFAULT_COLOR: Rgb = [103, 232, 249, 1];

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function parseHex(value: string): Rgb | null {
  const match = value.trim().match(/^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i);
  if (!match) return null;
  const source = match[1];
  const expanded = source.length <= 4
    ? Array.from(source, (character) => `${character}${character}`).join("")
    : source;
  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
    expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
  ];
}

function parseRgb(value: string): Rgb | null {
  const match = value.trim().match(
    /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)%?)?\s*\)$/i,
  );
  if (!match) return null;
  const alpha = match[4] === undefined
    ? 1
    : clamp(Number(match[4]) / (match[0].includes("%") ? 100 : 1));
  return [
    clamp(Number(match[1]), 0, 255),
    clamp(Number(match[2]), 0, 255),
    clamp(Number(match[3]), 0, 255),
    alpha,
  ];
}

function parseColor(value: string): Rgb | null {
  return parseHex(value) ?? parseRgb(value);
}

function mixColor(from: Rgb, to: Rgb, amount: number): Rgb {
  const mix = clamp(amount);
  return [
    from[0] + (to[0] - from[0]) * mix,
    from[1] + (to[1] - from[1]) * mix,
    from[2] + (to[2] - from[2]) * mix,
    from[3] + (to[3] - from[3]) * mix,
  ];
}

function colorString(color: Rgb) {
  return `rgba(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])}, ${color[3].toFixed(4)})`;
}

function colorAt(
  colors: readonly Rgb[],
  mode: KineticColorMode,
  intensity: number,
) {
  if (colors.length === 1 || mode === "single") return colors[0] ?? DEFAULT_COLOR;
  const position = clamp(intensity) * (colors.length - 1);
  if (mode === "bands") {
    return colors[Math.min(colors.length - 1, Math.floor(clamp(intensity) * colors.length))];
  }
  const index = Math.floor(position);
  if (index >= colors.length - 1) return colors[colors.length - 1];
  return mixColor(colors[index], colors[index + 1], position - index);
}

function drawCell(
  context: CanvasRenderingContext2D,
  cell: KineticCell,
  shape: KineticCellShape,
  color: Rgb,
  opacity: number,
  scale: number,
  offsetX: number,
  offsetY: number,
) {
  const halfWidth = cell.width * scale / 2;
  const halfHeight = cell.height * scale / 2;
  const x = cell.x + offsetX;
  const y = cell.y + offsetY;
  context.beginPath();
  if (shape === "circle") {
    context.ellipse(x, y, halfWidth, halfHeight, 0, 0, Math.PI * 2);
  } else if (shape === "hexagon") {
    context.moveTo(x - halfWidth * 0.5, y - halfHeight);
    context.lineTo(x + halfWidth * 0.5, y - halfHeight);
    context.lineTo(x + halfWidth, y);
    context.lineTo(x + halfWidth * 0.5, y + halfHeight);
    context.lineTo(x - halfWidth * 0.5, y + halfHeight);
    context.lineTo(x - halfWidth, y);
    context.closePath();
  } else if (shape === "diamond") {
    context.moveTo(x, y - halfHeight);
    context.lineTo(x + halfWidth, y);
    context.lineTo(x, y + halfHeight);
    context.lineTo(x - halfWidth, y);
    context.closePath();
  } else {
    context.rect(x - halfWidth, y - halfHeight, halfWidth * 2, halfHeight * 2);
  }
  context.fillStyle = colorString(color);
  context.globalAlpha = clamp(opacity) * color[3];
  context.fill();
}

function kineticDepth(element: HTMLElement) {
  let depth = 0;
  let current = element.parentElement;
  while (current) {
    if (current.hasAttribute("data-dynt-kinetic")) depth += 1;
    if (depth >= 2) return 2;
    current = current.parentElement;
  }
  return depth;
}

function localShape(element: HTMLElement, fallback: KineticCellShape) {
  const shape = element.getAttribute("data-dynt-cell-shape");
  return shape === "square" || shape === "hexagon" || shape === "circle" || shape === "diamond"
    ? shape
    : fallback;
}

function localSize(element: HTMLElement, sizes: readonly [number, number, number]) {
  const configured = Number(element.getAttribute("data-dynt-cell-size"));
  if (Number.isFinite(configured) && configured >= 8 && configured <= 120) return configured;
  const inherited = Number.parseFloat(
    element.ownerDocument.defaultView
      ?.getComputedStyle(element)
      .getPropertyValue("--dynt-cell-size") ?? "",
  );
  if (Number.isFinite(inherited) && inherited >= 8 && inherited <= 120) return inherited;
  return sizes[kineticDepth(element)];
}

function localColors(
  element: HTMLElement,
  configuration: ResolvedCellConfiguration,
) {
  const cssColor = element.ownerDocument.defaultView
    ?.getComputedStyle(element)
    .getPropertyValue("--dynt-kinetic-color")
    .trim();
  const sources = configuration.colorMode === "single" && cssColor
    ? [cssColor]
    : configuration.colors;
  return sources.map(parseColor).filter((color): color is Rgb => color !== null);
}

export function renderKineticCanvas(
  canvas: HTMLCanvasElement | null,
  element: HTMLElement,
  configuration: KineticRenderConfiguration,
  state: KineticRenderState,
) {
  const context = canvas?.getContext("2d");
  if (!canvas || !context) return;
  const rectangle = element.getBoundingClientRect();
  const width = rectangle.width;
  const height = rectangle.height;
  if (width <= 0 || height <= 0) return;

  const overflow = configuration.wave ? configuration.flow.overflow : 0;
  const canvasWidth = width + overflow * 2;
  const canvasHeight = height + overflow * 2;
  const dpr = Math.min(element.ownerDocument.defaultView?.devicePixelRatio || 1, 1.5);
  const pixelWidth = Math.max(1, Math.round(canvasWidth * dpr));
  const pixelHeight = Math.max(1, Math.round(canvasHeight * dpr));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  canvas.style.inset = `${-overflow}px`;
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = true;

  const shape = localShape(element, configuration.cells.shape);
  const size = localSize(element, configuration.cells.sizes);
  const colors = localColors(element, configuration.cells);
  const baseCells = createCellGeometry({
    gap: configuration.cells.gap,
    height,
    overflow,
    shape,
    size,
    width,
  });
  let flowCount = 0;

  if (configuration.wave && state.flows.length > 0) {
    const waveBudget = Math.max(1, Math.floor(configuration.flow.maxCells / state.flows.length));
    for (const wave of state.flows) {
      const originX = (wave.x + 1) * width / 2;
      const originY = (wave.y + 1) * height / 2;
      const oppositeX = wave.x < 0 ? width : 0;
      const oppositeY = wave.y < 0 ? height : 0;
      const vectorX = oppositeX - originX;
      const vectorY = oppositeY - originY;
      const vectorLength = Math.max(1, Math.hypot(vectorX, vectorY));
      const directionX = vectorX / vectorLength;
      const directionY = vectorY / vectorLength;
      const sectionCapacity = clamp((Math.min(width, height) - 180) / 260);
      const travelCapacity = clamp((vectorLength - 180) / 520);
      const calculatedSpill = overflow * sectionCapacity * travelCapacity;
      const terminalSpill = calculatedSpill >= 1 ? calculatedSpill : 0;
      const maximumRadius = vectorLength + terminalSpill;
      const waveRadius = wave.progress * maximumRadius;
      const frontWidth = Math.max(size * 0.5, configuration.flow.thickness * size);
      const recoveryWidth = frontWidth * (0.6 + configuration.flow.recovery * 1.4);
      const candidates: Array<{
        cell: KineticCell;
        distance: number;
        intensity: number;
        projection: number;
      }> = [];

      for (const cell of baseCells) {
        const outsideX = cell.x < 0 ? -cell.x : Math.max(0, cell.x - width);
        const outsideY = cell.y < 0 ? -cell.y : Math.max(0, cell.y - height);
        if (outsideX > 0 || outsideY > 0) {
          const terminalX = directionX > 0 ? cell.x > width : cell.x < 0;
          const terminalY = directionY > 0 ? cell.y > height : cell.y < 0;
          if (
            terminalSpill === 0
            || (!terminalX && !terminalY)
            || Math.max(outsideX, outsideY) > terminalSpill
          ) {
            continue;
          }
        }
        const dx = cell.x - originX;
        const dy = cell.y - originY;
        const distance = Math.hypot(dx, dy);
        const projection = clamp((dx * directionX + dy * directionY) / vectorLength);
        const noise = coherentCellNoise(
          cell.row,
          cell.column,
          wave.seed,
          configuration.flow.turbulenceScale,
        );
        const grain = cellNoise(cell.row, cell.column, wave.seed + 31);
        const distortedDistance = Math.max(
          0,
          distance + noise * size * configuration.flow.turbulence * 3.6,
        );
        const distortedProjection = clamp(
          projection + noise * configuration.flow.turbulence * 0.08,
        );
        const frontDistance = distortedDistance - waveRadius;
        if (frontDistance > frontWidth || frontDistance < -recoveryWidth) continue;
        const crest = frontDistance >= 0
          ? 1 - frontDistance / frontWidth
          : 1 + frontDistance / recoveryWidth;
        const mask = clamp(0.5 + noise * 0.28 + (grain - 0.5) * 0.22);
        candidates.push({
          cell,
          distance,
          intensity: clamp(
            crest
              * (0.44 + distortedProjection * 0.32 + mask * 0.18)
              * configuration.flow.intensity
              * wave.strength,
          ),
          projection: distortedProjection,
        });
      }

      for (const candidate of candidates
        .sort((left, right) => left.distance - right.distance)
        .slice(0, waveBudget)) {
        const stage = Math.min(2, Math.floor(candidate.projection * 3));
        const scale = shape === "hexagon" || shape === "diamond"
          ? [
            1,
            1 + configuration.flow.growth * 0.025,
            1 + configuration.flow.growth * 0.06,
          ][stage]
          : [
            0.86 - configuration.flow.growth * 0.04,
            0.92 + configuration.flow.growth * 0.02,
            0.96 + configuration.flow.growth * 0.12,
          ][stage];
        drawCell(
          context,
          candidate.cell,
          shape,
          colorAt(colors, configuration.cells.colorMode, candidate.projection),
          0.16 + candidate.intensity * 0.78,
          scale,
          overflow,
          overflow - candidate.intensity * size * 0.06,
        );
        flowCount += 1;
      }
    }
  }

  context.globalAlpha = 1;
  canvas.dataset.dyntCellShape = shape;
  canvas.dataset.dyntCellSize = String(size);
  canvas.dataset.dyntFlowModel = "radial-turbulent";
  canvas.removeAttribute("data-dynt-field-cells");
  canvas.dataset.dyntFlowCells = String(flowCount);
  canvas.dataset.dyntFlowWaves = String(state.flows.length);
}
