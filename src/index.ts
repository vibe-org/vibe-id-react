import { useCallback, useEffect, useRef, useState } from "react";

export const VIBE_ID_ANDROID_PACKAGE = "co.exmakina.vibe.authenticator";
export const VIBE_ID_DOWNLOAD_URL = `https://play.google.com/store/apps/details?id=${VIBE_ID_ANDROID_PACKAGE}`;

export type VibeIdTheme = {
  key: string;
  displayName: string;
  startColor: string;
  accentColor: string;
  endColor: string;
  avatarColor: string;
  surfaceColor: string;
  surfaceAccentColor: string;
};

export type VibeIdProfile = {
  displayName: string;
  initials: string;
  theme: VibeIdTheme;
  avatarUrl: string | null;
};

export type VibeIdSession = {
  did: string;
  requestId: string;
  origin: string;
  createdAt: string;
  expiresAt: string;
  profile?: VibeIdProfile | null;
};

export type VibeIdSignInRequest = {
  ok: boolean;
  requestId: string;
  deepLinkUrl: string;
  statusUrl: string;
  expiresAt: string;
  relyingPartyOrigin: string | null;
};

export type VibeIdSessionResponse = {
  ok: boolean;
  authenticated: boolean;
  session?: VibeIdSession;
};

export type VibeIdSignInStatusResponse = {
  ok: boolean;
  status: "pending" | "completed" | "expired";
  authenticated?: boolean;
  session?: VibeIdSession | null;
  result?: {
    status: "ok" | "error";
    outcome: "verified" | "rejected" | "failed";
    error?: string | null;
    message?: string | null;
  };
};

export type VibeIdSignInPhase =
  | "idle"
  | "creating"
  | "pending"
  | "authenticated"
  | "expired"
  | "rejected"
  | "failed";

export type VibeIdSignInOptions = {
  requestUrl?: string;
  statusUrl?: string;
  sessionUrl?: string;
  logoutUrl?: string;
  pollIntervalMs?: number;
  appNotOpenedDelayMs?: number;
  androidPackageName?: string;
  androidFallbackUrl?: string;
  autoRefreshSession?: boolean;
  fetcher?: typeof fetch;
  location?: Pick<Location, "origin" | "href">;
  navigator?: Pick<Navigator, "userAgent">;
  document?: Pick<Document, "visibilityState">;
};

export type VibeIdStartOptions = {
  openAppOnMobile?: boolean;
  origin?: string;
};

export type VibeIdSignInState = {
  phase: VibeIdSignInPhase;
  busy: boolean;
  polling: boolean;
  request: VibeIdSignInRequest | null;
  session: VibeIdSession | null;
  error: string | null;
  start: (options?: VibeIdStartOptions) => Promise<VibeIdSignInRequest | null>;
  openVibeId: () => boolean;
  refreshSession: () => Promise<VibeIdSession | null>;
  logout: () => Promise<boolean>;
  cancel: () => void;
  clearError: () => void;
};

const DEFAULT_REQUEST_URL = "/api/auth/vibe/request";
const DEFAULT_SESSION_URL = "/api/auth/session";
const DEFAULT_LOGOUT_URL = "/api/auth/logout";
const DEFAULT_POLL_INTERVAL_MS = 1500;
const DEFAULT_APP_NOT_OPENED_DELAY_MS = 1500;

export function isMobileUserAgent(userAgent: string) {
  return /android|iphone|ipad|ipod/i.test(userAgent);
}

