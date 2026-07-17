export type KineticCellShape = "square" | "hexagon" | "circle" | "diamond";

export type KineticCell = Readonly<{
  column: number;
  height: number;
  row: number;
  width: number;
  x: number;
  y: number;
}>;

export type KineticGeometryInput = Readonly<{
  gap: number;
  height: number;
  overflow: number;
  shape: KineticCellShape;
  size: number;
  width: number;
}>;

export function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

export function cellNoise(row: number, column: number, seed: number) {
  const value = Math.sin(row * 17.17 + column * 61.73 + seed * 29.41) * 43758.5453;
  return value - Math.floor(value);
}

export function coherentCellNoise(
  row: number,
  column: number,
  seed: number,
  scale: number,
) {
  const x = column / Math.max(1, scale);
  const y = row / Math.max(1, scale);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const offsetX = x - x0;
  const offsetY = y - y0;
  const mixX = offsetX ** 2 * (3 - 2 * offsetX);
  const mixY = offsetY ** 2 * (3 - 2 * offsetY);
  const top = cellNoise(y0, x0, seed) * (1 - mixX)
    + cellNoise(y0, x0 + 1, seed) * mixX;
  const bottom = cellNoise(y0 + 1, x0, seed) * (1 - mixX)
    + cellNoise(y0 + 1, x0 + 1, seed) * mixX;
  return (top * (1 - mixY) + bottom * mixY) * 2 - 1;
}

export function createCellGeometry({
  gap,
  height,
  overflow,
  shape,
  size,
  width,
}: KineticGeometryInput): readonly KineticCell[] {
  const connected = shape === "hexagon" || shape === "diamond";
  const cellWidth = size;
  const cellHeight = shape === "hexagon" ? size * Math.sqrt(3) / 2 : size;
  const resolvedGap = connected ? 0 : gap;
  const stepX = shape === "hexagon" ? cellWidth * 0.75 : cellWidth + resolvedGap;
  const stepY = shape === "diamond" ? cellHeight * 0.5 : cellHeight + resolvedGap;
  const firstColumn = Math.floor(-overflow / stepX) - 2;
  const lastColumn = Math.ceil((width + overflow) / stepX) + 2;
  const firstRow = Math.floor(-overflow / stepY) - 2;
  const lastRow = Math.ceil((height + overflow) / stepY) + 2;
  const cells: KineticCell[] = [];

  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const offsetX = shape === "diamond"
        ? positiveModulo(row, 2) * cellWidth / 2
        : 0;
      const offsetY = shape === "hexagon"
        ? positiveModulo(column, 2) * cellHeight / 2
        : 0;
      const x = (column + 0.5) * stepX + offsetX;
      const y = (row + 0.5) * stepY + offsetY;

      if (
        x + cellWidth / 2 < -overflow
        || x - cellWidth / 2 > width + overflow
        || y + cellHeight / 2 < -overflow
        || y - cellHeight / 2 > height + overflow
      ) {
        continue;
      }

      cells.push(Object.freeze({
        column,
        height: Math.max(1, cellHeight - resolvedGap),
        row,
        width: Math.max(1, cellWidth - resolvedGap),
        x,
        y,
      }));
    }
  }

  return cells;
}
