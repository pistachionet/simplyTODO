// Canvas renderer - draws all nodes and connections
import {
  CATEGORY_WIDTH,
  CATEGORY_HEIGHT,
  TASK_WIDTH,
  TASK_HEIGHT,
  TASK_LINE_HEIGHT,
  TASK_PADDING_Y,
  DELETE_BADGE_RADIUS,
  FONT_CATEGORY_TITLE,
  FONT_TASK_TITLE,
  FONT_TASK_TITLE_DONE,
  FONT_ADD_BUTTON,
  FONT_DELETE,
  PRIORITY_BADGE_WIDTH,
  PRIORITY_BADGE_HEIGHT,
  PRIORITY_COLORS,
  THEME_LIGHT,
} from './constants.js';
import { wrapText, getTaskNodeHeight, getTextStartOffset } from './measure.js';

function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

export function render(ctx, canvas, nodes, camera, editingNodeId, selectedNodeId, showPriority, theme, expandText) {
  const t = theme || THEME_LIGHT;
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;

  // Clear
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, width, height);

  // Draw dot grid
  drawDotGrid(ctx, width, height, camera, t);

  // Apply camera transform
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);

  const categories = nodes.filter((n) => n.type === 'category');
  const tasks = nodes.filter((n) => n.type === 'task');

  // Draw connections first (behind nodes)
  for (const cat of categories) {
    const catTasks = tasks.filter((task) => task.parent_id === cat.id);
    for (const task of catTasks) {
      drawConnection(ctx, cat, task, t);
    }
  }

  // Draw category nodes
  for (const cat of categories) {
    drawCategoryNode(ctx, cat, cat.id === selectedNodeId, cat.id === editingNodeId, t);
  }

  // Draw task nodes
  for (const task of tasks) {
    drawTaskNode(ctx, task, task.id === selectedNodeId, task.id === editingNodeId, showPriority, t, expandText);
  }

  ctx.restore();
}

