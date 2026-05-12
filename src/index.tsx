import QRCode from "qrcode";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ImgHTMLAttributes,
  type ReactNode,
} from "react";

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
  apiBasePath?: string;
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

export type VibeIdProviderProps = {
  children: ReactNode;
  options?: VibeIdSignInOptions;
};

export type VibeIdQrCodeOptions = {
  margin?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  darkColor?: string;
  lightColor?: string;
};

export type VibeIdQrCodeState = {
  dataUrl: string;
  loading: boolean;
  error: string | null;
};

export type VibeIdSignInButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  vibe?: VibeIdSignInState;
  openAppOnMobile?: boolean;
  children?: ReactNode | ((state: VibeIdSignInState) => ReactNode);
};

export type VibeIdQrCodeProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  deepLinkUrl?: string;
  alt?: string;
  qrOptions?: VibeIdQrCodeOptions;
  placeholder?: ReactNode;
};

export type VibeIdSignInPromptProps = {
  vibe?: VibeIdSignInState;
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  style?: CSSProperties;
  qrOptions?: VibeIdQrCodeOptions;
  showDownloadLink?: boolean;
  downloadUrl?: string;
  renderQr?: (state: VibeIdQrCodeState) => ReactNode;
};

export type VibeIdAvatarButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  vibe?: VibeIdSignInState;
  children?: ReactNode | ((session: VibeIdSession | null) => ReactNode);
};

export type VibeIdProfileMenuAction = {
  label: ReactNode;
  href?: string;
  onClick?: () => void | Promise<void>;
};

export type VibeIdProfileMenuProps = {
  vibe?: VibeIdSignInState;
  className?: string;
  style?: CSSProperties;
  actions?: VibeIdProfileMenuAction[];
  showOrigin?: boolean;
  showExpires?: boolean;
  copyDidLabel?: ReactNode;
  copiedDidLabel?: ReactNode;
  logoutLabel?: ReactNode;
};

const DEFAULT_API_BASE_PATH = "/api/vibe-id";
const DEFAULT_POLL_INTERVAL_MS = 1500;
const DEFAULT_APP_NOT_OPENED_DELAY_MS = 1500;

const VibeIdContext = createContext<VibeIdSignInState | null>(null);

const buttonStyle: CSSProperties = {
  minHeight: 44,
  border: 0,
  borderRadius: 999,
  background: "#3865f4",
  color: "#fff",
  padding: "0 18px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  border: "1px solid #dbe3ef",
  background: "#fff",
  color: "#1f2937",
};

const promptStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  width: "min(100%, 340px)",
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  background: "#fff",
  padding: 20,
  color: "#0f172a",
  boxShadow: "0 24px 70px rgba(15, 23, 42, 0.14)",
};

const qrFrameStyle: CSSProperties = {
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  background: "#fff",
};

const mutedTextStyle: CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: 14,
  lineHeight: 1.55,
};

const menuStyle: CSSProperties = {
  width: "min(100%, 320px)",
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  background: "#fff",
  padding: 18,
  color: "#0f172a",
  boxShadow: "0 24px 70px rgba(15, 23, 42, 0.14)",
};

export function isMobileUserAgent(userAgent: string) {
  return /android|iphone|ipad|ipod/i.test(userAgent);
}

export function getVibeIdDisplayName(session: VibeIdSession | null) {
  return session?.profile?.displayName ?? "Personal";
}

export function getVibeIdInitials(session: VibeIdSession | null) {
  return session?.profile?.initials ?? "P";
}

export function getVibeIdIdentityKey(did: string) {
  const key = did.split(":").at(-1) ?? did;
  return key.slice(-6);
}

