import { IconQrcode, IconX } from "@tabler/icons-react";
import QRCode from "qrcode";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { ExtensionToSidebarMessage } from "../shared/session-grid-contract";

type T3BrowserAccessMessage = Extract<ExtensionToSidebarMessage, { type: "showT3BrowserAccess" }>;

export type T3BrowserAccessModalProps = {
  access: T3BrowserAccessMessage | undefined;
  isOpen: boolean;
  onClose: () => void;
  onOpenLink: (url: string) => void;
};

export function T3BrowserAccessModal({
  access,
  isOpen,
  onClose,
  onOpenLink,
}: T3BrowserAccessModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>();
  const [didCopy, setDidCopy] = useState(false);

  useEffect(() => {
    if (!isOpen || !access) {
      setQrCodeUrl(undefined);
      setDidCopy(false);
      return;
    }

    let cancelled = false;
    void QRCode.toDataURL(access.endpointUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 320,
    }).then((value) => {
      if (!cancelled) {
        setQrCodeUrl(value);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [access, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!didCopy) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setDidCopy(false);
    }, 1_500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [didCopy]);

  if (!isOpen || !access) {
    return null;
  }

  return createPortal(
    <div className="confirm-modal-root scroll-mask-y" role="presentation">
      <button className="confirm-modal-backdrop" onClick={onClose} type="button" />
      <div
        aria-labelledby="t3-browser-access-modal-title"
        aria-modal="true"
        className="confirm-modal t3-browser-access-modal scroll-mask-y"
        role="dialog"
      >
        <button
          aria-label="Close browser access modal"
          className="confirm-modal-close-button"
          onClick={onClose}
          type="button"
        >
          <IconX aria-hidden="true" className="toolbar-tabler-icon" stroke={1.8} />
        </button>
        <div className="confirm-modal-header confirm-modal-header-with-close">
          <div className="confirm-modal-title" id="t3-browser-access-modal-title">
            Remote Access
          </div>
        </div>
        <div className="t3-browser-access-body">
          <div className="t3-browser-access-qr-shell">
            {qrCodeUrl ? (
              <img
                alt={`QR code for ${access.sessionTitle || access.sessionId}`}
                className="t3-browser-access-qr"
                src={qrCodeUrl}
              />
            ) : (
              <div className="t3-browser-access-qr-placeholder">
                <IconQrcode aria-hidden="true" size={28} stroke={1.8} />
                Generating QR code…
              </div>
            )}
          </div>
          <div className="t3-browser-access-card">
            <div className="t3-browser-access-status-block">
              <div
                className="t3-browser-access-status-pill"
                data-enabled={String(access.tailscaleEnabled)}
              >
                {access.tailscaleEnabled ? "Tailscale Enabled" : "Tailscale Disabled"}
              </div>
              <div className="t3-browser-access-status-copy">
                {access.tailscaleEnabled
                  ? "Your phone or browser can use the share link once both devices are on your Tailnet."
                  : "Turn on Tailscale on this machine and your phone/browser if you want the share link to work outside your local network."}
              </div>
            </div>
            <div className="t3-browser-access-label">Share link</div>
            <div className="t3-browser-access-url">{access.endpointUrl}</div>
            <div className="t3-browser-access-note">{access.note}</div>
            <div className="t3-browser-access-guide">
              Use Tailscale on both devices so your phone/browser can reach this machine.{" "}
              <a href="https://tailscale.com/docs/install/start" target="_blank" rel="noreferrer">
                Setup guide
              </a>
            </div>
            <div className="t3-browser-access-guide">
              On Mac, Amphetamine can keep the machine awake and even help prevent sleep when the
              lid is closed.{" "}
              <a
                href="https://apps.apple.com/us/app/amphetamine/id937984704"
                target="_blank"
                rel="noreferrer"
              >
                Amphetamine
              </a>
            </div>
            <div className="t3-browser-access-tagline">
              Tailscale + Amphetamine = your own remote Claude/Codex setup.
            </div>
          </div>
        </div>
        <div className="confirm-modal-actions">
          <button
            className="secondary confirm-modal-button copy-cursor"
            onClick={() => {
              void navigator.clipboard.writeText(access.endpointUrl).then(() => {
                setDidCopy(true);
              });
            }}
            type="button"
          >
            {didCopy ? "Copied" : "Copy link"}
          </button>
          <button
            className="primary confirm-modal-button"
            onClick={() => onOpenLink(access.localUrl)}
            type="button"
          >
            Open link
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
