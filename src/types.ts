export type ShortcutType = 'url' | 'command' | 'path' | 'snippet';

export interface ShortcutItem {
  id: string;
  title: string;
  type: ShortcutType;
  target: string;
  group: string;
  tags?: string[];
  icon?: string;
  app?: string;
  description?: string;
  createdAt: number;
  lastUsedAt?: number;
  openCount: number;
}

export interface GroupSummary {
  name: string;
  parent: string;
  fullName: string;
  count: number;
}
