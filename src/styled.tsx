import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  VIBE_ID_DOWNLOAD_URL,
  copyTextToClipboard,
  getVibeIdDisplayName,
  getVibeIdIdentityKey,
  getVibeIdInitials,
  useOptionalVibeId,
  useVibeIdQrCode,
  useVibeIdSignIn,
  type VibeIdQrCodeOptions,
  type VibeIdSession,
  type VibeIdSignInOptions,
  type VibeIdSignInState,
  type VibeIdStartOptions,
} from "./index.js";

export type VibeIdButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  vibe?: VibeIdSignInState;
  label?: ReactNode;
  meta?: ReactNode | false;
  openAppOnMobile?: boolean;
  startOptions?: VibeIdStartOptions;
  children?: ReactNode | ((state: VibeIdSignInState) => ReactNode);
};

export type VibeIdPromptProps = {
  vibe?: VibeIdSignInState;
  title?: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  className?: string;
  style?: CSSProperties;
  qrOptions?: VibeIdQrCodeOptions;
  showHandle?: boolean;
  showClose?: boolean;
  showDownloadLink?: boolean;
  downloadUrl?: string;
  closeLabel?: string;
  onClose?: () => void;
  renderQr?: (state: ReturnType<typeof useVibeIdQrCode>) => ReactNode;
  footer?: ReactNode | ((state: VibeIdSignInState) => ReactNode);
};

export type VibeIdSignInProps = {
  vibe?: VibeIdSignInState;
  options?: VibeIdSignInOptions;
  buttonProps?: Omit<VibeIdButtonProps, "vibe">;
  promptProps?: Omit<VibeIdPromptProps, "vibe" | "onClose">;
  modal?: boolean;
  openAppOnMobile?: boolean;
  onAuthenticated?: (session: VibeIdSession) => void;
};

export type VibeIdIdentityMenuAction = {
  label: ReactNode;
  href?: string;
  onClick?: () => void | Promise<void>;
};

export type VibeIdIdentityMenuProps = {
  vibe?: VibeIdSignInState;
  options?: VibeIdSignInOptions;
  className?: string;
  triggerClassName?: string;
  signedOutTriggerClassName?: string;
  signedInTriggerClassName?: string;
  panelClassName?: string;
  style?: CSSProperties;
  signInLabel?: ReactNode;
  accountHref?: string;
  accountLabel?: ReactNode;
  logoutLabel?: ReactNode;
  copyDidLabel?: ReactNode;
  copiedDidLabel?: ReactNode;
  promptTitle?: ReactNode;
  promptDescription?: ReactNode;
  showToast?: boolean;
  actions?: VibeIdIdentityMenuAction[];
  onAuthenticated?: (session: VibeIdSession) => void;
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function VibeIdButton({
  vibe: provided,
  label = "Continue with VibeID",
  meta = false,
  openAppOnMobile = true,
  startOptions,
  children,
  className,
  disabled,
  onClick,
  ...props
}: VibeIdButtonProps) {
  const vibe = useOptionalVibeId(provided);
  const content =
    typeof children === "function" ? (
      children(vibe)
    ) : (
      children ?? (
        <>
          <span className="vibe-id-button__label">
            <VibeIdMark />
            <span className="vibe-id-button__text">{label}</span>
          </span>
          {meta ? (
            <span className="vibe-id-button__meta">{vibe.polling ? "Waiting" : meta}</span>
          ) : null}
        </>
      )
    );

  return (
    <button
      {...props}
      type={props.type ?? "button"}
      disabled={disabled ?? vibe.busy}
      className={cx("vibe-id-button", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          void vibe.start({ openAppOnMobile, ...startOptions });
        }
      }}
    >
      {content}
    </button>
  );
}

