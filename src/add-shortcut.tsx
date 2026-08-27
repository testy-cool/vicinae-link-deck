import React, { useState, useEffect } from 'react';
import {
  Form,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  popToRoot,
  useNavigation
} from '@vicinae/api';
import { ShortcutItem, ShortcutType } from './types';
import { loadShortcuts, saveShortcuts } from './storage';
import { getIndentedGroupList } from './tree';

export function AddShortcutForm(props: { onSaved?: () => void; defaultGroup?: string }) {
  const { onSaved, defaultGroup } = props;
  const { pop } = useNavigation();
  const [indentedGroups, setIndentedGroups] = useState<Array<{ title: string; value: string }>>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>(defaultGroup || '');
  const [isCustomGroup, setIsCustomGroup] = useState<boolean>(!defaultGroup);

  useEffect(() => {
    const all = loadShortcuts();
    const g = getIndentedGroupList(all);
    setIndentedGroups(g);
    if (defaultGroup && g.some((x) => x.value === defaultGroup)) {
      setSelectedGroup(defaultGroup);
      setIsCustomGroup(false);
    } else if (g.length > 0) {
      setSelectedGroup(g[0].value);
      setIsCustomGroup(false);
    } else {
      setIsCustomGroup(true);
    }
  }, [defaultGroup]);

  async function handleSubmit(values: any) {
    const title = (values.title || '').trim();
    const target = (values.target || '').trim();
    const type = (values.type || 'url') as ShortcutType;
    const group = isCustomGroup
      ? (values.customGroup || '').trim() || 'General'
      : (values.group || '').trim() || 'General';

    if (!title) {
      await showToast({ style: Toast.Style.Failure, title: 'Title is required' });
      return;
    }
    if (!target) {
      await showToast({ style: Toast.Style.Failure, title: 'Target (URL, command, or path) is required' });
      return;
    }

    const newItem: ShortcutItem = {
      id: `shortcut-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      type,
      target,
      group,
      tags: (values.tags || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean),
      openCount: 0,
      createdAt: Date.now()
    };

    const all = loadShortcuts();
    all.push(newItem);
    saveShortcuts(all);

    await showToast({ style: Toast.Style.Success, title: `Saved "${title}" to ${group}` });
    if (onSaved) {
      onSaved();
      pop();
    } else {
      await popToRoot();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Shortcut" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="e.g. Hetzner Server Console" autoFocus />
      <Form.Dropdown id="type" title="Type" defaultValue="url">
        <Form.Dropdown.Item value="url" title="Web URL (https://...)" icon={Icon.Globe} />
        <Form.Dropdown.Item value="command" title="Shell Command (bash/terminal)" icon={Icon.Terminal} />
        <Form.Dropdown.Item value="path" title="Local Folder / File" icon={Icon.Folder} />
        <Form.Dropdown.Item value="snippet" title="Text Snippet (copy to clipboard)" icon={Icon.Clipboard} />
      </Form.Dropdown>
      <Form.TextField
        id="target"
        title="Target"
        placeholder="https://console.hetzner.com or psql $DB_URL or ~/Work/project"
      />
      <Form.Dropdown
        id="group"
        title="Parent / Folder"
        value={isCustomGroup ? '__new__' : selectedGroup}
        onChange={(val) => {
          if (val === '__new__') {
            setIsCustomGroup(true);
          } else {
            setIsCustomGroup(false);
            setSelectedGroup(val);
          }
        }}
      >
        {indentedGroups.map((g) => (
          <Form.Dropdown.Item key={g.value} value={g.value} title={g.title} icon={Icon.Folder} />
        ))}
        <Form.Dropdown.Item value="__new__" title="+ Create New Folder / Hierarchy..." icon={Icon.Plus} />
      </Form.Dropdown>
      {isCustomGroup && (
        <Form.TextField
          id="customGroup"
          title="New Group Path"
          placeholder="e.g. Work / Infrastructure / DB"
        />
      )}
      <Form.TextField
        id="tags"
        title="Tags (Optional)"
        placeholder="cloud, server, hetzner (comma-separated)"
      />
    </Form>
  );
}

export default function AddShortcut() {
  return <AddShortcutForm />;
}
