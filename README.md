# @vibe-id/react

React hooks and optional styled components for VibeID sign-in.

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
- render headless/custom sign-in UI
- optionally use styled provider-button and approval-prompt components

Use the hooks when you already have your own login UI. Use
`@vibe-id/react/styled` when you want VibeID's default provider button and
approval prompt.

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

## Styled component example

```tsx
"use client";

import "@vibe-id/react/styled.css";
import { VibeIdSignIn } from "@vibe-id/react/styled";

export function SignInOption() {
  return <VibeIdSignIn />;
}
```

If your framework restricts global CSS imports, import
`@vibe-id/react/styled.css` from your app root/layout file.

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
- `@vibe-id/react/styled`
  - `VibeIdButton`
  - `VibeIdPrompt`
  - `VibeIdSignIn`
- `@vibe-id/react/styled.css`
- launch and display helpers

## Release checks

```sh
pnpm test
pnpm pack:dry-run
```