export function VibeIdPrompt({
  vibe: provided,
  title = "Approve sign-in",
  eyebrow = "VibeID",
  description = "Scan with VibeID, or open the app on this device.",
  className,
  style,
  qrOptions,
  showHandle = true,
  showClose = true,
  showDownloadLink = true,
  downloadUrl = VIBE_ID_DOWNLOAD_URL,
  closeLabel = "Close",
  onClose,
  renderQr,
  footer,
}: VibeIdPromptProps) {
  const vibe = useOptionalVibeId(provided);
  const qr = useVibeIdQrCode(vibe.request?.deepLinkUrl, {
    margin: 1,
    darkColor: "#18181b",
    ...qrOptions,
  });
  const footerContent = typeof footer === "function" ? footer(vibe) : footer;

  return (
    <section className={cx("vibe-id-prompt", className)} style={style} aria-live="polite">
      {showHandle ? <div className="vibe-id-prompt__handle" /> : null}
      <div className="vibe-id-prompt__header">
        <div>
          {eyebrow ? <p className="vibe-id-prompt__eyebrow">{eyebrow}</p> : null}
          <h2 className="vibe-id-prompt__title">{title}</h2>
          {description ? <p className="vibe-id-prompt__description">{description}</p> : null}
        </div>
        {showClose ? (
          <button
            type="button"
            className="vibe-id-prompt__close"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>

      <div className="vibe-id-prompt__body">
        <div className="vibe-id-prompt__qr">
          {renderQr ? (
            renderQr(qr)
          ) : qr.dataUrl ? (
            <img src={qr.dataUrl} alt="VibeID sign-in QR code" />
          ) : (
            <div className="vibe-id-prompt__placeholder">
              {qr.loading || vibe.busy ? "Preparing sign-in..." : "Generate a QR code to start."}
            </div>
          )}
        </div>

        <div className="vibe-id-prompt__status">
          <p>
            {vibe.polling
              ? "Waiting for approval in VibeID."
              : "Scan with VibeID or open the app on this device."}
          </p>
          {vibe.request?.relyingPartyOrigin ? (
            <p className="vibe-id-prompt__meta">Origin: {vibe.request.relyingPartyOrigin}</p>
          ) : null}
          {vibe.error ? <p className="vibe-id-prompt__error">{vibe.error}</p> : null}
        </div>

        <div className="vibe-id-prompt__actions">
          <button
            type="button"
            className="vibe-id-prompt__primary"
            disabled={vibe.busy || !vibe.request}
            onClick={() => {
              vibe.openVibeId();
            }}
          >
            Open VibeID
          </button>
          <button
            type="button"
            className="vibe-id-prompt__secondary"
            disabled={vibe.busy}
            onClick={() => void vibe.start()}
          >
            Refresh QR
          </button>
        </div>

        {showDownloadLink ? (
          <a className="vibe-id-prompt__download" href={downloadUrl}>
            Get VibeID
          </a>
        ) : null}

        {footerContent}
      </div>
    </section>
  );
}

export function VibeIdSignIn({
  vibe: provided,
  options,
  buttonProps,
  promptProps,
  modal = true,
  openAppOnMobile = true,
  onAuthenticated,
}: VibeIdSignInProps) {
  const ownedVibe = useVibeIdSignIn(options);
  const vibe = provided ?? ownedVibe;
  const [promptOpen, setPromptOpen] = useState(false);
  const wasPendingRef = useRef(false);

  useEffect(() => {
    if (vibe.phase === "pending") {
      wasPendingRef.current = true;
      return;
    }

    if (vibe.phase === "authenticated" && vibe.session && wasPendingRef.current) {
      wasPendingRef.current = false;
      setPromptOpen(false);
      onAuthenticated?.(vibe.session);
    }
  }, [onAuthenticated, vibe.phase, vibe.session]);

  const prompt = promptOpen ? (
    <VibeIdPrompt
      {...promptProps}
      vibe={vibe}
      onClose={() => {
        setPromptOpen(false);
        vibe.cancel();
      }}
    />
  ) : null;

  return (
    <>
      <VibeIdButton
        {...buttonProps}
        vibe={vibe}
        openAppOnMobile={buttonProps?.openAppOnMobile ?? openAppOnMobile}
        onClick={(event) => {
          buttonProps?.onClick?.(event);
          if (!event.defaultPrevented) {
            setPromptOpen(true);
          }
        }}
      />
      {modal && prompt ? <div className="vibe-id-prompt-backdrop">{prompt}</div> : prompt}
    </>
  );
}

export function VibeIdIdentityMenu({
  vibe: provided,
  options,
  className,
  triggerClassName,
  signedOutTriggerClassName,
  signedInTriggerClassName,
  panelClassName,
  style,
  signInLabel = "Sign in",
  accountHref = "/account",
  accountLabel = "Open protected page",
  logoutLabel = "Log out",
  copyDidLabel = "Copy DID",
  copiedDidLabel = "Copied",
  promptTitle = "Scan with VibeID",
  promptDescription = "Open VibeID on this phone, or scan the QR code with VibeID on another device.",
  showToast = true,
  actions = [],
  onAuthenticated,
}: VibeIdIdentityMenuProps) {
  const ownedVibe = useVibeIdSignIn(options);
  const vibe = provided ?? ownedVibe;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const wasPendingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [copiedDid, setCopiedDid] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (vibe.phase === "pending") {
      wasPendingRef.current = true;
      return;
    }

    if (vibe.phase === "authenticated" && vibe.session && wasPendingRef.current) {
      wasPendingRef.current = false;
      setToastVisible(showToast);
      onAuthenticated?.(vibe.session);
    }
  }, [onAuthenticated, showToast, vibe.phase, vibe.session]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  async function openMenu() {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (!nextOpen || vibe.session || vibe.request || vibe.busy || vibe.polling) {
      return;
    }

    const currentSession = await vibe.refreshSession();
    if (!currentSession) {
      await vibe.start({ openAppOnMobile: true });
    }
  }

  const session = vibe.session;
  const identity = session ? createIdentitySummary(session) : null;

  return (
    <div className={cx("vibe-id-identity-menu", className)} style={style} ref={rootRef}>
      <button
        type="button"
        className={cx(
          session ? "vibe-id-identity-trigger vibe-id-identity-trigger--avatar" : "vibe-id-identity-trigger",
          triggerClassName,
          session ? signedInTriggerClassName : signedOutTriggerClassName,
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={session ? "Open VibeID identity" : "Sign in with VibeID"}
        style={identity ? { backgroundColor: identity.theme.avatar } : undefined}
        onClick={() => void openMenu()}
      >
        {identity?.avatarUrl ? (
          <img src={identity.avatarUrl} alt="" />
        ) : identity ? (
          identity.initials
        ) : vibe.polling ? (
          "Waiting..."
        ) : (
          signInLabel
        )}
      </button>

      {toastVisible && session ? (
        <div className="vibe-id-identity-toast">
          <span>You&apos;ve been signed in.</span>
          <button
            type="button"
            aria-label="Dismiss sign-in message"
            onClick={() => setToastVisible(false)}
          >
            <CloseIcon />
          </button>
        </div>
      ) : null}

      {open ? (
        <>
          <button
            type="button"
            className="vibe-id-identity-scrim"
            aria-label="Close VibeID menu"
            onClick={() => setOpen(false)}
          />
          <div className={cx("vibe-id-identity-panel", panelClassName)} role="dialog">
            <div className="vibe-id-identity-panel__chrome">
              <span className="vibe-id-identity-panel__handle" aria-hidden="true" />
              <button
                type="button"
                className="vibe-id-identity-panel__close"
                aria-label="Close VibeID menu"
                onClick={() => setOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>

            {identity ? (
              <div className="vibe-id-identity-profile">
                <div
                  className="vibe-id-identity-cover"
                  style={{
                    background: `linear-gradient(135deg, ${identity.theme.start} 0%, ${identity.theme.accent} 54%, ${identity.theme.end} 100%)`,
                  }}
                >
                  <div className="vibe-id-identity-cover__orb vibe-id-identity-cover__orb--left" />
                  <div className="vibe-id-identity-cover__orb vibe-id-identity-cover__orb--right" />
                  <svg
                    viewBox="0 -61 430 61"
                    preserveAspectRatio="none"
                    className="vibe-id-identity-cover__wave"
                    aria-hidden="true"
                  >
                    <path d="M0-11C74-47 166-61 248-45c74 16 136 48 182 38v7H0Z" fill="white" />
                  </svg>
                </div>

                <div className="vibe-id-identity-profile__body">
                  <div
                    className="vibe-id-identity-avatar"
                    style={{
                      backgroundColor: identity.theme.avatar,
                      boxShadow: `0 0 0 8px ${identity.theme.halo}`,
                    }}
                  >
                    {identity.avatarUrl ? <img src={identity.avatarUrl} alt="" /> : identity.initials}
                  </div>
                  <h2 className="vibe-id-identity-name">{identity.displayName}</h2>
                  <button
                    type="button"
                    className="vibe-id-identity-chip"
                    aria-label={copiedDid ? "DID copied" : "Copy DID"}
                    onClick={() => {
                      void (async () => {
                        const copied = await copyTextToClipboard(identity.did);
                        if (copied) {
                          setCopiedDid(true);
                          setTimeout(() => setCopiedDid(false), 1400);
                        }
                      })();
                    }}
                  >
                    <KeyIcon />
                    <span>{copiedDid ? copiedDidLabel : identity.key}</span>
                  </button>

                  <div className="vibe-id-identity-meta">
                    <div>
                      <p>Origin</p>
                      <strong>{identity.origin}</strong>
                    </div>
                    <div>
                      <p>Expires</p>
                      <strong>{new Date(identity.expiresAt).toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="vibe-id-identity-actions">
                    {accountHref ? (
                      <a className="vibe-id-identity-primary" href={accountHref}>
                        {accountLabel}
                      </a>
                    ) : null}
                    {actions.map((action, index) =>
                      action.href ? (
                        <a className="vibe-id-identity-secondary" href={action.href} key={index}>
                          {action.label}
                        </a>
                      ) : (
                        <button
                          className="vibe-id-identity-secondary"
                          type="button"
                          key={index}
                          onClick={() => void action.onClick?.()}
                        >
                          {action.label}
                        </button>
                      ),
                    )}
                    <button
                      className="vibe-id-identity-secondary"
                      type="button"
                      disabled={vibe.busy}
                      onClick={() => {
                        void (async () => {
                          const loggedOut = await vibe.logout();
                          if (loggedOut) {
                            setToastVisible(false);
                          }
                        })();
                      }}
                    >
                      {logoutLabel}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <VibeIdPrompt
                vibe={vibe}
                className="vibe-id-identity-prompt"
                showHandle={false}
                showClose={false}
                title={promptTitle}
                description={promptDescription}
              />
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function createIdentitySummary(session: VibeIdSession) {
  const fallbackTheme = identityTheme(session.did);
  const profileTheme = session.profile?.theme;

  return {
    did: session.did,
    displayName: getVibeIdDisplayName(session),
    initials: getVibeIdInitials(session),
    key: getVibeIdIdentityKey(session.did),
    origin: session.origin,
    expiresAt: session.expiresAt,
    avatarUrl: session.profile?.avatarUrl ?? null,
    theme: profileTheme
      ? {
          avatar: profileTheme.avatarColor,
          halo: profileTheme.surfaceColor,
          start: profileTheme.startColor,
          accent: profileTheme.accentColor,
          end: profileTheme.endColor,
        }
      : fallbackTheme,
  };
}

function identityTheme(did: string) {
  const palettes = [
    { avatar: "#8DDFFF", halo: "#EAF3FF", start: "#07162E", accent: "#375AF6", end: "#67E7FF" },
    { avatar: "#CAB9FF", halo: "#F3EEFF", start: "#21154C", accent: "#8856FF", end: "#66D7FF" },
    { avatar: "#FFD6A6", halo: "#FFF3E7", start: "#3E1F19", accent: "#FF6E5F", end: "#FFC86B" },
    { avatar: "#A5F0D7", halo: "#E7FFF8", start: "#092B29", accent: "#00A98F", end: "#7BF9D9" },
  ];

  let hash = 0;
  for (let index = 0; index < did.length; index += 1) {
    hash = (hash * 31 + did.charCodeAt(index)) >>> 0;
  }

  return palettes[hash % palettes.length];
}

function VibeIdMark() {
  return (
    <span className="vibe-id-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path
          fill="none"
          stroke="#ff2ea6"
          strokeLinecap="round"
          strokeWidth="2.2"
          d="M3.5 6.5c3.5 0 4.4 11 8.5 11"
        />
        <path
          fill="none"
          stroke="#6d5dfc"
          strokeLinecap="round"
          strokeWidth="2.2"
          d="M6.5 5.5c2.6 0 3.1 9 5.5 9s2.9-9 5.5-9"
        />
        <path
          fill="none"
          stroke="#05c7f2"
          strokeLinecap="round"
          strokeWidth="2.2"
          d="M20.5 6.5c-3.5 0-4.4 11-8.5 11"
        />
      </svg>
    </span>
  );
}

function KeyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <path
        d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path
        d="m6 6 12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}
