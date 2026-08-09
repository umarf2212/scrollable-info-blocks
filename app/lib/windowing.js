// @ts-check

/**
 * Returns the small inclusive range whose expensive block bodies should be mounted.
 * All lightweight viewport shells remain in the document to preserve native snap points.
 *
 * @param {number} total
 * @param {number} activeIndex
 * @param {number} radius
 */
export function getMountWindow(total, activeIndex, radius) {
  if (total <= 0) return [];
  const safeRadius = Math.max(1, Math.floor(radius));
  const start = Math.max(0, activeIndex - safeRadius);
  const end = Math.min(total - 1, activeIndex + safeRadius);
  return Array.from({ length: end - start + 1 }, (_, offset) => start + offset);
}

/**
 * @param {number} index
 * @param {number} activeIndex
 * @param {number} radius
 */
export function isInsideMountWindow(index, activeIndex, radius) {
  return Math.abs(index - activeIndex) <= Math.max(1, Math.floor(radius));
}
