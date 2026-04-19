// Shared dimension constants for canvas nodes
// Single source of truth used by renderer.js, hitTest.js, Board.jsx

// Category nodes (rounded rectangles)
export const CATEGORY_WIDTH = 220;
export const CATEGORY_HEIGHT = 60;

// Task nodes (smaller rectangles branching off categories)
export const TASK_WIDTH = 320;
export const TASK_HEIGHT = 56;

// "+" button on categories
export const ADD_BUTTON_RADIUS = 18;

// Delete badge (top-right corner of task)
export const DELETE_BADGE_RADIUS = 12;

// Text expansion (auto-grow task boxes)
export const TASK_LINE_HEIGHT = 22;
export const TASK_PADDING_Y = 16;

// Spacing when auto-placing new tasks
export const TASK_OFFSET_X = 220;
export const TASK_SPACING_Y = 72;

// Font sizes
export const FONT_CATEGORY_TITLE = '600 20px Inter, sans-serif';
export const FONT_TASK_TITLE = '500 17px Inter, sans-serif';
export const FONT_TASK_TITLE_DONE = '400 17px Inter, sans-serif';
export const FONT_ADD_BUTTON = '600 18px Inter, sans-serif';
export const FONT_DELETE = '600 14px Inter, sans-serif';

// Priority badge
export const PRIORITY_BADGE_WIDTH = 24;
export const PRIORITY_BADGE_HEIGHT = 18;
export const PRIORITY_COLORS = {
  high:   { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
  medium: { bg: '#fffbeb', border: '#fcd34d', text: '#d97706' },
  low:    { bg: '#eff6ff', border: '#93c5fd', text: '#2563eb' },
};

// ── Node Color Palette ───────────────────────────────────────────
// User-selectable background colors for task nodes (pastels).
// `value` is persisted to DB (hex) or null for theme default.
export const NODE_COLORS = [
  { value: null,      label: 'Default', swatch: 'transparent' },
  { value: '#fecaca', label: 'Red',     swatch: '#fecaca' },
  { value: '#fed7aa', label: 'Orange',  swatch: '#fed7aa' },
  { value: '#fef08a', label: 'Yellow',  swatch: '#fef08a' },
  { value: '#bbf7d0', label: 'Green',   swatch: '#bbf7d0' },
  { value: '#bae6fd', label: 'Blue',    swatch: '#bae6fd' },
  { value: '#ddd6fe', label: 'Purple',  swatch: '#ddd6fe' },
  { value: '#fbcfe8', label: 'Pink',    swatch: '#fbcfe8' },
];

// Bolder, saturated versions for category nodes (same hues as NODE_COLORS).
export const CATEGORY_COLORS = [
  { value: null,      label: 'Default', swatch: 'transparent' },
  { value: '#ef4444', label: 'Red',     swatch: '#ef4444' },
  { value: '#f97316', label: 'Orange',  swatch: '#f97316' },
  { value: '#eab308', label: 'Yellow',  swatch: '#eab308' },
  { value: '#22c55e', label: 'Green',   swatch: '#22c55e' },
  { value: '#3b82f6', label: 'Blue',    swatch: '#3b82f6' },
  { value: '#8b5cf6', label: 'Purple',  swatch: '#8b5cf6' },
  { value: '#ec4899', label: 'Pink',    swatch: '#ec4899' },
];

// ── Canvas Theme Colors ──────────────────────────────────────────
// These drive the canvas renderer (CSS variables can't reach <canvas>)

export const THEME_LIGHT = {
  bg: '#fafafa',
  dotGrid: '#e0e0e0',
  // Category nodes
  categoryBg: '#ffffff',
  categoryBgSelected: '#eff6ff',
  categoryShadow: 'rgba(0, 0, 0, 0.08)',
  categoryShadowSelected: 'rgba(37, 99, 235, 0.25)',
  categoryBorder: '#e5e7eb',
  categoryBorderSelected: '#2563eb',
  categoryText: '#1a1a1a',
  // Task nodes
  taskBg: '#ffffff',
  taskBgDone: '#f9fafb',
  taskShadow: 'rgba(0, 0, 0, 0.05)',
  taskShadowSelected: 'rgba(37, 99, 235, 0.2)',
  taskBorder: '#e5e7eb',
  taskBorderSelected: '#2563eb',
  taskText: '#374151',
  taskTextDone: '#9ca3af',
  // Checkbox
  checkboxBorder: '#d1d5db',
  checkboxFill: '#2563eb',
  checkboxCheck: '#ffffff',
  // Connection lines
  connection: '#9ca3af',
  connectionDone: '#d1d5db',
  // Add / Delete buttons
  btnBg: '#f3f4f6',
  btnBorder: '#d1d5db',
  btnIcon: '#6b7280',
  deleteIcon: '#9ca3af',
  // Priority colors (light)
  priorityColors: {
    high:   { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
    medium: { bg: '#fffbeb', border: '#fcd34d', text: '#d97706' },
    low:    { bg: '#eff6ff', border: '#93c5fd', text: '#2563eb' },
  },
};

export const THEME_DARK = {
  bg: '#101011',
  dotGrid: '#666666',
  // Category nodes
  categoryBg: '#202026',
  categoryBgSelected: '#1a2a4a',
  categoryShadow: 'rgba(0, 0, 0, 0.4)',
  categoryShadowSelected: 'rgba(76, 141, 246, 0.35)',
  categoryBorder: '#333347',
  categoryBorderSelected: '#4c8df6',
  categoryText: '#f5f7fa',
  // Task nodes
  taskBg: '#202026',
  taskBgDone: '#1a1a1f',
  taskShadow: 'rgba(0, 0, 0, 0.3)',
  taskShadowSelected: 'rgba(76, 141, 246, 0.3)',
  taskBorder: '#333347',
  taskBorderSelected: '#4c8df6',
  taskText: '#d9d9d9',
  taskTextDone: '#666666',
  // Checkbox
  checkboxBorder: '#4a4a5a',
  checkboxFill: '#4c8df6',
  checkboxCheck: '#ffffff',
  // Connection lines
  connection: '#555566',
  connectionDone: '#3a3a44',
  // Add / Delete buttons
  btnBg: '#2a2a30',
  btnBorder: '#404050',
  btnIcon: '#bdbfc2',
  deleteIcon: '#888899',
  // Priority colors (dark - deeper saturated backgrounds, brighter text)
  priorityColors: {
    high:   { bg: '#3b1c1c', border: '#dc4444', text: '#ff6b6b' },
    medium: { bg: '#3b3318', border: '#d4a017', text: '#fbbf24' },
    low:    { bg: '#1c2a3b', border: '#3b82f6', text: '#60a5fa' },
  },
};
