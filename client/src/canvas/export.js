// Export utilities: PNG screenshot and Markdown checklist
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
  PRIORITY_BADGE_WIDTH,
  PRIORITY_BADGE_HEIGHT,
  PRIORITY_COLORS,
  THEME_LIGHT,
} from './constants.js';
import { wrapText, getTaskNodeHeight } from './measure.js';

// ── PNG Export ────────────────────────────────────────────────────

export function exportPNG(nodes, showPriority, theme, expandText) {
  if (nodes.length === 0) return;

  const t = theme || THEME_LIGHT;

  // Compute bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    if (n.type === 'category') {
      minX = Math.min(minX, n.x - CATEGORY_WIDTH / 2);
      maxX = Math.max(maxX, n.x + CATEGORY_WIDTH / 2);
      minY = Math.min(minY, n.y - CATEGORY_HEIGHT / 2);
      maxY = Math.max(maxY, n.y + CATEGORY_HEIGHT / 2);
    } else {
      const h = getTaskNodeHeight(n.title, n.completed, showPriority, !!n.priority, expandText);
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x + TASK_WIDTH + DELETE_BADGE_RADIUS);
      minY = Math.min(minY, n.y - TASK_HEIGHT / 2 - DELETE_BADGE_RADIUS);
      maxY = Math.max(maxY, n.y - TASK_HEIGHT / 2 + h);
    }
  }

  const padding = 60;
  const w = maxX - minX + padding * 2;
  const h = maxY - minY + padding * 2;
  const dpr = 2; // export at 2x for crispness

  const canvas = document.createElement('canvas');
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, w, h);

  // Offset so content starts at padding
  ctx.save();
  ctx.translate(padding - minX, padding - minY);

  const categories = nodes.filter((n) => n.type === 'category');
  const tasks = nodes.filter((n) => n.type === 'task');

  // Draw connections
  for (const cat of categories) {
    const catTasks = tasks.filter((task) => task.parent_id === cat.id);
    for (const task of catTasks) {
      const startX = cat.x + CATEGORY_WIDTH / 2;
      const startY = cat.y;
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
  }

  // Draw category nodes
  for (const node of categories) {
    const x = node.x - CATEGORY_WIDTH / 2;
    const y = node.y - CATEGORY_HEIGHT / 2;
    const cw = CATEGORY_WIDTH;
    const ch = CATEGORY_HEIGHT;
    const r = 14;

    ctx.fillStyle = t.categoryBg;
    ctx.beginPath();
    ctx.roundRect(x, y, cw, ch, r);
    ctx.fill();

    ctx.strokeStyle = t.categoryBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, cw, ch, r);
    ctx.stroke();

    ctx.fillStyle = t.categoryText;
    ctx.font = FONT_CATEGORY_TITLE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.title, node.x, node.y);
  }

  // Draw task nodes
  for (const node of tasks) {
    const hasPriority = !!node.priority;
    const th = getTaskNodeHeight(node.title, node.completed, showPriority, hasPriority, expandText);
    const x = node.x;
    const y = node.y - TASK_HEIGHT / 2;
    const tw = TASK_WIDTH;
    const r = 10;

    ctx.fillStyle = node.completed ? t.taskBgDone : t.taskBg;
    ctx.beginPath();
    ctx.roundRect(x, y, tw, th, r);
    ctx.fill();

    ctx.strokeStyle = t.taskBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, tw, th, r);
    ctx.stroke();

    // Checkbox
    const cbX = x + 20;
    const cbY = node.y;
    const cbR = 10;
    ctx.beginPath();
    ctx.arc(cbX, cbY, cbR, 0, Math.PI * 2);
    if (node.completed) {
      ctx.fillStyle = t.checkboxFill;
      ctx.fill();
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

    // Priority badge
    let textStartX = x + 40;
    const pColors = t.priorityColors || PRIORITY_COLORS;
    if (showPriority && node.priority && pColors[node.priority]) {
      const colors = pColors[node.priority];
      const badgeX = x + 40;
      const badgeY = node.y - PRIORITY_BADGE_HEIGHT / 2;
      const bw = PRIORITY_BADGE_WIDTH;
      const bh = PRIORITY_BADGE_HEIGHT;

      ctx.fillStyle = colors.bg;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, bw, bh, 4);
      ctx.fill();
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, bw, bh, 4);
      ctx.stroke();

      ctx.fillStyle = colors.text;
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.priority[0].toUpperCase(), badgeX + bw / 2, node.y);

      textStartX = x + 40 + PRIORITY_BADGE_WIDTH + 8;
    }

    // Title
    const font = node.completed ? FONT_TASK_TITLE_DONE : FONT_TASK_TITLE;
    ctx.fillStyle = node.completed ? t.taskTextDone : t.taskText;
    ctx.font = font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const availWidth = tw - (textStartX - x) - 20;

    if (expandText && th > TASK_HEIGHT) {
      // Multi-line
      const lines = wrapText(node.title, font, availWidth);
      const firstLineY = y + TASK_PADDING_Y + TASK_LINE_HEIGHT / 2;

      for (let i = 0; i < lines.length; i++) {
        const lineY = firstLineY + i * TASK_LINE_HEIGHT;
        ctx.fillText(lines[i], textStartX, lineY);

        if (node.completed) {
          const textW = ctx.measureText(lines[i]).width;
          ctx.strokeStyle = t.taskTextDone;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(textStartX, lineY);
          ctx.lineTo(textStartX + textW, lineY);
          ctx.stroke();
        }
      }
    } else {
      // Single line (full text in export — no truncation)
      ctx.fillText(node.title, textStartX, node.y);

      if (node.completed) {
        const textW = ctx.measureText(node.title).width;
        ctx.strokeStyle = t.taskTextDone;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(textStartX, node.y);
        ctx.lineTo(textStartX + textW, node.y);
        ctx.stroke();
      }
    }
  }

  ctx.restore();

  // Trigger download
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simplytodo-export.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// ── Markdown Export ──────────────────────────────────────────────

export function exportMarkdown(nodes) {
  if (nodes.length === 0) return;

  const categories = nodes.filter((n) => n.type === 'category');
  const tasks = nodes.filter((n) => n.type === 'task');
  const orphanTasks = tasks.filter((t) => !categories.some((c) => c.id === t.parent_id));

  let md = '# SimplyTodo Export\n\n';

  for (const cat of categories) {
    md += `## ${cat.title}\n\n`;
    const catTasks = tasks.filter((t) => t.parent_id === cat.id);
    if (catTasks.length === 0) {
      md += '_No tasks_\n\n';
    } else {
      for (const task of catTasks) {
        const check = task.completed ? 'x' : ' ';
        const priority = task.priority ? ` [${task.priority.charAt(0).toUpperCase()}]` : '';
        md += `- [${check}] ${task.title}${priority}\n`;
      }
      md += '\n';
    }
  }

  if (orphanTasks.length > 0) {
    md += '## Uncategorized\n\n';
    for (const task of orphanTasks) {
      const check = task.completed ? 'x' : ' ';
      const priority = task.priority ? ` [${task.priority.charAt(0).toUpperCase()}]` : '';
      md += `- [${check}] ${task.title}${priority}\n`;
    }
    md += '\n';
  }

  // Trigger download
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'simplytodo-export.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