function drawDotGrid(ctx, width, height, camera, t) {
  const spacing = 24;
  const dotSize = 1;
  const zoom = camera.zoom;
  const scaledSpacing = spacing * zoom;

  if (scaledSpacing < 8) return;

  const offsetX = camera.x % scaledSpacing;
  const offsetY = camera.y % scaledSpacing;

  ctx.fillStyle = t.dotGrid;
  for (let x = offsetX; x < width; x += scaledSpacing) {
    for (let y = offsetY; y < height; y += scaledSpacing) {
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawConnection(ctx, category, task, t) {
  const startX = category.x + CATEGORY_WIDTH / 2;
  const startY = category.y;
  const endX = task.x;
  const endY = task.y;

  const midX = startX + (endX - startX) * 0.5;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(midX, startY, midX, endY, endX, endY);

  ctx.strokeStyle = task.completed ? t.connectionDone : t.connection;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawCategoryNode(ctx, node, isSelected, isEditing, t) {
  const x = node.x - CATEGORY_WIDTH / 2;
  const y = node.y - CATEGORY_HEIGHT / 2;
  const w = CATEGORY_WIDTH;
  const h = CATEGORY_HEIGHT;
  const r = 14;

  // Shadow
  ctx.save();
  ctx.shadowColor = isSelected ? t.categoryShadowSelected : t.categoryShadow;
  ctx.shadowBlur = isSelected ? 16 : 8;
  ctx.shadowOffsetY = 2;

  // Background
  ctx.fillStyle = isSelected ? t.categoryBgSelected : t.categoryBg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.restore();

  // Border
  ctx.strokeStyle = isSelected ? t.categoryBorderSelected : t.categoryBorder;
  ctx.lineWidth = isSelected ? 2 : 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();

  // Title
  if (!isEditing) {
    ctx.fillStyle = t.categoryText;
    ctx.font = FONT_CATEGORY_TITLE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = truncateText(ctx, node.title, w - 40);
    ctx.fillText(text, node.x, node.y);
  }

  // "+" button (bottom-right)
  const btnX = x + w - 8;
  const btnY = y + h - 8;
  const btnR = 16;
  ctx.fillStyle = t.btnBg;
  ctx.beginPath();
  ctx.arc(btnX, btnY, btnR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = t.btnBorder;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = t.btnIcon;
  ctx.font = FONT_ADD_BUTTON;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', btnX, btnY);
}

function drawTaskNode(ctx, node, isSelected, isEditing, showPriority, t, expandText) {
  const hasPriority = !!(node.priority);
  const h = getTaskNodeHeight(node.title, node.completed, showPriority, hasPriority, expandText);
  const x = node.x;
  const y = node.y - TASK_HEIGHT / 2; // top edge stays fixed (grows downward)
  const w = TASK_WIDTH;
  const r = 10;

  // Shadow
  ctx.save();
  ctx.shadowColor = isSelected ? t.taskShadowSelected : t.taskShadow;
  ctx.shadowBlur = isSelected ? 12 : 4;
  ctx.shadowOffsetY = 1;

  // Background
  ctx.fillStyle = node.completed ? t.taskBgDone : t.taskBg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.restore();

  // Border
  ctx.strokeStyle = isSelected ? t.taskBorderSelected : t.taskBorder;
  ctx.lineWidth = isSelected ? 2 : 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();

  // Checkbox (stays at first-line center = node.y)
  const cbX = x + 20;
  const cbY = node.y;
  const cbR = 10;
  ctx.beginPath();
  ctx.arc(cbX, cbY, cbR, 0, Math.PI * 2);
  if (node.completed) {
    ctx.fillStyle = t.checkboxFill;
    ctx.fill();
    // Checkmark
    ctx.strokeStyle = t.checkboxCheck;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cbX - 5, cbY);
    ctx.lineTo(cbX - 1, cbY + 4);
    ctx.lineTo(cbX + 5, cbY - 4);
    ctx.stroke();
  } else {
    ctx.strokeStyle = t.checkboxBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Priority badge (optional, rendered between checkbox and title)
  let textStartX = x + 40;
  const pColors = t.priorityColors || PRIORITY_COLORS;
  if (showPriority && node.priority && pColors[node.priority]) {
    const colors = pColors[node.priority];
    const badgeX = x + 40;
    const badgeY = node.y - PRIORITY_BADGE_HEIGHT / 2;
    const bw = PRIORITY_BADGE_WIDTH;
    const bh = PRIORITY_BADGE_HEIGHT;
    const br = 4;

    ctx.fillStyle = colors.bg;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, bw, bh, br);
    ctx.fill();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, bw, bh, br);
    ctx.stroke();

    ctx.fillStyle = colors.text;
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.priority[0].toUpperCase(), badgeX + bw / 2, node.y);

    textStartX = x + 40 + PRIORITY_BADGE_WIDTH + 8;
  }

  // Title
  if (!isEditing) {
    const font = node.completed ? FONT_TASK_TITLE_DONE : FONT_TASK_TITLE;
    ctx.fillStyle = node.completed ? t.taskTextDone : t.taskText;
    ctx.font = font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const availWidth = w - (textStartX - x) - 20;

    if (expandText && h > TASK_HEIGHT) {
      // Multi-line: draw wrapped lines
      const lines = wrapText(node.title, font, availWidth);
      const firstLineY = y + TASK_PADDING_Y + TASK_LINE_HEIGHT / 2;

      for (let i = 0; i < lines.length; i++) {
        const lineY = firstLineY + i * TASK_LINE_HEIGHT;
        ctx.fillText(lines[i], textStartX, lineY);

        if (node.completed) {
          const tw = ctx.measureText(lines[i]).width;
          ctx.strokeStyle = t.taskTextDone;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(textStartX, lineY);
          ctx.lineTo(textStartX + tw, lineY);
          ctx.stroke();
        }
      }
    } else {
      // Single line: truncate as before
      const text = truncateText(ctx, node.title, availWidth);

      if (node.completed) {
        ctx.fillText(text, textStartX, node.y);
        const tw = ctx.measureText(text).width;
        ctx.strokeStyle = t.taskTextDone;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(textStartX, node.y);
        ctx.lineTo(textStartX + tw, node.y);
        ctx.stroke();
      } else {
        ctx.fillText(text, textStartX, node.y);
      }
    }
  }

  // Delete badge - floating circle at top-right CORNER of the box
  const delX = x + w - 2;
  const delY = y + 2;
  const delR = DELETE_BADGE_RADIUS;

  ctx.fillStyle = t.btnBg;
  ctx.beginPath();
  ctx.arc(delX, delY, delR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = t.btnBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(delX, delY, delR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = t.deleteIcon;
  ctx.font = FONT_DELETE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u00d7', delX, delY);
}
