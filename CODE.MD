# CODE.MD — tasks for the coding session

Repo: `intercom/` (GitHub Pages, custom domain `mixremote.app`, see `CNAME`).
Only built files are in the repo: edit `index.html` and `talk.html` directly. There's no `talkdev/`, build step or test harness.
Worker (`https://intercom-turn.imsk8erboi.workers.dev/`) is **not** in the repo. Yuki deploys it by hand in the Cloudflare dashboard.

## Rules
- Bump `VERSION` in **both** `index.html` (~L985) and `talk.html` (~L2706). Current is `0.16.1-beta`; next is `0.16.2-beta`.
- No secrets in code.
- UI must not shift; keep the Console v4 look.
- Always commit AND push to origin main when done. Then tell Yuki only what he must do on his end (Cloudflare/DNS) and any files he needs.


---

## Task 1: Hide Talkback from the home page
Talkback is a work in progress.
- `index.html` ~L734: remove or hide the `<a class="tile" id="goTalk" href="talk.html">` tile. Use `hidden` so it's easy to bring back, and add a `<!-- WIP: Talkback hidden -->` comment.
- Check that no JS throws when `#goTalk` is missing or hidden (`grep goTalk index.html`).
- Leave `talk.html` reachable by its direct URL.

## Task 2: Port the missed listener fix (it was never uploaded)
`talk.html` ~L2131, in the `cont = …` expression: mixer lines must never merge.
- Replace `&& !!pv.mix === !!l.mix` with `&& !l.mix && !pv.mix`.
- Result: every mixer line shows its own speaker, time and "mixer" tag. Other lines still merge for the same person within 60 s.

## Task 3: Fix the relay after the domain move
**Cause (confirmed with curl):** the Worker only allows `Origin: https://ifb.asahina.me`. For `https://mixremote.app` it returns 403 `{"error":"origin not allowed"}`. The browser then reports "Relay backup: Off · can't reach relay". `/stt` (voice to text) is blocked the same way.

This fix is in the Worker, not the site:
1. Ask Yuki to paste the current Worker code (Cloudflare → Workers → intercom-turn → Edit code) into `intercom/worker/worker.js`. Don't guess its contents.
2. Change the origin allowlist to:
   - `https://mixremote.app` and `https://www.mixremote.app`
   - `https://join.mixremote.app` (Task 4)
   - `https://ifb.asahina.me` (keep during the transition)
   - Optionally `http://localhost:*` for testing.

   Put the list in one `ALLOWED_ORIGINS` array at the top. Echo back the matching origin in `Access-Control-Allow-Origin`, and answer OPTIONS preflights with 204.
3. Site code: in `index.html` L22 and L27, change `og:image` / `twitter:image` from `https://ifb.asahina.me/og.png` to `https://mixremote.app/og.png`. Grep both HTML files and `sw.js` / `manifest.webmanifest` for any other `asahina.me` URL and update it. **Don't** rename the `PREFIX` / `TALK_PREFIX` PeerJS ids (`asahina-intercom-`, `asahina-talk-`): renaming them would break live rooms.
4. Tell Yuki: deploy the Worker, then clear `localStorage['ic-relay']` (or wait for it to expire) and reload.

**Verify:** `curl -s -D - -o /dev/null -H "Origin: https://mixremote.app" https://intercom-turn.imsk8erboi.workers.dev/` returns 200, with `access-control-allow-origin: https://mixremote.app`.

## Task 4: Per-room share links on `join.mixremote.app` (code shown on the banner)
Goal: a link pasted into Messages, WhatsApp or Slack shows a banner with the room code. Tapping it opens Listen and joins the room.

**Manual prerequisite (Yuki, must be done before this can go live):**
- `mixremote.app` DNS is on **Porkbun**. A Worker custom domain needs the zone on Cloudflare.
  - **Option A (recommended):** add `mixremote.app` to Cloudflare (free plan) and change the nameservers at Porkbun to Cloudflare's. Recreate the GitHub Pages records as DNS-only (grey cloud): A records `185.199.108.153`, `.109`, `.110`, `.111`, plus the `www` CNAME if used. Then Worker → Settings → Domains → add `join.mixremote.app`.
  - Option B: no DNS move, so links use `intercom-turn.imsk8erboi.workers.dev/r/CODE`. This works but looks ugly.

**Worker:** the old Worker already has unused `/r/NNNN` and `/og/NNNN.png` routes from the asahina version. Reuse them; don't rewrite.
- `GET join.mixremote.app/<CODE>` (also accept `/r/<CODE>`). Validate CODE with the same format as the app's room codes. It returns a tiny HTML page with:
  - `og:title` "Join room <CODE> · Intercom"
  - `og:image` `https://join.mixremote.app/og/<CODE>.png` at 1200×630, plus `twitter:card summary_large_image`
  - instant redirect for people: `<meta http-equiv="refresh">` plus `location.replace` to `https://mixremote.app/?code=<CODE>`
- `GET /og/<CODE>.png`: the existing banner style (match `og.png`) with the code drawn large in mono, and `Cache-Control: public, max-age=86400`.
- An invalid code redirects to `https://mixremote.app/`.

**Site (`index.html` ~L2393–2420):**
- Keep `roomUrl` as the plain `mixremote.app/?code=` for the QR code. Scanning a QR doesn't need a preview, and this avoids a redirect hop.
- Change `shareUrl = code => 'https://join.mixremote.app/' + code` for Share and Copy link.
- Put the base URL in a `const JOIN_URL = 'https://join.mixremote.app/'` next to `RELAY_URL`.

**Verify:**
- `curl https://join.mixremote.app/1234` shows the og tags.
- `curl -I https://join.mixremote.app/og/1234.png` returns 200 `image/png`.
- The opengraph.xyz preview shows the code.
