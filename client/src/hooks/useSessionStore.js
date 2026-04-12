import { create } from 'zustand';

// Dark mode is global (not per-session) so it persists on the landing page
function loadDarkMode() {
  try {
    return localStorage.getItem('mindtodo_darkMode') === 'true';
  } catch { return false; }
}

export const useStore = create((set, get) => ({
  // Session state
  sessionCode: null,
  connected: false,

  // Canvas nodes
  nodes: [],

  // Canvas transform
  camera: { x: 0, y: 0, zoom: 1 },

  // UI state
  editingNodeId: null,
  selectedNodeId: null,
  contextMenu: null, // { x, y, nodeId }

  // Dark mode (global, persisted outside session)
  darkMode: loadDarkMode(),

  // Settings (persisted to localStorage per session)
  settings: {
    showPriority: false,
    expandText: false,
  },

  // Actions
  setSessionCode: (code) => {
    // Load settings from localStorage when joining a session
    let settings = { showPriority: false, expandText: false };
    if (code) {
      try {
        const stored = localStorage.getItem(`mindtodo_settings_${code}`);
        if (stored) settings = { ...settings, ...JSON.parse(stored) };
      } catch { /* ignore */ }
    }
    set({ sessionCode: code, settings });
  },
  setConnected: (connected) => set({ connected }),

  setNodes: (nodes) => set({ nodes }),

  addNode: (node) => set((state) => ({
    nodes: [...state.nodes, node],
  })),

  updateNode: (updated) => set((state) => ({
    nodes: state.nodes.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)),
  })),

  removeNode: (id, childrenDeleted = []) => set((state) => ({
    nodes: state.nodes.filter((n) => n.id !== id && !childrenDeleted.includes(n.id)),
  })),

  moveNode: (id, x, y) => set((state) => ({
    nodes: state.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
  })),

  setCamera: (camera) => set({ camera }),

  setEditingNodeId: (id) => set({ editingNodeId: id }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  setContextMenu: (menu) => set({ contextMenu: menu }),

  setDarkMode: (dark) => {
    set({ darkMode: dark });
    try {
      localStorage.setItem('mindtodo_darkMode', String(dark));
    } catch { /* ignore */ }
  },

  updateSettings: (partial) => {
    const state = get();
    const newSettings = { ...state.settings, ...partial };
    set({ settings: newSettings });
    // Persist to localStorage
    if (state.sessionCode) {
      try {
        localStorage.setItem(
          `mindtodo_settings_${state.sessionCode}`,
          JSON.stringify(newSettings)
        );
      } catch { /* ignore */ }
    }
  },

  // Helpers
  getCategoriesWithTasks: () => {
    const { nodes } = get();
    const categories = nodes.filter((n) => n.type === 'category');
    return categories.map((cat) => ({
      ...cat,
      tasks: nodes.filter((n) => n.parent_id === cat.id),
    }));
  },
}));
