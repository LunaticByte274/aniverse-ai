ANIVERSE AI — Immersive UI upgrade

This patch adds a cohesive cinematic visual layer without replacing your existing tracker logic or API routes:
- Main dashboard: global background, refined glass surfaces, cinematic hero styling, responsive layout, richer hover/focus states.
- Explore page: atmospheric panel, better cards, recommendation panel styling, mobile adjustments.
- AI Companion: polished chat shell, gradient accents, clearer message bubbles, responsive controls.

IMPORTANT
This is a CSS-only visual patch. It does not replace your existing page logic, database, AniList integration, or Ollama Cloud route.

Apply:
1. From Terminal, go to your project:
   cd ~/Downloads/aniverse-ai
2. Back up the three CSS files:
   cp apps/web/src/app/globals.css apps/web/src/app/globals.css.before-immersive
   cp apps/web/src/app/explore/explore.css apps/web/src/app/explore/explore.css.before-immersive
   cp apps/web/src/app/ai/ai.css apps/web/src/app/ai/ai.css.before-immersive
3. Copy the CSS files from this patch to the same paths in your project.
4. Restart the dev server (Ctrl+C, then `cd apps/web && corepack yarn dev`).
5. Test dashboard, /explore, and /ai at desktop and narrow/mobile widths.

If your project does not have apps/web/src/app/globals.css, do not create a replacement blindly; inspect the global stylesheet imported by apps/web/src/app/layout.tsx and merge the global styles there instead.

Rollback:
Restore each `.before-immersive` file to its original filename if anything looks wrong.
