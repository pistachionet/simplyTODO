// Hit testing - determine which node (if any) was clicked
import {
  CATEGORY_WIDTH,
  CATEGORY_HEIGHT,
  TASK_WIDTH,
  TASK_HEIGHT,
  ADD_BUTTON_RADIUS,
  DELETE_BADGE_RADIUS,
} from './constants.js';
import { getTaskNodeHeight } from './measure.js';

export function hitTest(nodes, worldX, worldY, showPriority, expandText) {
  // Test in reverse order (top-most nodes first)
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];

    if (node.type === 'category') {
      const w = CATEGORY_WIDTH;
      const h = CATEGORY_HEIGHT;

      // Check "+" button first (bottom-right of category)
      const btnX = node.x + w / 2 - 8;
      const btnY = node.y + h / 2 - 8;
      const btnDist = Math.hypot(worldX - btnX, worldY - btnY);
      if (btnDist <= ADD_BUTTON_RADIUS) {
        return { type: 'add_task', node };
      }

      // Check category body
      if (
        worldX >= node.x - w / 2 &&
        worldX <= node.x + w / 2 &&
        worldY >= node.y - h / 2 &&
        worldY <= node.y + h / 2
      ) {
        return { type: 'category', node };
      }
    } else {
      // Task node — use dynamic height
      const x = node.x;
      const y = node.y - TASK_HEIGHT / 2; // top edge (same anchor as renderer)
      const w = TASK_WIDTH;
      const h = getTaskNodeHeight(node.title, node.completed, showPriority, !!node.priority, expandText);

      // Check delete badge first (floating circle at top-right corner)
      const delX = x + w - 2;
      const delY = y + 2;
      const delDist = Math.hypot(worldX - delX, worldY - delY);
      if (delDist <= DELETE_BADGE_RADIUS + 4) {
        // +4px extra padding for easier tapping
        return { type: 'delete', node };
      }

      // Check task body
      if (
        worldX >= x - 10 &&
        worldX <= x + w &&
        worldY >= y &&
        worldY <= y + h
      ) {
        // Check checkbox area (left 34px)
        if (worldX <= x + 34) {
          return { type: 'toggle', node };
        }
        return { type: 'task', node };
      }
    }
  }
  return null;
}
