import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Color } from '@vicinae/api';

const FAVICON_DIR = path.join(os.homedir(), '.local', 'share', 'vicinae', 'extensions', 'link-deck', 'assets', 'favicons');

export function extractDomain(target: string): string {
  try {
    const u = new URL(target);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');

    const parts = host.split('.');
    if (parts.length >= 3) {
      const sld = parts[parts.length - 2];
      const tld = parts[parts.length - 1];
      return `${sld}.${tld}`;
    }
    return host;
  } catch {
    return 'Other';
  }
}

export function getDomainColor(domain: string): Color {
  const d = domain.toLowerCase();
  let hash = 0;
  for (let i = 0; i < d.length; i++) {
    hash = (hash << 5) - hash + d.charCodeAt(i);
    hash |= 0;
  }
  const colors = [Color.Blue, Color.Green, Color.Magenta, Color.Orange, Color.Purple, Color.Red, Color.Yellow];
  return colors[Math.abs(hash) % colors.length];
}

export function getUrlPath(target: string): string {
  if (!target) return '';
  try {
    const u = new URL(target);
    let p = u.pathname;
    if (u.search && u.search.length < 40) {
      p += u.search;
    }
    return p || '/';
  } catch {
    return target;
  }
}

export function formatTargetSubtitle(type: string, target: string): string {
  if (!target) return '';
  if (type === 'url') {
    return getUrlPath(target);
  }
  if (type === 'path') {
    return target.replace(/^\/home\/[^\/]+/, '~');
  }
  return target;
}

export function getDomainFavicon(domain: string) {
  const d = domain.toLowerCase();
  const direct = path.join(FAVICON_DIR, `${d}.png`);
  if (fs.existsSync(direct)) {
    return { source: direct };
  }

  try {
    if (fs.existsSync(FAVICON_DIR)) {
      const allFiles = fs.readdirSync(FAVICON_DIR);
      const match = allFiles.find(f => (f.includes(d) || d.includes(f.replace('.png', ''))) && f.endsWith('.png'));
      if (match) {
        return { source: path.join(FAVICON_DIR, match) };
      }
    }
  } catch {}

  return { source: 'globe' };
}

export function getShortcutIcon(type: string, target: string, color: Color) {
  if (type === 'command') return { source: 'terminal', tintColor: Color.Green };
  if (type === 'path') return { source: 'folder', tintColor: Color.Yellow };
  if (type === 'snippet') return { source: 'clipboard', tintColor: Color.Blue };

  if (type === 'url' && target) {
    try {
      const u = new URL(target);
      const host = u.hostname.toLowerCase().replace(/^www\./, '');
      const fullHost = u.host.toLowerCase().replace(/^www\./, '');

      const localFile1 = path.join(FAVICON_DIR, `${fullHost}.png`);
      const localFile2 = path.join(FAVICON_DIR, `${host}.png`);
      if (fs.existsSync(localFile1)) return { source: localFile1 };
      if (fs.existsSync(localFile2)) return { source: localFile2 };

      return { source: 'globe' };
    } catch {
      return { source: 'globe', tintColor: color };
    }
  }

  return { source: 'globe', tintColor: color };
}
