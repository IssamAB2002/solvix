// ─── GLOBAL CSS ──────────────────────────────────────────────────────────────
// يُستخدم داخل App.jsx عبر <style>{globalCSS}</style>

import C from "./colors";

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap');

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    background: ${C.bg};
    color: ${C.text};
    font-family: 'Inter', sans-serif;
    background-image: url('/bg-watermark.png');
    background-repeat: no-repeat;
    background-position: center center;
    background-size: min(60vw, 640px);
    background-attachment: fixed;
  }

  #root {
    position: relative;
    z-index: 1;
    background: transparent;
  }

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background: ${C.bg};
    opacity: 0.96;
    z-index: 0;
    pointer-events: none;
  }

  .projects-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  @media (min-width: 700px) {
    .projects-grid {
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
    }
  }

  html, body { overflow-x: hidden; max-width: 100%; }

  .admin-hamburger { display: none; }
  .admin-sidebar-backdrop { display: none; }

  @media (max-width: 900px) {
    .admin-shell { grid-template-columns: 1fr !important; }
    .admin-sidebar {
      position: fixed !important; inset: 0 auto 0 0; z-index: 1001; width: 260px;
      height: 100vh !important; top: 0 !important;
      transform: translateX(var(--sidebar-shift, -100%));
      transition: transform .25s ease;
    }
    [dir="rtl"] .admin-sidebar { inset: 0 0 0 auto; transform: translateX(var(--sidebar-shift, 100%)); }
    .admin-sidebar.open { --sidebar-shift: 0; }
    .admin-hamburger {
      display: flex; align-items: center; justify-content: center;
      width: 40px; height: 40px; border-radius: 10px;
      background: ${C.surface}; border: 1px solid ${C.border}; color: #fff;
      font-size: 18px; cursor: pointer; margin-bottom: 18px;
    }
    .admin-sidebar-backdrop.open {
      display: block; position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 1000;
    }
  }

  .navbar-toggle { display: none; }
  @media (max-width: 640px) {
    .navbar-links { display: none !important; }
    .navbar-toggle { display: flex !important; }
    .navbar-shell { padding: 0 16px !important; height: 60px !important; }
    .navbar-logo { font-size: 17px !important; gap: 8px !important; }
    .navbar-logo img { width: 28px !important; height: 28px !important; }
  }
  @media (min-width: 641px) {
    .navbar-mobile-panel { display: none !important; }
  }

  button  { cursor: pointer; font-family: 'Inter', sans-serif; }
  input, textarea { font-family: 'Inter', sans-serif; }

  ::-webkit-scrollbar       { width: 3px; }
  ::-webkit-scrollbar-thumb { background: ${C.accent}; border-radius: 2px; }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.35; }
  }
`;

export default globalCSS;
