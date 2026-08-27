import React, { useState, useEffect } from 'react';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  popToRoot,
  useNavigation,
  getPreferenceValues,
  Form
} from '@vicinae/api';
import { ShortcutItem, ShortcutType } from './types';
import {
  loadShortcuts,
  saveShortcuts,
  executeShortcut,
  openAllInGroup,
  importNativeShortcuts
} from './storage';
import {
  formatTargetSubtitle,
  getUrlPath,
  getShortcutIcon,
  getDomainFavicon,
  getDomainColor,
  extractDomain
} from './utils';
import { AddShortcutForm } from './add-shortcut';

export function EditShortcutForm(props: { item: ShortcutItem; onSaved: () => void }) {
  const { item, onSaved } = props;
  const { pop } = useNavigation();

  async function handleSubmit(values: any) {
    const title = (values.title || '').trim();
    const target = (values.target || '').trim();

    if (!target) {
      await showToast({ style: Toast.Style.Failure, title: 'Target is required' });
      return;
    }

    const all = loadShortcuts();
    const idx = all.findIndex((x) => x.id === item.id);
    if (idx !== -1) {
      all[idx] = {
        ...all[idx],
        title: title || target,
        type: values.type as ShortcutType,
        target,
        tags: (values.tags || '').split(',').map((s: string) => s.trim()).filter(Boolean)
      };
      saveShortcuts(all);
      await showToast({ style: Toast.Style.Success, title: 'Item updated' });
      onSaved();
      pop();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="target" title="URL / Path / Command" defaultValue={item.target} autoFocus />
      <Form.TextField id="title" title="Description / Name (Optional)" defaultValue={item.title} />
      <Form.Dropdown id="type" title="Type" defaultValue={item.type}>
        <Form.Dropdown.Item value="url" title="Web URL" icon={Icon.Globe} />
        <Form.Dropdown.Item value="command" title="Shell Command" icon={Icon.Terminal} />
        <Form.Dropdown.Item value="path" title="File / Folder" icon={Icon.Folder} />
        <Form.Dropdown.Item value="snippet" title="Text Snippet" icon={Icon.Clipboard} />
      </Form.Dropdown>
      <Form.TextField
        id="tags"
        title="Tags (Optional)"
        placeholder="dev, prod (comma-separated)"
        defaultValue={(item.tags || []).join(', ')}
      />
    </Form>
  );
}

export default function BrowseShortcuts() {
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const prefs = getPreferenceValues();

  function refresh() {
    setIsLoading(true);
    const data = loadShortcuts();
    setShortcuts(data);
    setIsLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  // Group all shortcuts by domain
  const domainGroups: { [domain: string]: ShortcutItem[] } = {};
  for (const item of shortcuts) {
    let key = 'Other';
    if (item.type === 'url') {
      key = extractDomain(item.target);
    } else if (item.type === 'command') {
      key = '⚡ Shell Commands';
    } else if (item.type === 'path') {
      key = '📁 Local Folders';
    } else if (item.type === 'snippet') {
      key = '📋 Text Snippets';
    }

    if (!domainGroups[key]) {
      domainGroups[key] = [];
    }
    domainGroups[key].push(item);
  }

  const sortedDomains = Object.keys(domainGroups).sort((a, b) => {
    if (a.startsWith('⚡') || a.startsWith('📁') || a.startsWith('📋')) return 1;
    if (b.startsWith('⚡') || b.startsWith('📁') || b.startsWith('📋')) return -1;
    return a.localeCompare(b);
  });

  async function handleOpen(item: ShortcutItem) {
    executeShortcut(item, prefs);
    const displayTarget = item.type === 'url' ? item.target.replace(/^https?:\/\//, '') : item.target;
    await showToast({ style: Toast.Style.Success, title: `Opened ${displayTarget}` });
    await popToRoot();
  }

  async function handleOpenDomain(domainItems: ShortcutItem[]) {
    for (const item of domainItems) {
      executeShortcut(item, prefs);
    }
    await showToast({ style: Toast.Style.Success, title: `Opened ${domainItems.length} links in domain` });
    await popToRoot();
  }

  async function handleDelete(item: ShortcutItem) {
    const updated = shortcuts.filter((x) => x.id !== item.id);
    saveShortcuts(updated);
    setShortcuts(updated);
    await showToast({ style: Toast.Style.Success, title: `Deleted ${item.title}` });
  }

  async function handleImport() {
    const imported = importNativeShortcuts();
    if (imported.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: 'No native shortcuts found to import' });
      return;
    }
    const current = loadShortcuts();
    const existingTargets = new Set(current.map((x) => x.target));
    const toAdd = imported.filter((x) => !existingTargets.has(x.target));
    const merged = [...current, ...toAdd];
    saveShortcuts(merged);
    setShortcuts(merged);
    await showToast({ style: Toast.Style.Success, title: `Imported ${toAdd.length} items` });
  }

  async function handleFetchFavicons() {
    await showToast({ style: Toast.Style.Animated, title: 'Fetching favicons using wreq...' });
    const scriptPath = path.join(os.homedir(), '.local', 'share', 'vicinae', 'extensions', 'link-deck', 'grab_favicons.py');
    exec(`uv run --with wreq python3 ${scriptPath}`, (err) => {
      if (err) {
        showToast({ style: Toast.Style.Failure, title: 'Favicon fetch failed', message: err.message });
      } else {
        showToast({ style: Toast.Style.Success, title: 'Favicons updated with wreq!' });
        refresh();
      }
    });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search links, domains, or URLs..."
      filtering={true}
    >
      {shortcuts.length === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="Deck is Empty"
          description="Press Enter to add your first link or import existing shortcuts"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add to Deck"
                icon={Icon.Plus}
                target={<AddShortcutForm onSaved={refresh} />}
              />
              <Action
                title="Import Existing Shortcuts"
                icon={Icon.Download}
                onAction={handleImport}
              />
            </ActionPanel>
          }
        />
      ) : (
        sortedDomains.map((domain) => {
          const items = domainGroups[domain] || [];
          if (items.length === 0) return null;

          const isWebDomain = !domain.startsWith('⚡') && !domain.startsWith('📁') && !domain.startsWith('📋');
          const domainFavicon = isWebDomain
            ? getDomainFavicon(domain)
            : domain.startsWith('⚡')
            ? { source: 'terminal', tintColor: Color.Green }
            : { source: 'folder', tintColor: Color.Yellow };

          const domainKeywords = [
            domain,
            ...items.map((x) => x.title),
            ...items.map((x) => x.target),
            ...items.map((x) => x.target.replace(/^https?:\/\//, '')),
            ...items.flatMap((x) => x.tags || [])
          ];

          return (
            <React.Fragment key={domain}>
              {/* 1. DOMAIN ROW WITH FAVICON */}
              <List.Item
                key={`domain-${domain}`}
                icon={domainFavicon}
                title={domain}
                subtitle={items.length > 1 ? `${items.length} links` : ''}
                keywords={domainKeywords}
                actions={
                  <ActionPanel>
                    {items.length === 1 ? (
                      <Action
                        title={`Open ${items[0].target.replace(/^https?:\/\//, '')}`}
                        icon={domainFavicon}
                        onAction={() => handleOpen(items[0])}
                      />
                    ) : (
                      <Action
                        title={`Open All in "${domain}" (${items.length} tabs)`}
                        icon={domainFavicon}
                        onAction={() => handleOpenDomain(items)}
                      />
                    )}
                    <ActionPanel.Section title="Manage">
                      <Action.Push
                        title="Add Link to this Domain"
                        icon={Icon.Plus}
                        shortcut={{ modifiers: ['cmd'], key: 'n' }}
                        target={<AddShortcutForm onSaved={refresh} defaultGroup={domain} />}
                      />
                      <Action
                        title="Update Favicons (wreq)"
                        icon={Icon.Globe}
                        onAction={handleFetchFavicons}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />

              {/* 2. NESTED LINK ROWS (WITH TREE GUIDES ├─ / └─) */}
              {items.map((item, index) => {
                const isUrl = item.type === 'url';
                const displayUrl = isUrl
                  ? item.target.replace(/^https?:\/\//, '').replace(/\/$/, '')
                  : formatTargetSubtitle(item.type, item.target);

                const desc = item.title && item.title !== displayUrl && item.title !== item.target ? item.title : '';
                const isLast = index === items.length - 1;
                const treeBranch = isLast ? '└─' : '├─';

                const keywords = [
                  displayUrl,
                  desc,
                  item.target,
                  domain,
                  ...(item.tags || [])
                ];

                return (
                  <List.Item
                    key={item.id}
                    icon={undefined}
                    title={`  ${treeBranch}  ${displayUrl}`}
                    subtitle={desc}
                    keywords={keywords}
                    actions={
                      <ActionPanel>
                        <Action
                          title={`Open ${displayUrl}`}
                          onAction={() => handleOpen(item)}
                        />
                        {items.length > 1 && (
                          <Action
                            title={`Open All in "${domain}" (${items.length})`}
                            icon={Icon.ArrowRightCircle}
                            onAction={() => handleOpenDomain(items)}
                          />
                        )}
                        <ActionPanel.Section title="Manage">
                          <Action.Push
                            title="Add Link to Deck"
                            icon={Icon.Plus}
                            shortcut={{ modifiers: ['cmd'], key: 'n' }}
                            target={<AddShortcutForm onSaved={refresh} defaultGroup={domain} />}
                          />
                          <Action.Push
                            title="Edit Link"
                            icon={Icon.Pencil}
                            shortcut={{ modifiers: ['cmd'], key: 'e' }}
                            target={<EditShortcutForm item={item} onSaved={refresh} />}
                          />
                          <Action.CopyToClipboard
                            title="Copy URL"
                            shortcut={{ modifiers: ['cmd'], key: 'c' }}
                            content={item.target}
                          />
                          <Action.CopyToClipboard
                            title="Copy Display Path"
                            content={displayUrl}
                          />
                          <Action
                            title="Delete Link"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            shortcut={{ modifiers: ['cmd'], key: 'backspace' }}
                            onAction={() => handleDelete(item)}
                          />
                        </ActionPanel.Section>
                        <ActionPanel.Section title="Tools">
                          <Action
                            title="Update Favicons (wreq)"
                            icon={Icon.Globe}
                            onAction={handleFetchFavicons}
                          />
                          <Action
                            title="Import Native Shortcuts"
                            icon={Icon.Download}
                            onAction={handleImport}
                          />
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                  />
                );
              })}
            </React.Fragment>
          );
        })
      )}
    </List>
  );
}
