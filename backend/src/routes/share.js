// ─── SHARE (crawler-facing OG tags for /projects/:slug) ──────────────────────
// Meta/WhatsApp/Twitter/etc. link-preview crawlers fetch the raw HTML and never
// run the React bundle, so they can't see project data or images the normal SPA
// renders client-side. Caddy routes known bot user-agents on /projects/* here
// instead of the static SPA (see infra Caddyfile); everyone else still gets the
// real app. This route only needs to exist for crawlers, so it renders a
// minimal HTML document with the right <meta> tags and nothing else.

import express from 'express';
import crypto from 'crypto';
import { getPortfolioProjectMetaBySlug, getPortfolioProjectImagesBySlug } from '../db.js';

const router = express.Router();
const SITE_URL = process.env.SITE_URL || 'https://solvix-app.online';

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

const DESCRIPTION_LIMIT = 200;

// Project descriptions are long-form markdown meant for the details page —
// strip formatting and cap length so the preview card shows a clean snippet.
function toPreviewText(markdown = '') {
  const plain = String(markdown)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[ \t]*[-*>]\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > DESCRIPTION_LIMIT ? `${plain.slice(0, DESCRIPTION_LIMIT - 1).trimEnd()}…` : plain;
}

function renderMeta({ title, description, image, url }) {
  return `<!doctype html>
<html>
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Solvix" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta http-equiv="refresh" content="0; url=${escapeHtml(url)}" />
</head>
<body></body>
</html>`;
}

router.get('/projects/:slug', async (req, res) => {
  const url = `${SITE_URL}/projects/${encodeURIComponent(req.params.slug)}`;
  const project = await getPortfolioProjectMetaBySlug(req.params.slug);

  if (!project) {
    return res.status(404).send(renderMeta({
      title: 'Solvix',
      description: 'Solvix — software development agency.',
      image: `${SITE_URL}/logo.png`,
      url,
    }));
  }

  const images = await getPortfolioProjectImagesBySlug(req.params.slug);
  const cover = images?.[0];
  // Content-hash query param busts Facebook's OG cache automatically when the
  // cover image changes, without needing an updated_at column.
  const image = cover
    ? `${SITE_URL}/api/portfolio/${encodeURIComponent(req.params.slug)}/cover?v=${crypto.createHash('sha1').update(cover).digest('hex').slice(0, 8)}`
    : `${SITE_URL}/logo.png`;

  res.send(renderMeta({
    title: `${project.title} — Solvix`,
    description: toPreviewText(project.description) || 'Solvix — software development agency.',
    image,
    url,
  }));
});

export default router;
