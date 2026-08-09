// @ts-check

/**
 * @param {number} activeIndex
 * @param {number} total
 */
export function calculateProgressPercent(activeIndex, total) {
  if (total <= 0) return 0;
  return Math.round(((Math.max(0, Math.min(activeIndex, total - 1)) + 1) / total) * 100);
}

/**
 * @param {{ id: string }[]} milestones
 * @param {{ milestoneId: string, order: number }[]} blocks
 * @param {number} highestOrder
 */
export function calculateCompletedMilestones(milestones, blocks, highestOrder) {
  return milestones
    .filter((milestone) => {
      const orders = blocks.filter((block) => block.milestoneId === milestone.id).map((block) => block.order);
      return orders.length > 0 && Math.max(...orders) <= highestOrder;
    })
    .map((milestone) => milestone.id);
}
