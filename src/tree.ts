import { ShortcutItem } from './types';

export interface GroupNode {
  name: string;        // e.g. "Hetzner"
  fullPath: string;    // e.g. "Work / Cloud / Hetzner"
  depth: number;       // 0 for top-level, 1 for child, etc.
  items: ShortcutItem[];
  children: Map<string, GroupNode>;
}

export function parseGroupHierarchy(items: ShortcutItem[]): GroupNode {
  const root: GroupNode = {
    name: 'Root',
    fullPath: '',
    depth: -1,
    items: [],
    children: new Map()
  };

  for (const item of items) {
    const rawGroup = (item.group || 'General').trim();
    const parts = rawGroup.split('/').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) parts.push('General');

    let current = root;
    let accumulatedPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumulatedPath = accumulatedPath ? `${accumulatedPath} / ${part}` : part;

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          fullPath: accumulatedPath,
          depth: i,
          items: [],
          children: new Map()
        });
      }
      current = current.children.get(part)!;
    }

    current.items.push(item);
  }

  return root;
}

export function getIndentedGroupList(items: ShortcutItem[]): Array<{ title: string; value: string; depth: number }> {
  const root = parseGroupHierarchy(items);
  const result: Array<{ title: string; value: string; depth: number }> = [];

  function traverse(node: GroupNode) {
    for (const child of node.children.values()) {
      const totalCount = countTotalItems(child);
      const indent = '  '.repeat(child.depth);
      const prefix = child.depth === 0 ? '📁 ' : '└─ 📁 ';
      result.push({
        title: `${indent}${prefix}${child.name} (${totalCount})`,
        value: child.fullPath,
        depth: child.depth
      });
      traverse(child);
    }
  }

  traverse(root);
  return result;
}

export function countTotalItems(node: GroupNode): number {
  let count = node.items.length;
  for (const child of node.children.values()) {
    count += countTotalItems(child);
  }
  return count;
}

export function formatBreadcrumb(groupPath: string): string {
  const parts = groupPath.split('/').map((s) => s.trim()).filter(Boolean);
  return parts.join(' › ');
}

export function getItemTreePrefix(index: number, total: number, depth: number = 0): string {
  const isLast = index === total - 1;
  const branch = isLast ? '└── ' : '├── ';
  const indent = '│   '.repeat(Math.max(0, depth));
  return `${indent}${branch}`;
}
