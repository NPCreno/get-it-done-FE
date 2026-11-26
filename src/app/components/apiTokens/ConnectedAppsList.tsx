"use client";
import { useId, useRef, useState } from "react";
import LoadError from "@/app/components/LoadError";
import type { OAuthGrant } from "@/app/contracts/responses";
import type { ToastController } from "@/hooks/toastController";
import { focusFallback } from "@/lib/focusFallback";
import { isEmptyList } from "@/lib/query/emptiness";
import { loadStateOf } from "@/lib/query/loadState";
import { useOAuthGrants, useRevokeOAuthGrant } from "@/lib/query/oauth";
import { settled } from "@/lib/query/unwrap";
import DisconnectAppDialog from "./DisconnectAppDialog";
import { NO_CONNECTED_APPS_COPY, tokenDate } from "./tokenCopy";

interface ConnectedAppsListProps {
  toast: ToastController;
  dark: boolean;
}

/**
 * FEAT-07d "Connected apps": apps the user approved on the consent page (claude.ai and other MCP
 * clients). Disconnect revokes the grant and every token issued under it.
 */
export default function ConnectedAppsList({ toast, dark }: ConnectedAppsListProps) {
  const query = useOAuthGrants();
  const state = loadStateOf(query, isEmptyList);
  const revoke = useRevokeOAuthGrant();
  const [disconnecting, setDisconnecting] = useState<OAuthGrant | null>(null);
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const muted = dark ? "text-gray-300" : "text-[#676767]";
  const border = dark ? "border-gray-800" : "border-gray-100";

  const confirmDisconnect = async (grant: OAuthGrant) => {
    setDisconnecting(null);
    // The row goes at once (optimistic), so focus needs somewhere to land.
    focusFallback(headingRef);
    const result = await settled(revoke.mutateAsync(grant.id));
    if (result.ok) toast.success("App disconnected", "It stops working until you connect it again");
    else toast.failure(result.failure);
  };

  return (
    <div className="flex flex-col gap-2" aria-labelledby={headingId} role="group">
      <h3 ref={headingRef} tabIndex={-1} id={headingId} className="font-lato text-lg font-bold outline-none">
        Connected apps
      </h3>

      {state.status === "loading" ? (
        <p role="status" className={`font-lato text-sm ${muted}`}>
          Loading your connected apps…
        </p>
      ) : state.status === "error" ? (
        <LoadError
          widget="your connected apps"
          failure={state.failure}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
          dark={dark}
        />
      ) : state.status === "empty" ? (
        <p className={`font-lato text-sm ${muted}`}>{NO_CONNECTED_APPS_COPY}</p>
      ) : (
        <>
          {state.refreshFailure && (
            <LoadError
              widget="your connected apps"
              failure={state.refreshFailure}
              onRetry={() => void query.refetch()}
              retrying={query.isFetching}
              dark={dark}
              variant="compact"
            />
          )}
          <ul className="flex flex-col font-lato text-sm">
            {state.data.map((g) => (
              <li key={g.id} className={`flex flex-wrap items-center justify-between gap-3 border-b py-2 last:border-b-0 ${border}`}>
                <div className="min-w-0">
                  <p className="truncate font-bold" title={g.client_name}>
                    {g.client_name}
                  </p>
                  <p className={`text-xs ${muted}`}>
                    Returns to <span className="break-all">{g.redirect_host}</span> · Connected {tokenDate(g.created_at)} ·
                    Last used {tokenDate(g.last_used_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDisconnecting(g)}
                  aria-label={`Disconnect ${g.client_name}`}
                  className="rounded-[5px] border border-error-default px-3 py-1 text-xs text-error-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default"
                >
                  Disconnect
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {disconnecting && (
        <DisconnectAppDialog
          grant={disconnecting}
          dark={dark}
          onCancel={() => setDisconnecting(null)}
          onConfirm={() => void confirmDisconnect(disconnecting)}
        />
      )}
    </div>
  );
}
