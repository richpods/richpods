# CDN URL Change Simulator

Integration test for [richpods/richpods#1](https://github.com/richpods/richpods/issues/1).

Simulates a podcast CDN that rotates audio URLs. Old URLs return 404, but episode GUIDs stay stable so the media check flow can re-resolve via the RSS feed.

## Setup

1. Deploy to a PHP webhost with `mod_rewrite`.
2. Place `rp-demo-1.mp3` and `rp-demo-2.mp3` next to `index.php`.
3. Open the root URL -- the dashboard has full documentation.

## Files

| File | Purpose |
|---|---|
| `index.php` | PHP router -- handles all requests |
| `.htaccess` | Apache rewrite rules to route through `index.php` |
| `state.json` | Auto-created on first request; stores current CDN token and history |

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Dashboard with documentation, controls, and token history |
| `GET` | `/feed.xml` | RSS feed (enclosure URLs reflect current CDN token) |
| `GET` | `/cdn/<token>/<file>.mp3` | Audio file (only the current token returns 200) |
| `HEAD` | `/cdn/<token>/<file>.mp3` | HEAD check (same token rules) |
| `POST` | `/rotate-cdn` | Generate a new CDN token; old URLs become 404 |
| `POST` | `/reset` | Fresh start with a new token |
| `GET` | `/status` | Current state as JSON |
