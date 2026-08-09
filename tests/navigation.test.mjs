import assert from "node:assert/strict";
import test from "node:test";
import { calculateCompletedMilestones, calculateProgressPercent } from "../app/lib/progress.js";
import { getMountWindow, isInsideMountWindow } from "../app/lib/windowing.js";

test("progress is synchronized to conceptual position", () => {
  assert.equal(calculateProgressPercent(0, 20), 5);
  assert.equal(calculateProgressPercent(9, 20), 50);
  assert.equal(calculateProgressPercent(19, 20), 100);
  assert.equal(calculateProgressPercent(100, 20), 100);

  const milestones = [{ id: "one" }, { id: "two" }];
  const blocks = [
    { milestoneId: "one", order: 1 },
    { milestoneId: "one", order: 2 },
    { milestoneId: "two", order: 3 },
  ];
  assert.deepEqual(calculateCompletedMilestones(milestones, blocks, 1), []);
  assert.deepEqual(calculateCompletedMilestones(milestones, blocks, 2), ["one"]);
  assert.deepEqual(calculateCompletedMilestones(milestones, blocks, 3), ["one", "two"]);
});

test("a 1,000-block topic keeps only a bounded complex DOM window", () => {
  const beginning = getMountWindow(1000, 0, 2);
  const middle = getMountWindow(1000, 500, 2);
  const end = getMountWindow(1000, 999, 2);

  assert.deepEqual(beginning, [0, 1, 2]);
  assert.deepEqual(middle, [498, 499, 500, 501, 502]);
  assert.deepEqual(end, [997, 998, 999]);
  assert.ok(middle.length <= 5);
  assert.equal(isInsideMountWindow(502, 500, 2), true);
  assert.equal(isInsideMountWindow(503, 500, 2), false);
});
