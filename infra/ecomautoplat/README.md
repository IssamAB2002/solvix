# ecomautoplat — shared Caddy reverse proxy

Mirrors `/srv/ecomautoplat` on the VPS (167.233.25.145). This is the one shared
Caddy container (`ecomauto_caddy`) that terminates HTTPS for every domain on
the box — the e-commerce app, n8n, modeline.online, and now solvix-app.online.
Other stacks (Solvix included) don't run their own Caddy; they join the
external `proxy` Docker network and get a site block appended here.

Only `Caddyfile` and `docker-compose.yml` are tracked — the actual app
directories (`e-commerc-automation-registration-platform/`, `frontend/`) and
`.env.db` stay untracked on the server, this repo only manages the proxy
layer.

## Deploying a change

```bash
ssh issam@167.233.25.145
cd /srv/ecomautoplat
git fetch origin
git checkout origin/main -- Caddyfile docker-compose.yml
docker compose up -d --force-recreate caddy
```
