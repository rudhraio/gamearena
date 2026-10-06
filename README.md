# GAME ARENA

A static progressive web app with Math, Zip, Sudoku, and Memory Sequence. Scores and unfinished Sudoku boards stay in browser storage.

## Cloudflare Pages

Use the repository root as the Pages root directory and the build output directory (`.`). Choose no framework preset and use `exit 0` as the build command. All pages and assets are already in the repository; there is no build step. Cloudflare Pages serves the directory routes from their `index.html` files, and `404.html` prevents unknown files from silently returning the hub.

Serve the site over HTTPS. The service worker precaches every game page and local runtime asset. The main route paths are `/`, `/math/`, `/levels/`, `/play/`, `/zip/`, `/zip/play/`, `/sudoku/`, and `/memory/`. The old `.html` addresses redirect through `_redirects`.

After a deployment, an already installed app may need one online visit to receive the new service worker. The app then supports offline navigation between cached routes. On iPhone or iPad, open the site in Safari and use Share → Add to Home Screen; Safari does not fire the install prompt used by Chromium browsers.

The Pages `_headers` file restricts resource origins and framing. The standard Alpine build needs `'unsafe-eval'` in its script policy; when upgrading Alpine, check the bundled version and the browser smoke test.

## Checks

`npm test` verifies the Math operations, Zip paths across all difficulties, and Sudoku uniqueness.

For the browser smoke test, run `python3 tests/security_server.py`, start Chrome with DevTools on port 9222, and run `node tests/browser-smoke.mjs`. It checks page initialization, game starts, offline navigation, the iPhone install banner, and the Pages security policy.
