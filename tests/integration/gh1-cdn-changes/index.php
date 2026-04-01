<?php
/**
 * CDN URL Change Simulator — Integration test for richpods/richpods#1
 *
 * Simulates a podcast CDN that generates a new, unique audio URL on every
 * CDN rotation. Old URLs expire and return 404. The RSS feed always reflects
 * the current URLs, but episode GUIDs stay stable — exactly the scenario
 * described in the issue.
 *
 * Deploy to any PHP webhost with mod_rewrite. Place rp-demo-1.mp3 and
 * rp-demo-2.mp3 in the same directory as this file.
 *
 * Endpoints:
 *   GET  /feed.xml        — RSS feed (enclosure URLs reflect current CDN token)
 *   GET  /cdn/<token>/<file>.mp3 — Audio file (only the current token works)
 *   HEAD /cdn/<token>/<file>.mp3 — HEAD check (same rules)
 *   POST /rotate-cdn      — Generate a new CDN token; old URLs become 404
 *   POST /reset           — Reset to initial state (first token)
 *   GET  /status          — Current state as JSON
 *   GET  /                — Dashboard
 */

declare(strict_types=1);

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

$mp3Files = [
    "rp-demo-1" => __DIR__ . "/rp-demo-1.mp3",
    "rp-demo-2" => __DIR__ . "/rp-demo-2.mp3",
];

$missingFiles = [];
foreach ($mp3Files as $label => $path) {
    if (!file_exists($path)) {
        $missingFiles[] = "$label.mp3";
    }
}

// ---------------------------------------------------------------------------
// Base URL detection
// ---------------------------------------------------------------------------

$scheme = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off") ? "https" : "http";
$host = $_SERVER["HTTP_HOST"] ?? $_SERVER["SERVER_NAME"];
$scriptDir = rtrim(dirname($_SERVER["SCRIPT_NAME"]), "/");
$baseUrl = "$scheme://$host$scriptDir";

// ---------------------------------------------------------------------------
// Request path
// ---------------------------------------------------------------------------

$requestPath = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);
if ($scriptDir !== "" && strpos($requestPath, $scriptDir) === 0) {
    $requestPath = substr($requestPath, strlen($scriptDir));
}
if ($requestPath === "" || $requestPath === false) {
    $requestPath = "/";
}
$method = $_SERVER["REQUEST_METHOD"];

// ---------------------------------------------------------------------------
// State — persisted in state.json next to index.php
//
// {
//   "currentToken": "a3f8...",   — the only token that serves audio
//   "history": ["initial-token", "second-token", ...]
// }
// ---------------------------------------------------------------------------

$stateFile = __DIR__ . "/state.json";

function generateToken(): string
{
    return bin2hex(random_bytes(8));
}

function loadState(string $stateFile): array
{
    if (file_exists($stateFile)) {
        $data = json_decode(file_get_contents($stateFile), true);
        if (is_array($data) && isset($data["currentToken"])) {
            return $data;
        }
    }
    $token = generateToken();
    $state = ["currentToken" => $token, "history" => [$token]];
    saveState($stateFile, $state);
    return $state;
}

function saveState(string $stateFile, array $state): void
{
    file_put_contents($stateFile, json_encode($state, JSON_PRETTY_PRINT), LOCK_EX);
}

// ---------------------------------------------------------------------------
// Feed generation
// ---------------------------------------------------------------------------

