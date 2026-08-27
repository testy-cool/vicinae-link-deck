# Link Deck for Vicinae ⚡

> Fast, beautiful, domain-hierarchical link & shortcut launcher for Linux on [Vicinae](https://github.com/vicinaehq/vicinae).

![Link Deck](extension_icon.png)

---

## ✨ Features

- **🌐 Domain-First Hierarchy:** Automatically groups your links and paths under their parent domains with clean tree guides (`├─` / `└─`).
- **🎨 Official High-Res Favicons:** Domain headers automatically fetch and display crisp 128px favicons for all services via `wreq-python`.
- **⚡ Supercharged Navigation:**
  - Press `Enter` on any link to open it immediately.
  - Press `Enter` on a domain to launch single-link sites directly, or batch-open all sub-paths in tabs.
- **🔍 Instant Fuzzy Search:** Search across domain names, URL paths, or custom titles.
- **🛡️ 100% Linux Native & Local:** No external tracking, no macOS baggage, stores all data locally in `~/.config/vicinae/grouped-shortcuts.json`.

---

## 📸 Layout

```text
[favicon] github.com
  ├─  github.com/trending                                         GitHub Trending
  └─  github.com/settings/profile                                 Profile Settings

[favicon] huggingface.co
  ├─  huggingface.co/models                                       Models Directory
  └─  huggingface.co/spaces                                       Spaces Directory

[favicon] anthropic.com
  └─  docs.anthropic.com/en/docs                                  API Documentation

[favicon] mozilla.org
  └─  developer.mozilla.org/en-US/docs/Web                        MDN Web Docs
```

---

## 🚀 Installation

Clone directly into your Vicinae extensions directory:

```bash
git clone https://github.com/testy-cool/vicinae-link-deck ~/.local/share/vicinae/extensions/link-deck
cd ~/.local/share/vicinae/extensions/link-deck

# Install dependencies and build
bun install
bun run build

# Restart Vicinae daemon
systemctl --user restart vicinae
```

---

## ⌨️ Keywords & Quick Launch

Open Vicinae (`Super + Space`) and type any keyword:
- `deck`, `hub`, `links`, `domains`, `bookmarks`, `tree`, `lh`, `jump`, `go`

---

## 🛠️ Actions & Commands

| Shortcut | Action |
|---|---|
| `Enter` | Open selected link in default browser |
| `Ctrl + B` | Open Action Panel (Open all, Copy URL, Edit, Delete) |
| `Ctrl + N` | Add new link or command to Deck |
| `Ctrl + C` | Copy target URL to clipboard |

---

## 📄 License

MIT © [testycool](https://github.com/testy-cool)
