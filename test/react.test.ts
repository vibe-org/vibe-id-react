import assert from "node:assert/strict";
import test from "node:test";
import {
  VIBE_ID_DOWNLOAD_URL,
  createVibeIdAppLaunchUrl,
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
