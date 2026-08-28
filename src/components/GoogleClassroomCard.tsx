"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const STATUS_MESSAGES: Record<string, string> = {
  connected: "Google Classroom connected.",
  denied: "Google Classroom wasn't connected — permission was declined.",
  not_configured: "Google integration isn't configured on the server yet.",
  error: "Something went wrong connecting Google Classroom. Try again.",
};

export function GoogleClassroomCard({
  configured,
  connected,
  googleEmail,
  lastSyncedAt,
}: {
  configured: boolean;
  connected: boolean;
  googleEmail: string | null;
  lastSyncedAt: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [banner] = useState<string | null>(() => {
    const status = searchParams.get("classroom");
    const message = status ? STATUS_MESSAGES[status] : undefined;
    if (!message) return null;
    const syncFailed = searchParams.get("syncError") === "1";
    return syncFailed ? `${message} The first sync didn't complete — try Sync Now below.` : message;
  });
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (searchParams.get("classroom")) {
      router.replace("/school", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sync() {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const res = await fetch("/api/integrations/google/classroom/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSyncError(data.error ?? "Couldn't sync Google Classroom. Try again.");
        return;
      }
      setSyncResult(
        data.coursesSynced === 0
          ? "Your Google account is connected, but no Google Classroom courses were found."
          : `Synced ${data.coursesSynced} class${data.coursesSynced === 1 ? "" : "es"} and ${data.assignmentsSynced} assignment${data.assignmentsSynced === 1 ? "" : "s"}.`
      );
      router.refresh();
    } catch {
      setSyncError("Network error. Try again.");
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/google/classroom/disconnect", { method: "POST" });
      if (res.ok) {
        setConfirmingDisconnect(false);
        router.refresh();
      }
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <section className="card p-5 sm:p-6 mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="mono text-text-3">Connect your school</div>
        {connected && <span className="badge badge-live">Connected ✓</span>}
        {!connected && !configured && <span className="badge badge-demo">Not connected</span>}
      </div>

      {banner && (
        <p className="text-sm mb-4" style={{ color: "var(--text-2)" }}>
          {banner}
        </p>
      )}

      {!connected ? (
        <>
          <p className="text-text-2 text-sm mb-4">
            Bring your classes, assignments, and grades into MENTA.
          </p>
          {configured ? (
            <a href="/api/integrations/google/classroom/connect" className="btn-primary inline-flex">
              Connect Google Classroom
            </a>
          ) : (
            <p className="text-text-3 text-xs">
              An administrator needs to configure Google integration on the server before this can connect.
            </p>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <div className="text-sm">
            <span className="text-text-2">Google Classroom</span>
            {googleEmail && <span className="text-text-1 font-medium ml-2">{googleEmail}</span>}
          </div>
          <div className="text-text-3 text-xs">
            Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "Never yet — hit Sync Now."}
          </div>

          {syncResult && <p className="text-sm" style={{ color: "var(--text-2)" }}>{syncResult}</p>}
          {syncError && <p className="text-sm" style={{ color: "var(--danger)" }}>{syncError}</p>}

          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={sync} disabled={syncing}>
              {syncing ? "Syncing your classes…" : "Sync Now"}
            </button>
            {!confirmingDisconnect ? (
              <button
                type="button"
                className="text-xs text-text-3 hover:text-text-1"
                onClick={() => setConfirmingDisconnect(true)}
              >
                Disconnect
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-text-2">Disconnect Google Classroom?</span>
                <button
                  type="button"
                  className="text-xs"
                  style={{ color: "var(--danger)" }}
                  onClick={disconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? "Disconnecting…" : "Confirm"}
                </button>
                <button
                  type="button"
                  className="text-xs text-text-3 hover:text-text-1"
                  onClick={() => setConfirmingDisconnect(false)}
                  disabled={disconnecting}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
