# Verification

Use Node.js 22 or newer. Install the locked dependencies with `npm ci`; Puppeteer
installs Chrome for Testing. All required checks run without AI accounts or calls
to live assistant services:

```sh
npm ci
npm run check
```

The same command runs on pushes and pull requests in `.github/workflows/checks.yml`.
It fails on lint errors, failed assertions, broken entry imports, or browser errors.
A successful GitHub mergeability flag is not a test result.

## Commands

| Command | Coverage |
| --- | --- |
| `npm test` | Storage migration, concurrent writes, workspace isolation, backup/restore, import validation, localization, context-menu lifecycle, prompt insertion utilities, source references |
| `npm run test:browser` | Installed extension: manager and settings initialization, responsive layout, save/assign/detach, multiple pages, language, shortcut, actual backup download, custom input picker, in-page variable insertion and workspace switch |
| `npm run lint` | Source syntax/style and undefined identifiers |
| `npm run build:prod` | Resource verification and cross-platform copy into `dist/extension/` |

`test:i18n:unit` still runs the localization subset. `test:i18n:browser` is an alias
for the installed-extension browser suite. The old log-only live selector crawl
and assertions against the removed title bar are no longer part of verification.

## Browser test boundaries

The browser suite copies `src/` into a temporary directory and adds only the local
fixture host to that copy's permissions. It asserts the production manifest still
has no required host permissions. External requests are blocked. The custom-site
flow exercises a pre-granted local host, not Chrome's interactive permission dialog.

Screenshots and a result summary are written to `test-results/` and uploaded by CI.
Set `PUPPETEER_EXECUTABLE_PATH` only when using an alternative Chrome build that
supports loading unpacked extensions. A managed browser may disallow this; do not
change machine policy to run tests. Use the CI Chrome for Testing environment.

These checks do not establish compatibility with all live ChatGPT/Claude/Gemini
versions or account states. Before a release, load `dist/extension/` unpacked into
a test profile, check the native grant/deny dialog on a custom site, and insert one
plain and one variable prompt on each assistant you intend to support.

## Data safety checks

The worker is the only prompt-library writer. Tests use real service operations,
not copies of production algorithms. They check a failed migration leaves legacy
data intact, concurrent edits are not lost, deleted folders detach prompts,
deleted workspaces move rather than delete their content, and a V3 export restored
into a clean profile preserves workspace and folder ownership.

Library backup is global. Destructive prompt/tag operations in settings and the
in-page panel affect the current workspace. Legacy V1/V2 imports are added to the
current workspace; V3 imports retain their saved workspace relationships.
