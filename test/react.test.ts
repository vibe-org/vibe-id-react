import assert from "node:assert/strict";
import test from "node:test";
import {
  VIBE_ID_DOWNLOAD_URL,
  createVibeIdAppLaunchUrl,
  getVibeIdDisplayName,
  getVibeIdIdentityKey,
  getVibeIdInitials,
  isMobileUserAgent,
} from "../src/index.js";

test("detects mobile user agents", () => {
  assert.equal(isMobileUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), true);
  assert.equal(isMobileUserAgent("Mozilla/5.0 (Linux; Android 15; Pixel 9)"), true);
  assert.equal(isMobileUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), false);
});

test("keeps the custom scheme URL on non-Android browsers", () => {
  const deepLinkUrl = "vibe-id://sign?p=abc&c=https%3A%2F%2Fexample.com%2Fcallback&k=signin";

  assert.equal(
    createVibeIdAppLaunchUrl(deepLinkUrl, { userAgent: "Mozilla/5.0 (iPhone)" }),
    deepLinkUrl,
  );
});

test("creates an Android intent URL with a Play Store fallback", () => {
  const deepLinkUrl = "vibe-id://sign?p=abc&c=https%3A%2F%2Fexample.com%2Fcallback&k=signin";
  const launchUrl = createVibeIdAppLaunchUrl(deepLinkUrl, {
    userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9)",
  });

  assert.equal(
    launchUrl,
    `intent://sign?p=abc&c=https%3A%2F%2Fexample.com%2Fcallback&k=signin#Intent;scheme=vibe-id;package=co.exmakina.vibe.authenticator;S.browser_fallback_url=${encodeURIComponent(
      VIBE_ID_DOWNLOAD_URL,
    )};end`,
  );
});

test("allows Android package and fallback overrides", () => {
  const launchUrl = createVibeIdAppLaunchUrl("vibe-id://sign?p=abc", {
    userAgent: "Android",
    androidPackageName: "test.package",
    androidFallbackUrl: "https://example.com/install",
  });

  assert.equal(
    launchUrl,
    "intent://sign?p=abc#Intent;scheme=vibe-id;package=test.package;S.browser_fallback_url=https%3A%2F%2Fexample.com%2Finstall;end",
  );
});

test("derives display fallbacks from sessions", () => {
  assert.equal(getVibeIdDisplayName(null), "Personal");
  assert.equal(getVibeIdInitials(null), "P");
  assert.equal(
    getVibeIdDisplayName({
      did: "did:vibe:p256:abc123",
      requestId: "req",
      origin: "https://example.com",
      createdAt: "2026-05-10T00:00:00Z",
      expiresAt: "2026-05-17T00:00:00Z",
      profile: {
        displayName: "Patrik Opacic",
        initials: "PO",
        avatarUrl: null,
        theme: {
          key: "orbital",
          displayName: "Orbital",
          startColor: "#000000",
          accentColor: "#111111",
          endColor: "#222222",
          avatarColor: "#333333",
          surfaceColor: "#444444",
          surfaceAccentColor: "#555555",
        },
      },
    }),
    "Patrik Opacic",
  );
});

test("derives a compact identity key from a DID", () => {
  assert.equal(getVibeIdIdentityKey("did:vibe:p256:abc123yzG63s"), "yzG63s");
});
