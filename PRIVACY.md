# Privacy Policy

**Open Prompt Manager** (the Chrome extension) and **Open Prompt Database** (the community catalog at [openpromptdatabase.com](https://openpromptdatabase.com/))

Effective date: **24 August 2026**

This policy describes how Open Prompt Manager (“OPM”, “the extension”) and Open Prompt Database (“OPD”, “the catalog”, “the website”) handle information. They are made by the same independent developer, [Jonathan Bertholet](https://github.com/jonathanbertholet).

The short version: **your prompt library stays on your computer unless you choose to publish a prompt.** The extension does not use analytics, advertising, or accounts for its core features.

---

## 1. Who this covers

| Product | What it is |
| --- | --- |
| **Open Prompt Manager** | A Chrome extension that stores prompts locally and can insert them into AI chat sites you enable. [Chrome Web Store listing](https://chromewebstore.google.com/detail/open-prompt-manager/gmhaghdbihgenofhnmdbglbkbplolain). Source: [github.com/jonathanbertholet/promptmanager](https://github.com/jonathanbertholet/promptmanager). |
| **Open Prompt Database** | A public website and API where people can browse community prompts and, if they want, share prompts from the extension. Hosted on Cloudflare at `openpromptdatabase.com`. |

This page is the privacy policy for both. The same text is meant to be published at [openpromptdatabase.com/privacy](https://openpromptdatabase.com/privacy).

---

## 2. What the extension stores on your device

Core use does **not** require an account, email address, or sign-in.

OPM stores data in Chrome’s extension storage on your profile:

**Prompt library (local only)**

- Prompt titles, content, tags, folders, and local ids
- Optional links to a catalog entry you imported or published (`opd:` ids)
- Import / export backups you create as JSON files on your computer

**Settings (local)**

- Launcher mode, theme / force-dark, tag order, keyboard shortcut, append-vs-overwrite
- Which assistant sites you have enabled
- UI state such as dismissed info banners

**Site helpers (local)**

- CSS selectors and hostnames for **custom websites** you pin, and for inputs the extension has successfully used
- These are technical locators so the extension can find the chat box. They are not a copy of the page, your chats, or your browsing history

**Publisher identity (Chrome sync, optional)**

If you use sharing, a few keys may be stored in `chrome.storage.sync` so they follow your Chrome profile: a random publish token, your public handle, and whether publishing is enabled. Your **prompt library is not synced** this way. To copy prompts to another device, use export / import.

Uninstalling the extension deletes this storage from that browser profile.

---

## 3. Permissions the extension uses

Site access is **optional**. OPM does not require host permissions to install or update.

| Permission | Why it exists |
| --- | --- |
| `storage` | Save your library and settings on this device |
| `sidePanel` | Show the side panel UI |
| `tabs` | Know the current tab so you can insert a prompt or open an assistant |
| `scripting` | Inject the in-page panel on sites you have allowed, and run the “save selection as prompt” dialog |
| `activeTab` | Work with the tab you are using when you invoke the extension |
| `contextMenus` | Copy a prompt or save selected text as a new prompt |
| Optional host access | Run on assistant sites you enable (ChatGPT, Claude, Gemini, and others) and, if you grant it, on openpromptdatabase.com for one-click import |

Optional `<all_urls>` in the manifest only lets Chrome **ask** for a specific site when you pin a custom website. The extension does not get access to every site unless you grant origins one by one (or you choose to grant a broad permission yourself).

On a granted site, the content script looks for the chat input so it can insert a prompt you picked. **Page content, chat history, and cookies from those sites are not uploaded to Open Prompt Manager or Open Prompt Database.** After you insert a prompt, that site’s own privacy policy applies to whatever you send to the assistant.

---

## 4. What we do not do

- No analytics, advertising, or usage-tracking SDKs in the extension
- No sale of personal information
- No login or email requirement for the local library
- No remote upload of your full backup
- No reading of your AI chats for training or telemetry
- No use of your data to determine creditworthiness

---

## 5. When data leaves your browser (optional catalog)

Nothing below happens unless you use Open Prompt Database.

### Import a community prompt

When you click **Add to Open Prompt Manager** on the catalog:

- The selected prompt (title, content, tags, catalog id) is copied into your **local** library
- The site may record an **import count** for that catalog row (a counter, not your library)

One-click import uses Chrome’s `externally_connectable` messaging and/or an optional host permission for `openpromptdatabase.com`.

### Share / publish a prompt

When you click **Share to Open Prompt Database**:

- The extension sends the prompt **you chose** (title, content, tags) to the catalog API
- It is published under your public handle (for example `@warm_ridge_491`)
- A random **publish token** (a UUID stored in the extension) authenticates you. It is not your Google account. Treat it like a password for your catalog identity
- Cloudflare Turnstile may run to block bots

Published prompts are **public**. Anyone can read them. Do not publish API keys, passwords, private documents, or personal data.

You can remove a prompt you published from the catalog (unpublish). Sharing an imported community prompt publishes **your copy**, not the original author’s row.

### Publisher handle

No email is required. You pick (or accept a suggested) display handle. Handles are public. The server stores a hash of your publish token with that handle — not a name, phone number, or payment card.

### Reports

If you report a catalog prompt, the site stores the reason, optional detail, and a **hashed** IP address for abuse prevention. Turnstile may run on that form.

---

## 6. What the website processes

If you only browse openpromptdatabase.com:

- Pages and API responses are served by **Cloudflare** (Workers, D1, and related edge services)
- Cloudflare may process IP address, user agent, and security signals to run the site, rate-limit abuse, and stop bots
- Theme preference can be stored in `localStorage` on your device
- Write actions (register, publish, report) may use **Cloudflare Turnstile**

We do not require an account to browse or copy prompts. Community entries are unverified; review them before pasting into any assistant.

---

## 7. Processors and other services

| Party | Role |
| --- | --- |
| **You / your browser** | Holds the local library |
| **Google Chrome / Chrome Web Store** | Runs the extension; optional Chrome Sync for the few publisher keys above |
| **Cloudflare** | Hosts the catalog, API, bot checks (Turnstile), and infrastructure logs |
| **AI assistant websites** | Receive prompt text only after you insert or paste it there |

We do not sell data to data brokers. GitHub hosts the open-source extension repository; issues you file there are public unless you use GitHub’s private channels.

---

## 8. Retention

- **Local extension data:** until you delete it or uninstall
- **Published catalog prompts:** until you unpublish them, or they are removed for abuse or legal reasons
- **Abuse reports:** as needed to review and protect the catalog
- **Rate-limit records:** short-lived (on the order of hours)
- **Cloudflare operational logs:** according to Cloudflare’s own retention

---

## 9. Your choices and rights

- Export or delete prompts in the extension; uninstall to remove local storage for that profile
- Turn off catalog publishing in Open Prompt Database settings
- Unpublish prompts you uploaded
- Revoke site permissions in Settings → Permissions (or Chrome’s extension details)
- Request help with a published prompt or handle via the contacts below

Depending on where you live (for example GDPR or CCPA), you may have rights to access, correct, delete, or restrict processing of personal data we hold on the catalog (handle, published prompts, reports). Email us. We do not sell personal information.

If you are in the EEA/UK, we process local library data on your device at your instruction. Catalog processing is based on **your request** (publish / import / report) and on **legitimate interests** in running a public catalog and stopping abuse.

---

## 10. Children

These products are not directed at children under 13, and we do not knowingly collect personal information from children.

---

## 11. International processing

The catalog is served on Cloudflare’s global network. Information you publish or submit to the website may be processed in the United States and other countries where Cloudflare operates.

---

## 12. Changes

We will update this policy when the products change in a way that affects privacy. The effective date at the top will change. Material changes will be reflected on this page and, when practical, in the extension changelog.

---

## 13. Contact

- Chrome Web Store developer email: **jbappstore459@gmail.com**
- GitHub issues (extension): [github.com/jonathanbertholet/promptmanager/issues](https://github.com/jonathanbertholet/promptmanager/issues)

This policy is written to match how the software actually works. It is not legal advice.
