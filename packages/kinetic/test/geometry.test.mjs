import assert from "node:assert/strict";
import test from "node:test";

import { createCellGeometry } from "../dist/geometry.js";

test("cell geometry creates distinct square, honeycomb, circle, and interlocked layouts", () => {
  const base = { gap: 2, height: 120, overflow: 0, size: 24, width: 160 };
  const square = createCellGeometry({ ...base, shape: "square" });
  const circle = createCellGeometry({ ...base, shape: "circle" });
  const hexagon = createCellGeometry({ ...base, shape: "hexagon" });
  const diamond = createCellGeometry({ ...base, shape: "diamond" });

  assert.ok(square.length > 0);
  assert.equal(square[0].width, 22);
  assert.equal(circle[0].width, 22);
  assert.equal(hexagon[0].width, 24);
  assert.equal(diamond[0].width, 24);
  assert.notEqual(hexagon[0].y, hexagon[1].y);

  const firstDiamondRow = diamond.find((cell) => cell.row % 2 === 0);
  const secondDiamondRow = diamond.find((cell) => cell.row === firstDiamondRow.row + 1);
  assert.equal(Math.abs(firstDiamondRow.x - secondDiamondRow.x), 12);
});

test("overflow geometry extends beyond the owned surface without changing cell size", () => {
  const contained = createCellGeometry({
    gap: 1,
    height: 100,
    overflow: 0,
    shape: "square",
    size: 20,
    width: 100,
  });
  const extended = createCellGeometry({
    gap: 1,
    height: 100,
    overflow: 14,
    shape: "square",
    size: 20,
    width: 100,
  });

  assert.ok(extended.length > contained.length);
  assert.ok(extended.some((cell) => cell.x < 0 || cell.x > 100 || cell.y < 0 || cell.y > 100));
  assert.equal(new Set(extended.map((cell) => cell.width)).size, 1);
});
