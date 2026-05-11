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