function buildFeed(string $baseUrl, string $token, array $mp3Files): string
{
    $ep1Url = "$baseUrl/cdn/$token/rp-demo-1.mp3";
    $ep2Url = "$baseUrl/cdn/$token/rp-demo-2.mp3";
    $ep1Size = filesize($mp3Files["rp-demo-1"]);
    $ep2Size = filesize($mp3Files["rp-demo-2"]);

    $guid1 = "urn:richpods:test:episode-001";
    $guid2 = "urn:richpods:test:episode-002";

    $description = htmlspecialchars(implode("\n", [
        "CDN URL Change Simulator — Integration test for richpods/richpods#1",
        "",
        "This feed simulates a podcast CDN that generates a new, unique audio URL",
        "on every rotation. Old URLs expire and return 404. The feed always reflects",
        "the current URLs, but episode GUIDs stay stable.",
        "",
        "Current CDN token: $token",
        "",
        "Endpoints:",
        "  GET  $baseUrl/feed.xml                    — This RSS feed",
        "  GET  $baseUrl/cdn/<token>/<file>.mp3      — Audio (only current token works)",
        "  HEAD $baseUrl/cdn/<token>/<file>.mp3      — HEAD check (same rules)",
        "  POST $baseUrl/rotate-cdn                  — New CDN token; old URLs become 404",
        "  POST $baseUrl/reset                       — Fresh start with a new token",
        "  GET  $baseUrl/status                      — Current state as JSON",
        "  GET  $baseUrl/                            — Dashboard",
        "",
        "Current audio URLs:",
        "  Episode 1: $baseUrl/cdn/$token/rp-demo-1.mp3",
        "  Episode 2: $baseUrl/cdn/$token/rp-demo-2.mp3",
        "",
        "How to test:",
        "  1. Note the enclosure URLs in this feed.",
        "  2. POST /rotate-cdn to simulate a CDN rotation.",
        "  3. The old URLs now return 404.",
        "  4. Reload this feed — enclosure URLs point to the new token.",
        "  5. Episode GUIDs remain unchanged (the stable identifier for re-resolution).",
    ]), ENT_XML1, "UTF-8");

    return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>RichPods CDN Test Podcast</title>
    <link>$baseUrl</link>
    <description>$description</description>
    <language>en</language>
    <lastBuildDate>Mon, 31 Mar 2026 12:00:00 +0000</lastBuildDate>

    <item>
      <title>Episode 1: The Pilot</title>
      <guid isPermaLink="false">$guid1</guid>
      <pubDate>Mon, 24 Mar 2026 08:00:00 +0000</pubDate>
      <description>First test episode. The enclosure URL changes when the CDN rotates.</description>
      <enclosure url="$ep1Url" length="$ep1Size" type="audio/mpeg" />
    </item>

    <item>
      <title>Episode 2: The Follow-Up</title>
      <guid isPermaLink="false">$guid2</guid>
      <pubDate>Mon, 31 Mar 2026 08:00:00 +0000</pubDate>
      <description>Second test episode with a different audio file.</description>
      <enclosure url="$ep2Url" length="$ep2Size" type="audio/mpeg" />
    </item>

  </channel>
</rss>
XML;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sendJson(int $status, array $data): void
{
    http_response_code($status);
    header("Content-Type: application/json");
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

$state = loadState($stateFile);
$currentToken = $state["currentToken"];

// --- GET / (dashboard) — served even when MP3 files are missing ---

if ($requestPath === "/" && $method === "GET") {
    $rotations = count($state["history"]);
    $ep1Url = htmlspecialchars("cdn/$currentToken/rp-demo-1.mp3");
    $ep2Url = htmlspecialchars("cdn/$currentToken/rp-demo-2.mp3");

    $historyRows = "";
    foreach (array_reverse($state["history"]) as $i => $t) {
        $idx = $rotations - $i;
        $isCurrent = ($t === $currentToken);
        $cls = $isCurrent ? "ok" : "dead";
        $label = $isCurrent ? "active" : "expired (404)";
        $historyRows .= "    <tr><td>#$idx</td><td class=\"$cls\"><code>$t</code></td><td class=\"$cls\">$label</td></tr>\n";
    }

    $missingHtml = "";
    if (!empty($missingFiles)) {
        $list = implode(", ", array_map(fn($f) => "<code>$f</code>", $missingFiles));
        $missingHtml = <<<HTML
  <div class="missing">
    <strong>Missing MP3 files:</strong> $list<br>
    Place them in the same directory as <code>index.php</code> to enable the feed and audio endpoints.
  </div>
HTML;
    }

    header("Content-Type: text/html; charset=utf-8");
    echo <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>RichPods CDN Simulator</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 700px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    h1 { margin-bottom: 0.3em; }
    .meta { color: #666; margin-top: 0; }
    .missing { background: #fff3cd; border: 1px solid #ffc107; padding: 12px 16px; border-radius: 6px; margin: 1rem 0; }
    button { padding: 8px 16px; font-size: 1rem; cursor: pointer; margin-right: 8px; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #ddd; }
    .ok { color: green; } .dead { color: #999; text-decoration: line-through; }
    .docs { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 16px 20px; margin: 1.5rem 0; }
    .docs h3 { margin-top: 0; }
    .docs pre { background: #fff; border: 1px solid #dee2e6; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 0.85em; }
    .docs ol { padding-left: 1.2em; }
  </style>
</head>
<body>
  <h1>RichPods CDN Simulator</h1>
  <p class="meta">Integration test for <a href="https://github.com/richpods/richpods/issues/1">richpods/richpods#1</a></p>

$missingHtml

  <p>Current token: <code>$currentToken</code> &mdash; $rotations rotation(s) total</p>

  <form method="post" action="rotate-cdn" style="display:inline">
    <button type="submit">Rotate CDN</button>
  </form>
  <form method="post" action="reset" style="display:inline">
    <button type="submit">Reset</button>
  </form>

  <div class="docs">
    <h3>What is this?</h3>
    <p>
      This feed simulates a podcast CDN that generates a new, unique audio URL
      on every rotation. Old URLs expire and return 404. The RSS feed always
      reflects the current URLs, but episode GUIDs stay stable &mdash; exactly
      the scenario described in the issue.
    </p>

    <h3>Endpoints</h3>
    <pre>
GET  $baseUrl/feed.xml                             &mdash; RSS feed
GET  $baseUrl/cdn/&lt;token&gt;/&lt;file&gt;.mp3   &mdash; Audio (only current token works)
HEAD $baseUrl/cdn/&lt;token&gt;/&lt;file&gt;.mp3   &mdash; HEAD check (same rules)
POST $baseUrl/rotate-cdn                           &mdash; New CDN token; old URLs become 404
POST $baseUrl/reset                                &mdash; Fresh start with a new token
GET  $baseUrl/status                               &mdash; Current state as JSON
</pre>

    <h3>How to test</h3>
    <ol>
      <li>Note the enclosure URLs in the <a href="feed.xml">RSS feed</a>.</li>
      <li><code>POST /rotate-cdn</code> to simulate a CDN rotation.</li>
      <li>The old URLs now return 404.</li>
      <li>Reload the feed &mdash; enclosure URLs point to the new token.</li>
      <li>Episode GUIDs remain unchanged (the stable identifier for re-resolution).</li>
    </ol>
  </div>

  <h2>Current audio URLs</h2>
  <table>
    <tr><th>Resource</th><th>URL</th></tr>
    <tr><td>RSS Feed</td><td><a href="feed.xml">feed.xml</a></td></tr>
    <tr><td>Episode 1</td><td><a href="$ep1Url">$ep1Url</a></td></tr>
    <tr><td>Episode 2</td><td><a href="$ep2Url">$ep2Url</a></td></tr>
  </table>

  <h2>Token history</h2>
  <table>
    <tr><th>#</th><th>Token</th><th>Status</th></tr>
$historyRows
  </table>
</body>
</html>
HTML;
    exit;
}

// --- Require MP3 files for all remaining routes ---

if (!empty($missingFiles)) {
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode([
        "error" => "Missing MP3 files",
        "missing" => $missingFiles,
        "message" => "Place rp-demo-1.mp3 and rp-demo-2.mp3 next to index.php. Visit / for the dashboard.",
    ]);
    exit;
}

// --- POST /rotate-cdn ---

if ($method === "POST" && $requestPath === "/rotate-cdn") {
    $oldToken = $state["currentToken"];
    $newToken = generateToken();
    $state["currentToken"] = $newToken;
    $state["history"][] = $newToken;
    saveState($stateFile, $state);
    sendJson(200, [
        "message" => "CDN rotated",
        "oldToken" => $oldToken,
        "newToken" => $newToken,
        "rotations" => count($state["history"]),
        "oldEp1" => "$baseUrl/cdn/$oldToken/rp-demo-1.mp3 → 404",
        "newEp1" => "$baseUrl/cdn/$newToken/rp-demo-1.mp3 → 200",
    ]);
    exit;
}

// --- POST /reset ---

if ($method === "POST" && $requestPath === "/reset") {
    $token = generateToken();
    $state = ["currentToken" => $token, "history" => [$token]];
    saveState($stateFile, $state);
    sendJson(200, ["message" => "Reset", "token" => $token]);
    exit;
}

// --- GET /status ---

if ($method === "GET" && $requestPath === "/status") {
    sendJson(200, [
        "currentToken" => $currentToken,
        "rotations" => count($state["history"]),
        "ep1Url" => "$baseUrl/cdn/$currentToken/rp-demo-1.mp3",
        "ep2Url" => "$baseUrl/cdn/$currentToken/rp-demo-2.mp3",
        "feedUrl" => "$baseUrl/feed.xml",
        "history" => $state["history"],
    ]);
    exit;
}

// --- GET /feed.xml ---

if ($method === "GET" && $requestPath === "/feed.xml") {
    header("Content-Type: application/rss+xml; charset=utf-8");
    header("Cache-Control: no-cache");
    echo buildFeed($baseUrl, $currentToken, $mp3Files);
    exit;
}

// --- GET|HEAD /cdn/<token>/<file>.mp3 ---

if (preg_match('#^/cdn/([a-f0-9]+)/(rp-demo-[12])\.mp3$#', $requestPath, $m)) {
    $requestedToken = $m[1];
    $fileKey = $m[2];
    $filePath = $mp3Files[$fileKey];

    if ($requestedToken !== $currentToken) {
        http_response_code(404);
        header("Content-Type: application/json");
        echo json_encode([
            "error" => "CDN resource expired",
            "message" => "This CDN URL is no longer valid. The content has moved to a new token.",
        ]);
        exit;
    }

    $fileSize = filesize($filePath);
    http_response_code(200);
    header("Content-Type: audio/mpeg");
    header("Content-Length: $fileSize");
    header("Accept-Ranges: bytes");
    header("ETag: \"$currentToken-$fileKey\"");
    header("Last-Modified: Mon, 24 Mar 2026 08:00:00 GMT");

    if ($method !== "HEAD") {
        readfile($filePath);
    }
    exit;
}

// --- 404 fallback ---

http_response_code(404);
header("Content-Type: application/json");
echo json_encode(["error" => "Not found", "uri" => $requestPath]);
