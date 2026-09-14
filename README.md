# Open Prompt Manager

A lightweight, open-source Chrome extension for saving, organizing, and inserting prompts across AI chatbots — ChatGPT, Claude, Gemini, Grok, and 14 other built-in assistants.

**Current version:** 3.0.5 · [Chrome Web Store](https://chromewebstore.google.com/detail/open-prompt-manager/gmhaghdbihgenofhnmdbglbkbplolain) · [Release notes](https://github.com/jonathanbertholet/promptmanager/releases/tag/3.0.5)

## Features

### Prompt library

- Click the extension icon to open the **full-page prompt manager**
- Save, edit, reorder, and delete prompts from the full-page manager or the in-page panel on assistant sites
- **Tags** with search and filter; tag suggestions on create/edit forms
- Drag to reorder tags in Settings → **Tag management**
- **Variables** with `#variable#` syntax — fill in values before inserting
- **Import / export** full v2 backups (prompts, folders, tag metadata) as JSON
- **Copy to clipboard** from the manager
- Right-click a saved prompt in the **context menu** to insert it into the current chat
- Save selected text to your library via the **context menu**

### On assistant sites

- Three in-page launcher modes: **floating button**, **hot corner**, or **shortcut only**
- One-click insert into the chat input, with optional append mode
- **Custom keyboard shortcut** — record your own open/close combo (default: ⌘⇧P on Mac, Ctrl+M on Windows/Linux)
- **Custom websites** — pin any site’s chat input
- Remembers the last successful chat input per site
- Light and dark themes, with optional force-dark mode

### Settings & permissions

Settings include launcher mode, preferences, tag management, import/export, custom open shortcut, and a **permissions editor** for controlling which sites the extension can access.

Site access is **optional**. The extension does not require host permissions to install or update.

## Supported platforms

| ChatGPT | Claude | Google Gemini |
|---------|--------|---------------|
| NotebookLM | DeepSeek | Microsoft Copilot |
| GitHub Copilot | Grok | Poe |
| Kimi | Mistral Le Chat | OpenRouter |
| Perplexity | Qwen | Google AI Studio |
| OpenAI Playground | ChatLLM (Abacus) | LMArena |

Plus any site you configure as a **custom website**.

## Installation

1. Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/open-prompt-manager/gmhaghdbihgenofhnmdbglbkbplolain)
2. On first run, pick an in-page launcher (floating button, hot corner, or shortcut only)
3. Click an assistant to grant site access
4. Click the extension icon whenever you want the full-page prompt manager

You can add or remove sites later from Settings → **Permissions**.

### Load from source (development)

1. Clone this repository
2. Open `chrome://extensions`, enable **Developer mode**
3. Click **Load unpacked** and select the `src/` folder

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| **⌘ + Shift + P** (Mac) / **Ctrl + M** (Win/Linux) | Open or close the in-page prompt panel |
| **↑ / ↓** | Navigate the prompt list |
| **Enter** | Select a prompt |
| **Esc** | Close the panel |

You can change the open/close shortcut in Settings → **Record shortcut**. The recorded combo is exact — `Ctrl+M` does not also match `Ctrl+Shift+M`.

## Testing

```bash
npm install
npm test
```

Tests use **Jest** (with optional **Puppeteer** helpers). See [TESTING.md](TESTING.md) for details.

## Privacy

**[Full privacy policy](PRIVACY.md)**

- Your prompt library stays **locally** in the extension
- Site access is optional and granted per assistant/site
- No community catalog, public prompt publishing, analytics, or tracking

## License

MIT

## Attributions

- **Hexodus** — bug reports and fixes
- **Abdallahheidar** — ideas, contributions, and teamwork
- **HideMaru** — extension icon ([Flaticon chatbot icons](https://www.flaticon.com/free-icons/chatbot))
