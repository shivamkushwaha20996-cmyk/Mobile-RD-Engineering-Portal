# v16 packaging fix

This release keeps the v15 File Command Center code and fixes the GitHub Pages package structure.

IMPORTANT: `index.html` and `.github/workflows/pages.yml` are at the repository root. Do not upload the parent folder as an extra directory.

The previous v15 archive contained the project inside an additional `mobile-rd-engineering-portal-v14-stable/` folder, which can prevent GitHub Pages from serving the intended root `index.html` when the archive contents are uploaded incorrectly.
