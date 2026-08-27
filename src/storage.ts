import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, exec } from 'child_process';
import { ShortcutItem, ShortcutType } from './types';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'vicinae');
const DATA_FILE = path.join(CONFIG_DIR, 'grouped-shortcuts.json');
const NATIVE_SHORTCUTS_FILE = path.join(os.homedir(), '.local', 'share', 'vicinae', 'shortcuts', 'shortcuts.json');

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadShortcuts(): ShortcutItem[] {
  ensureConfigDir();
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.error('Error loading grouped shortcuts:', err);
    }
  }

  // If no grouped shortcuts file exists, attempt auto-import from native Vicinae shortcuts
  const imported = importNativeShortcuts();
  if (imported.length > 0) {
    saveShortcuts(imported);
    return imported;
  }

  // Default seed examples
  const defaults: ShortcutItem[] = [
    {
      id: 'default-1',
      title: 'GitHub Dashboard',
      type: 'url',
      target: 'https://github.com',
      group: 'Development / Repos',
      tags: ['git', 'code'],
      openCount: 0,
      createdAt: Date.now()
    },
    {
      id: 'default-2',
      title: 'Local Workspace',
      type: 'path',
      target: path.join(os.homedir(), 'Work'),
      group: 'Development / Projects',
      tags: ['folder', 'work'],
      openCount: 0,
      createdAt: Date.now()
    }
  ];
  saveShortcuts(defaults);
  return defaults;
}

export function saveShortcuts(items: ShortcutItem[]): void {
  ensureConfigDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

export function importNativeShortcuts(): ShortcutItem[] {
  if (!fs.existsSync(NATIVE_SHORTCUTS_FILE)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(NATIVE_SHORTCUTS_FILE, 'utf-8'));
    if (!Array.isArray(raw)) return [];

    return raw.map((item: any) => {
      let group = 'General';
      const nameLower = (item.name || '').toLowerCase();
      const urlLower = (item.url || '').toLowerCase();

      if (urlLower.includes('hetzner') || urlLower.includes('coolify') || urlLower.includes('doppler') || urlLower.includes('console.cloud') || nameLower.includes('gcp')) {
        group = 'Cloud & Infrastructure';
      } else if (urlLower.includes('openai') || urlLower.includes('openrouter') || urlLower.includes('langfuse') || nameLower.includes('gpt') || nameLower.includes('mimo')) {
        group = 'AI & LLMs';
      } else if (urlLower.includes('tailscale') || urlLower.includes('ts.net') || nameLower.includes('hermes')) {
        group = 'Devices & Network';
      }

      return {
        id: item.id || `imported-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: item.name || 'Untitled Shortcut',
        type: 'url' as ShortcutType,
        target: item.url || '',
        group: group,
        tags: [],
        openCount: item.openCount || 0,
        createdAt: item.createdAt ? item.createdAt * 1000 : Date.now(),
        lastUsedAt: item.lastUsedAt ? item.lastUsedAt * 1000 : undefined
      };
    });
  } catch (err) {
    console.error('Error importing native shortcuts:', err);
    return [];
  }
}

export function getAllGroups(items: ShortcutItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    if (item.group && item.group.trim()) {
      set.add(item.group.trim());
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function executeShortcut(item: ShortcutItem, prefs: { terminal?: string; browser?: string } = {}): void {
  // Update stats
  const all = loadShortcuts();
  const index = all.findIndex(x => x.id === item.id);
  if (index !== -1) {
    all[index].openCount = (all[index].openCount || 0) + 1;
    all[index].lastUsedAt = Date.now();
    saveShortcuts(all);
  }

  const target = item.target.trim();
  if (!target) return;

  if (item.type === 'url') {
    if (prefs.browser && prefs.browser.trim()) {
      spawn(prefs.browser.trim(), [target], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [target], { detached: true, stdio: 'ignore' }).unref();
    }
  } else if (item.type === 'path') {
    const resolvedPath = target.startsWith('~') ? path.join(os.homedir(), target.slice(1)) : target;
    spawn('xdg-open', [resolvedPath], { detached: true, stdio: 'ignore' }).unref();
  } else if (item.type === 'command') {
    // Run in background or terminal if interactive
    exec(target, (error) => {
      if (error) {
        console.error('Command failed:', error);
      }
    });
  }
}

export function openAllInGroup(groupName: string, items: ShortcutItem[], prefs: { browser?: string } = {}): number {
  const targetItems = items.filter(
    item => item.group === groupName || item.group.startsWith(groupName + ' /')
  );

  for (const item of targetItems) {
    executeShortcut(item, prefs);
  }

  return targetItems.length;
}
