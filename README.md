# @vibe-id/react

React hooks for VibeID sign-in.

Repository name: `vibe-id-react`

Package name: `@vibe-id/react`

## Install

```sh
pnpm add @vibe-id/react
```

Use this with a backend integration such as `@vibe-id/next`.

## What belongs here

This package contains browser-side React helpers:

- create VibeID sign-in requests
- poll sign-in status
- refresh browser sessions
- log out
- launch the VibeID mobile app from a deep link
- expose a small state machine for custom UI

It intentionally does not ship styled UI components yet. Build your own sheet,
popover, button, and QR presentation around the hook state.

## Example

```tsx
"use client";

import { useVibeIdSignIn } from "@vibe-id/react";

export function SignInButton() {
  const vibe = useVibeIdSignIn();

  return (
    <button
      type="button"
      onClick={() => void vibe.start({ openAppOnMobile: true })}
      disabled={vibe.busy}
    >
      {vibe.session ? "Signed in" : "Sign in with VibeID"}
    </button>
  );
}
```

## Release checks

```sh
pnpm test
pnpm pack:dry-run
```