export async function copyTextToClipboard(value: string) {
  if (globalThis.navigator?.clipboard) {
    await globalThis.navigator.clipboard.writeText(value);
    return true;
  }

  return false;
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

export function createVibeIdApiUrls(apiBasePath = DEFAULT_API_BASE_PATH) {
  const basePath = normalizeApiBasePath(apiBasePath);
  return {
    requestUrl: `${basePath}/request`,
    sessionUrl: `${basePath}/session`,
    logoutUrl: `${basePath}/logout`,
    statusUrl: (requestId: string) => `${basePath}/status/${encodeURIComponent(requestId)}`,
  };
}

export function useVibeIdSignIn(options: VibeIdSignInOptions = {}): VibeIdSignInState {
  const apiUrls = useMemo(() => createVibeIdApiUrls(options.apiBasePath), [options.apiBasePath]);
  const requestUrl = options.requestUrl ?? apiUrls.requestUrl;
  const sessionUrl = options.sessionUrl ?? apiUrls.sessionUrl;
  const logoutUrl = options.logoutUrl ?? apiUrls.logoutUrl;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const appNotOpenedDelayMs = options.appNotOpenedDelayMs ?? DEFAULT_APP_NOT_OPENED_DELAY_MS;
  const fetcher = useMemo(() => options.fetcher ?? globalThis.fetch?.bind(globalThis), [options.fetcher]);
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

function normalizeApiBasePath(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return DEFAULT_API_BASE_PATH;
  }

  return trimmed.startsWith("/") || /^https?:\/\//i.test(trimmed) ? trimmed : `/${trimmed}`;
}

export function VibeIdProvider({ children, options }: VibeIdProviderProps) {
  const state = useVibeIdSignIn(options);
  return <VibeIdContext.Provider value={state}>{children}</VibeIdContext.Provider>;
}

export function useVibeId() {
  const state = useContext(VibeIdContext);
  if (!state) {
    throw new Error("useVibeId must be used inside a VibeIdProvider.");
  }

  return state;
}

export function useOptionalVibeId(provided?: VibeIdSignInState) {
  const state = useContext(VibeIdContext);
  if (provided) {
    return provided;
  }

  if (!state) {
    throw new Error("Pass a vibe prop or render this component inside VibeIdProvider.");
  }

  return state;
}

export function useVibeIdQrCode(
  deepLinkUrl?: string | null,
  options: VibeIdQrCodeOptions = {},
): VibeIdQrCodeState {
  const [state, setState] = useState<VibeIdQrCodeState>({
    dataUrl: "",
    loading: false,
    error: null,
  });

  useEffect(() => {
    let active = true;

    if (!deepLinkUrl) {
      setState({ dataUrl: "", loading: false, error: null });
      return;
    }

    setState((current) => ({ ...current, loading: true, error: null }));
    void (async () => {
      try {
        const svgMarkup = await QRCode.toString(deepLinkUrl, {
          type: "svg",
          errorCorrectionLevel: options.errorCorrectionLevel ?? "L",
          margin: options.margin ?? 4,
          color: {
            dark: options.darkColor ?? "#020617",
            light: options.lightColor ?? "#ffffff",
          },
        });

        if (active) {
          setState({
            dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (active) {
          setState({
            dataUrl: "",
            loading: false,
            error: err instanceof Error ? err.message : "Could not create QR code.",
          });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [
    deepLinkUrl,
    options.darkColor,
    options.errorCorrectionLevel,
    options.lightColor,
    options.margin,
  ]);

  return state;
}

export function VibeIdSignInButton({
  vibe: provided,
  openAppOnMobile = true,
  children,
  style,
  disabled,
  onClick,
  ...props
}: VibeIdSignInButtonProps) {
  const vibe = useOptionalVibeId(provided);
  const content =
    typeof children === "function"
      ? children(vibe)
      : children ?? (vibe.session ? "Signed in" : vibe.polling ? "Waiting..." : "Sign in with VibeID");

  return (
    <button
      {...props}
      type={props.type ?? "button"}
      disabled={disabled ?? vibe.busy}
      style={{ ...buttonStyle, opacity: disabled ?? vibe.busy ? 0.65 : 1, ...style }}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          void vibe.start({ openAppOnMobile });
        }
      }}
    >
      {content}
    </button>
  );
}

export function VibeIdQrCode({
  deepLinkUrl,
  alt = "VibeID sign-in QR code",
  qrOptions,
  placeholder,
  style,
  ...props
}: VibeIdQrCodeProps) {
  const qr = useVibeIdQrCode(deepLinkUrl, qrOptions);

  if (!qr.dataUrl) {
    return (
      <div style={{ ...qrFrameStyle, aspectRatio: "1 / 1", minHeight: 180, ...style }}>
        {placeholder ?? <span style={mutedTextStyle}>{qr.loading ? "Preparing QR..." : "No QR code yet."}</span>}
      </div>
    );
  }

  return (
    <img
      {...props}
      src={qr.dataUrl}
      alt={alt}
      style={{ display: "block", width: "100%", aspectRatio: "1 / 1", imageRendering: "crisp-edges", ...style }}
    />
  );
}

export function VibeIdSignInPrompt({
  vibe: provided,
  title = "Scan with VibeID",
  description = "Open VibeID on this phone, or scan the QR code with VibeID on another device.",
  className,
  style,
  qrOptions,
  showDownloadLink = true,
  downloadUrl = VIBE_ID_DOWNLOAD_URL,
  renderQr,
}: VibeIdSignInPromptProps) {
  const vibe = useOptionalVibeId(provided);
  const qr = useVibeIdQrCode(vibe.request?.deepLinkUrl, qrOptions);

  return (
    <div className={className} style={{ ...promptStyle, ...style }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.15 }}>{title}</h2>
        <p style={{ ...mutedTextStyle, marginTop: 8 }}>{description}</p>
      </div>

      <div style={qrFrameStyle}>
        {renderQr ? (
          renderQr(qr)
        ) : qr.dataUrl ? (
          <img
            src={qr.dataUrl}
            alt="VibeID sign-in QR code"
            style={{ display: "block", width: "100%", aspectRatio: "1 / 1", imageRendering: "crisp-edges" }}
          />
        ) : (
          <div style={{ ...mutedTextStyle, display: "grid", aspectRatio: "1 / 1", placeItems: "center", padding: 24 }}>
            {vibe.busy || qr.loading ? "Preparing sign-in..." : "Generate a QR code to start."}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <p style={mutedTextStyle}>
          {vibe.polling ? "Waiting for approval on your phone." : "No active VibeID request yet."}
        </p>
        {vibe.request?.relyingPartyOrigin ? (
          <p style={{ ...mutedTextStyle, wordBreak: "break-all" }}>Origin: {vibe.request.relyingPartyOrigin}</p>
        ) : null}
        {vibe.request?.requestId ? (
          <p style={{ ...mutedTextStyle, wordBreak: "break-all" }}>Request: {vibe.request.requestId}</p>
        ) : null}
        {vibe.error ? (
          <p style={{ ...mutedTextStyle, color: "#b91c1c" }}>{vibe.error}</p>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: vibe.request ? "1fr 1fr" : "1fr", gap: 8 }}>
        <button
          type="button"
          disabled={vibe.busy}
          style={{ ...buttonStyle, opacity: vibe.busy ? 0.65 : 1 }}
          onClick={() => void vibe.start()}
        >
          {vibe.request ? "Refresh QR" : "Generate QR"}
        </button>
        {vibe.request ? (
          <button type="button" style={secondaryButtonStyle} onClick={() => vibe.openVibeId()}>
            Open VibeID
          </button>
        ) : null}
      </div>

      {showDownloadLink && vibe.request ? (
        <a href={downloadUrl} style={{ ...mutedTextStyle, textAlign: "center", fontWeight: 700 }}>
          Get VibeID
        </a>
      ) : null}
    </div>
  );
}

export function VibeIdAvatarButton({
  vibe: provided,
  children,
  style,
  disabled,
  onClick,
  ...props
}: VibeIdAvatarButtonProps) {
  const vibe = useOptionalVibeId(provided);
  const initials = getVibeIdInitials(vibe.session);
  const avatarUrl = vibe.session?.profile?.avatarUrl;
  const avatarColor = vibe.session?.profile?.theme.avatarColor ?? "#bae6fd";
  const content = typeof children === "function" ? children(vibe.session) : children;

  return (
    <button
      {...props}
      type={props.type ?? "button"}
      disabled={disabled}
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: 44,
        height: 44,
        border: "2px solid #fff",
        borderRadius: 999,
        background: avatarColor,
        color: "#0f172a",
        fontWeight: 700,
        cursor: "pointer",
        overflow: "hidden",
        ...style,
      }}
      onClick={onClick}
      aria-label={props["aria-label"] ?? "Open VibeID profile"}
    >
      {content ??
        (avatarUrl ? (
          <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          initials
        ))}
    </button>
  );
}

export function VibeIdProfileMenu({
  vibe: provided,
  className,
  style,
  actions = [],
  showOrigin = true,
  showExpires = true,
  copyDidLabel = "Copy DID",
  copiedDidLabel = "Copied",
  logoutLabel = "Log out",
}: VibeIdProfileMenuProps) {
  const vibe = useOptionalVibeId(provided);
  const [copied, setCopied] = useState(false);
  const session = vibe.session;
  const displayName = getVibeIdDisplayName(session);
  const initials = getVibeIdInitials(session);
  const avatarUrl = session?.profile?.avatarUrl;
  const theme = session?.profile?.theme;

  if (!session) {
    return null;
  }

  return (
    <div className={className} style={{ ...menuStyle, ...style }}>
      <div style={{ display: "grid", justifyItems: "center", gap: 12, textAlign: "center" }}>
        <div
          style={{
            display: "grid",
            placeItems: "center",
            width: 84,
            height: 84,
            borderRadius: 999,
            background: theme?.avatarColor ?? "#bae6fd",
            boxShadow: `0 0 0 8px ${theme?.surfaceColor ?? "#e0f2fe"}`,
            fontSize: 34,
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: 999, objectFit: "cover" }} />
          ) : (
            initials
          )}
        </div>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 500 }}>{displayName}</h2>
        <button
          type="button"
          style={{ ...secondaryButtonStyle, minHeight: 36, padding: "0 14px" }}
          onClick={() => {
            void (async () => {
              await copyTextToClipboard(session.did);
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            })();
          }}
        >
          {copied ? copiedDidLabel : `${copyDidLabel}: ${getVibeIdIdentityKey(session.did)}`}
        </button>
      </div>

      {showOrigin || showExpires ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: showOrigin && showExpires ? "1fr 1fr" : "1fr",
            gap: 12,
            marginTop: 18,
            borderRadius: 18,
            background: "#f8fafc",
            padding: 14,
            fontSize: 13,
          }}
        >
          {showOrigin ? (
            <div>
              <p style={{ ...mutedTextStyle, marginBottom: 4, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em" }}>
                ORIGIN
              </p>
              <p style={{ margin: 0, wordBreak: "break-all", fontWeight: 700 }}>{session.origin}</p>
            </div>
          ) : null}
          {showExpires ? (
            <div>
              <p style={{ ...mutedTextStyle, marginBottom: 4, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em" }}>
                EXPIRES
              </p>
              <p style={{ margin: 0, fontWeight: 700 }}>{new Date(session.expiresAt).toLocaleString()}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {actions.length ? (
        <div style={{ display: "grid", gap: 8, marginTop: 18 }}>
          {actions.map((action, index) =>
            action.href ? (
              <a key={index} href={action.href} style={{ ...buttonStyle, display: "grid", placeItems: "center", textDecoration: "none" }}>
                {action.label}
              </a>
            ) : (
              <button key={index} type="button" style={buttonStyle} onClick={() => void action.onClick?.()}>
                {action.label}
              </button>
            ),
          )}
        </div>
      ) : null}

      <button
        type="button"
        disabled={vibe.busy}
        style={{ ...secondaryButtonStyle, width: "100%", marginTop: 18, opacity: vibe.busy ? 0.65 : 1 }}
        onClick={() => void vibe.logout()}
      >
        {logoutLabel}
      </button>
    </div>
  );
}
