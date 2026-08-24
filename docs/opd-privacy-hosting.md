# Hosting the OPM privacy policy on Open Prompt Database

The catalog Worker lives in the private `open-prompt-database` repository (not this repo). Copy these files there so the policy is public at `https://openpromptdatabase.com/privacy`.

Canonical text: [`PRIVACY.md`](../PRIVACY.md) in this repository.

## Files to add in the OPD repo

1. Copy [`privacy.html`](privacy.html) to `opd/public/privacy.html` (or `public/privacy.html`, matching the live site layout).
2. Keep the About subnav, mega-menu, and worker route in sync (below).

## Worker route

In `src/worker.js` `resolveHtmlAsset()`, add **before** the `/about` catch-all:

```js
if (pathname === '/privacy' || pathname.startsWith('/privacy/')) return '/privacy.html';
if (pathname === '/about/privacy' || pathname.startsWith('/about/privacy/')) {
  return '/privacy.html';
}
```

Redirect `/about/privacy` → `/privacy` if you prefer a single canonical path.

## Navigation

In `opd-nav.js` `ABOUT_LINKS`, add:

```js
{
  href: '/privacy',
  label: 'Privacy',
  description: 'How Open Prompt Manager and this catalog handle data.',
  iconKey: 'info',
}
```

On `about.html`, `changelog.html`, and any other About subnav, add:

```html
<a href="/privacy" class="opd-about-subnav-link" data-opd-about-tab="privacy">Privacy</a>
```

`initAboutPage({ tab: 'privacy', ... })` already highlights the matching `data-opd-about-tab`.

## Chrome Web Store

After the page is live, set the listing privacy-policy URL to:

`https://openpromptdatabase.com/privacy`

Until then, the GitHub file is a valid HTTPS policy URL:

`https://github.com/jonathanbertholet/promptmanager/blob/main/PRIVACY.md`