export function createVibeIdAppLaunchUrl(
  deepLinkUrl: string,
  options: {
    userAgent?: string;
    androidPackageName?: string;
    androidFallbackUrl?: string;
  } = {},
) {
  const userAgent = options.userAgent?.toLowerCase() ?? "";
  if (!userAgent.includes("android")) {
    return deepLinkUrl;
  }

  const url = new URL(deepLinkUrl);
  const packageName = options.androidPackageName ?? VIBE_ID_ANDROID_PACKAGE;
  const fallbackUrl = encodeURIComponent(options.androidFallbackUrl ?? VIBE_ID_DOWNLOAD_URL);
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=${url.protocol.replace(
    ":",
    "",
  )};package=${packageName};S.browser_fallback_url=${fallbackUrl};end`;
}

export function useVibeIdSignIn(options: VibeIdSignInOptions = {}): VibeIdSignInState {
  const requestUrl = options.requestUrl ?? DEFAULT_REQUEST_URL;
  const sessionUrl = options.sessionUrl ?? DEFAULT_SESSION_URL;
  const logoutUrl = options.logoutUrl ?? DEFAULT_LOGOUT_URL;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const appNotOpenedDelayMs = options.appNotOpenedDelayMs ?? DEFAULT_APP_NOT_OPENED_DELAY_MS;
  const fetcher = options.fetcher ?? globalThis.fetch?.bind(globalThis);
  const browserLocation = options.location ?? globalThis.location;
  const browserNavigator = options.navigator ?? globalThis.navigator;
  const browserDocument = options.document ?? globalThis.document;
  const autoRefreshSession = options.autoRefreshSession ?? true;
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeStatusUrlRef = useRef("");
  const [phase, setPhase] = useState<VibeIdSignInPhase>("idle");
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const [request, setRequest] = useState<VibeIdSignInRequest | null>(null);
  const [session, setSession] = useState<VibeIdSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!fetcher) {
    throw new Error("@vibe-id/react requires a fetch implementation.");
  }

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    activeStatusUrlRef.current = "";
    setPolling(false);
  }, []);

  const clearAppFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshSession = useCallback(async (): Promise<VibeIdSession | null> => {
    try {
      const response = await fetcher(sessionUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({ ok: false, authenticated: false }))) as VibeIdSessionResponse;
      const nextSession = response.ok && data.ok && data.authenticated && data.session ? data.session : null;
      setSession(nextSession);
      if (nextSession) {
        setPhase("authenticated");
      }
      return nextSession;
    } catch {
      return null;
    }
  }, [fetcher, sessionUrl]);

  const pollStatus = useCallback(async () => {
    if (!activeStatusUrlRef.current) {
      return;
    }

    try {
      const response = await fetcher(activeStatusUrlRef.current, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as VibeIdSignInStatusResponse;

      if (response.status === 404 || data.status === "expired") {
        stopPolling();
        setPhase("expired");
        setError("This QR code expired. Generate a fresh one.");
        return;
      }

      if (!response.ok || !data.ok) {
        stopPolling();
        setPhase("failed");
        setError("The site could not confirm sign-in.");
        return;
      }

      if (data.status === "completed") {
        stopPolling();

        if (data.authenticated && data.session) {
          setSession(data.session);
          setRequest(null);
          setPhase("authenticated");
          setError(null);
          return;
        }

        const outcome = data.result?.outcome;
        setPhase(outcome === "rejected" ? "rejected" : "failed");
        setError(data.result?.message ?? data.result?.error ?? "Sign-in was not completed.");
      }
    } catch {
      stopPolling();
      setPhase("failed");
      setError("Polling for sign-in status failed.");
    }
  }, [fetcher, stopPolling]);

  const startPolling = useCallback(
    (nextStatusUrl: string) => {
      stopPolling();
      activeStatusUrlRef.current = nextStatusUrl;
      setPolling(true);
      setPhase("pending");
      void pollStatus();
      pollTimerRef.current = setInterval(() => {
        void pollStatus();
      }, pollIntervalMs);
    },
    [pollIntervalMs, pollStatus, stopPolling],
  );

  const openVibeId = useCallback(() => {
    if (!request?.deepLinkUrl || !browserLocation) {
      return false;
    }

    clearError();
    clearAppFallbackTimer();
    browserLocation.href = createVibeIdAppLaunchUrl(request.deepLinkUrl, {
      userAgent: browserNavigator?.userAgent,
      androidPackageName: options.androidPackageName,
      androidFallbackUrl: options.androidFallbackUrl,
    });

    fallbackTimerRef.current = setTimeout(() => {
      if (!browserDocument || browserDocument.visibilityState === "visible") {
        setError("If VibeID did not open, install it and try again.");
      }
    }, appNotOpenedDelayMs);

    return true;
  }, [
    appNotOpenedDelayMs,
    browserDocument,
    browserLocation,
    browserNavigator,
    clearAppFallbackTimer,
    clearError,
    options.androidFallbackUrl,
    options.androidPackageName,
    request,
  ]);

  const start = useCallback(
    async (startOptions: VibeIdStartOptions = {}): Promise<VibeIdSignInRequest | null> => {
      setBusy(true);
      setPhase("creating");
      clearError();
      clearAppFallbackTimer();
      setRequest(null);

      try {
        const origin = startOptions.origin ?? browserLocation?.origin;
        const response = await fetcher(requestUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(origin ? { origin } : {}),
        });
        const data = (await response.json().catch(() => ({}))) as VibeIdSignInRequest & { error?: string };

        if (!response.ok || !data.ok) {
          throw new Error(data.error ?? "Could not create a sign-in request.");
        }

        setRequest(data);
        startPolling(options.statusUrl ?? data.statusUrl);

        if (
          startOptions.openAppOnMobile &&
          browserNavigator &&
          isMobileUserAgent(browserNavigator.userAgent) &&
          browserLocation
        ) {
          browserLocation.href = createVibeIdAppLaunchUrl(data.deepLinkUrl, {
            userAgent: browserNavigator.userAgent,
            androidPackageName: options.androidPackageName,
            androidFallbackUrl: options.androidFallbackUrl,
          });
        }

        return data;
      } catch (err) {
        setPhase("failed");
        setError(err instanceof Error ? err.message : "Could not create a sign-in request.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [
      browserLocation,
      browserNavigator,
      clearAppFallbackTimer,
      clearError,
      fetcher,
      options.androidFallbackUrl,
      options.androidPackageName,
      options.statusUrl,
      requestUrl,
      startPolling,
    ],
  );

  const cancel = useCallback(() => {
    clearAppFallbackTimer();
    stopPolling();
    setRequest(null);
    setPhase(session ? "authenticated" : "idle");
  }, [clearAppFallbackTimer, session, stopPolling]);

  const logout = useCallback(async () => {
    setBusy(true);
    clearError();

    try {
      const response = await fetcher(logoutUrl, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error("Could not end the current session.");
      }

      setSession(null);
      setRequest(null);
      cancel();
      setPhase("idle");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not end the current session.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [cancel, clearError, fetcher, logoutUrl]);

  useEffect(() => {
    return () => {
      stopPolling();
      clearAppFallbackTimer();
    };
  }, [clearAppFallbackTimer, stopPolling]);

  useEffect(() => {
    if (!autoRefreshSession) {
      return;
    }

    let active = true;
    const timerId = setTimeout(() => {
      void (async () => {
        const nextSession = await refreshSession();
        if (!active || nextSession) {
          return;
        }
        setPhase("idle");
      })();
    }, 0);

    return () => {
      active = false;
      clearTimeout(timerId);
    };
  }, [autoRefreshSession, refreshSession]);

  return {
    phase,
    busy,
    polling,
    request,
    session,
    error,
    start,
    openVibeId,
    refreshSession,
    logout,
    cancel,
    clearError,
  };
}
