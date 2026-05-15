# @vibe-id/react

React hooks and optional styled components for VibeID sign-in.

Repository name: `vibe-id-react`

Package name: `@vibe-id/react`

## Install

```sh
pnpm add @vibe-id/react
```

Use this with a backend integration such as `@vibe-id/next`.
By default, the React helpers call `/api/vibe-id/request`,
`/api/vibe-id/session`, and `/api/vibe-id/logout`. Pass `apiBasePath` when
your backend is mounted somewhere else.

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
`@vibe-id/react/styled` when you want VibeID's branded provider button,
approval prompt, and identity menu.

## Hook example

```tsx
"use client";

import { useVibeIdSignIn } from "@vibe-id/react";

export function SignInButton() {
  const vibe = useVibeIdSignIn({ apiBasePath: "/api/vibe-id" });

  return (
    <button
      type="button"
      onClick={() => void vibe.start({ openAppOnMobile: true })}
      disabled={vibe.busy}
    >
      {vibe.authenticated ? "Signed in" : "Sign in with VibeID"}
    </button>
  );
}
```

When the backend uses `@vibe-id/next` with `sessionMode: "external"`, the hook
sets `vibe.authenticated` and exposes any app-provided public payload as
`vibe.externalSession`. `vibe.session` is only populated for VibeID-managed
browser sessions.

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

The styled prompt defaults to VibeID's branded gradient treatment. Pass
`variant="neutral"` to `VibeIdPrompt`, or `promptVariant="neutral"` to
`VibeIdIdentityMenu`, when you want a quieter prompt.

## Exports

- `useVibeIdSignIn`
- `VibeIdProvider`
- `useVibeId`
- `useVibeIdQrCode`
- `createVibeIdApiUrls`
- `VibeIdSignInButton`
- `VibeIdSignInPrompt`
- `VibeIdQrCode`
- `VibeIdAvatarButton`
- `VibeIdProfileMenu`
- `@vibe-id/react/styled`
  - `VibeIdButton`
  - `VibeIdPrompt`
  - `VibeIdSignIn`
  - `VibeIdIdentityMenu`
- `@vibe-id/react/styled.css`
- launch and display helpers

## Release checks

```sh
pnpm test
pnpm pack:dry-run
```
