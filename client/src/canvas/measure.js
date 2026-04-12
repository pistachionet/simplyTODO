// Shared text measurement utilities for canvas nodes
// Uses a lazy-created offscreen canvas so both renderer and hitTest
// can compute text dimensions without needing the on-screen context.

import {
  TASK_WIDTH,
  TASK_HEIGHT,
  TASK_LINE_HEIGHT,
  TASK_PADDING_Y,
  PRIORITY_BADGE_WIDTH,
  FONT_TASK_TITLE,
  FONT_TASK_TITLE_DONE,
} from './constants.js';

let _offCtx = null;

function getCtx() {
  if (!_offCtx) {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    _offCtx = c.getContext('2d');
  }
  return _offCtx;
}

/**
 * Word-wrap text into lines that fit within maxWidth.
 * Returns an array of strings (one per line).
 */
export function wrapText(text, font, maxWidth) {
  const ctx = getCtx();
  ctx.font = font;

  if (ctx.measureText(text).width <= maxWidth) return [text];

  const words = text.split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      // If a single word exceeds maxWidth, it goes on its own line (will be truncated when drawn)
      current = word;
    }
  }
  if (current) lines.push(current);

  return lines.length > 0 ? lines : [text];
}

/**
 * Compute the text-start X offset inside a task node (accounts for checkbox + priority badge).
 */
export function getTextStartOffset(showPriority, hasPriority) {
  if (showPriority && hasPriority) {
    return 40 + PRIORITY_BADGE_WIDTH + 8;
  }
  return 40;
}

/**
 * Get the rendered height of a task node.
 * When expandText is false, returns the fixed TASK_HEIGHT.
 * When expandText is true, returns a height that fits all wrapped lines.
 */
export function getTaskNodeHeight(text, completed, showPriority, hasPriority, expandText) {
  if (!expandText) return TASK_HEIGHT;

  const font = completed ? FONT_TASK_TITLE_DONE : FONT_TASK_TITLE;
  const textOffset = getTextStartOffset(showPriority, hasPriority);
  const availWidth = TASK_WIDTH - textOffset - 20; // 20px right padding

  const lines = wrapText(text, font, availWidth);
  if (lines.length <= 1) return TASK_HEIGHT;

  const textHeight = lines.length * TASK_LINE_HEIGHT;
  return Math.max(TASK_HEIGHT, TASK_PADDING_Y + textHeight + TASK_PADDING_Y);
}
