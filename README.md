# Mobile R&D Engineering Portal

## Included

- Desktop-first engineering dashboard
- A→S record ordering
- Model selector
- Category filtering
- Full-text search
- Clear search
- Record count
- Local IndexedDB binary file storage
- Drag/drop upload
- File validation
- Admin demo session
- JSON model export
- Text engineering report export
- Local data backup
- Local data reset
- Audit log storage
- Compact-card preference
- Motion preference
- Responsive layout
- Accessible focus states
- Reduced-motion support
- Modular JavaScript architecture

## Run

For ES modules, use a local web server instead of opening `index.html` directly.

Example with Python:

```bash
python -m http.server 8080
```

Then open:

http://localhost:8080

## Important security note

The included `admin123` login is a DEMO ONLY. It is intentionally kept for local/prototype use.

It is NOT secure because the password and authentication logic are visible in client-side JavaScript.

For production, replace it with a backend authentication system such as:

- Corporate SSO
- Microsoft Entra ID
- OAuth/OIDC
- Server-side sessions
- Role-based authorization

Do not rely on IndexedDB or localStorage for enterprise security.

## Storage note

Browser IndexedDB storage limits vary by browser, OS, available disk space and quota policy. The UI uses a 500 MB application-side file limit, but that does not guarantee 500 MB of available browser storage.

## Suggested production architecture

Frontend:
- This dashboard

Backend:
- Node.js / .NET / Java / Python API
- SSO/OIDC authentication
- Role-based access control
- Audit trail

Document storage:
- SharePoint / Azure Blob / S3 / internal NAS / approved DMS

Database:
- PostgreSQL / SQL Server

Security:
- HTTPS
- Server-side authorization
- Malware scanning for uploads
- File type validation server-side
- Maximum upload limits server-side
- Audit logs
- Backup and retention policy

## GitHub / GitHub Pages

This project is static and can be hosted directly from GitHub Pages.

### Upload to GitHub

```bash
git init
git add .
git commit -m "Initial Mobile R&D Engineering Portal"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

### GitHub Pages

The repository includes `.github/workflows/pages.yml`. After pushing to the `main` branch, open **GitHub → Settings → Pages** and select **GitHub Actions** as the source if it is not already enabled. The workflow then publishes the repository as a static site.

### Important

The current admin authentication and IndexedDB storage are browser-side prototype features. Do not use the prototype password or client-side authorization as production security. For a production deployment, use server-side authentication/authorization and protected storage.

### UI-only feature direction

The existing A→S records and model data remain unchanged. UI enhancements can be added without creating new engineering data modules: Light/Dark/System theme, accent color, card density, sidebar collapse, keyboard shortcuts, favorites, improved search, fullscreen, notifications, print mode, export controls, accessibility, and saved UI preferences.
