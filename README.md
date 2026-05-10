# @vibe-id/react

React hooks and small UI primitives for VibeID sign-in.

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
- render a sign-in button, QR prompt, avatar button, and profile menu

The components ship with simple inline defaults and accept normal `className`
and `style` props. Use the hook when you already have your own login UI.

## Hook example

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

## Component example

```tsx
"use client";

import {
  VibeIdAvatarButton,
  VibeIdProfileMenu,
  VibeIdProvider,
  VibeIdSignInButton,
  VibeIdSignInPrompt,
  useVibeId,
} from "@vibe-id/react";

export function AuthMenu() {
  return (
    <VibeIdProvider>
      <AuthMenuInner />
    </VibeIdProvider>
  );
}

function AuthMenuInner() {
  const vibe = useVibeId();

  if (vibe.session) {
    return (
      <div>
        <VibeIdAvatarButton />
        <VibeIdProfileMenu actions={[{ label: "Account settings", href: "/account" }]} />
      </div>
    );
  }

  return (
    <div>
      <VibeIdSignInButton />
      {vibe.request ? <VibeIdSignInPrompt /> : null}
    </div>
  );
}
```

## Exports

- `useVibeIdSignIn`
- `VibeIdProvider`
- `useVibeId`
- `useVibeIdQrCode`
- `VibeIdSignInButton`
- `VibeIdSignInPrompt`
- `VibeIdQrCode`
- `VibeIdAvatarButton`
- `VibeIdProfileMenu`
- launch and display helpers

## Release checks

```sh
pnpm test
pnpm pack:dry-run
```
