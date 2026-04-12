// Markdown import parser
// Supports MindTodo export format:
//   # MindTodo Export
//   ## Category Name
//   - [ ] Task text [H]
//   - [x] Completed task [M]

const CATEGORY_RE = /^##\s+(.+)$/;
const TASK_RE = /^-\s+\[([ xX])\]\s+(.+)$/;
const PRIORITY_RE = /\s+\[([HMLhml])\]\s*$/;

/**
 * Parse a MindTodo-format markdown string.
 * Returns an array of categories, each with a title and tasks array:
 *   [{ title: string, tasks: [{ title: string, completed: boolean, priority: string|null }] }]
 */
export function parseMarkdown(text) {
  const lines = text.split(/\r?\n/);
  const categories = [];
  let current = null;

  for (const raw of lines) {
    const line = raw.trim();

    // Skip the top-level title
    if (/^#\s+/.test(line) && !line.startsWith('##')) continue;

    // Category heading
    const catMatch = line.match(CATEGORY_RE);
    if (catMatch) {
      current = { title: catMatch[1].trim(), tasks: [] };
      categories.push(current);
      continue;
    }

    // Task item
    const taskMatch = line.match(TASK_RE);
    if (taskMatch && current) {
      const completed = taskMatch[1] !== ' ';
      let title = taskMatch[2].trim();
      let priority = null;

      const prioMatch = title.match(PRIORITY_RE);
      if (prioMatch) {
        const letter = prioMatch[1].toUpperCase();
        priority = letter === 'H' ? 'high' : letter === 'M' ? 'medium' : 'low';
        title = title.replace(PRIORITY_RE, '').trim();
      }

      current.tasks.push({ title, completed, priority });
    }
  }

  return categories;
}
