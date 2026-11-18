"use client";
import { useId, useRef, useState } from "react";
import LoadError from "@/app/components/LoadError";
import { useFormState } from "@/app/context/FormProvider";
import { API_TOKEN_RULES } from "@/app/contracts/common";
import type { ApiToken } from "@/app/contracts/responses";
import type { ToastController } from "@/hooks/toastController";
import { focusFallback } from "@/lib/focusFallback";
import { mcpServerUrl } from "@/lib/mcpSetup";
import { activeCount, useApiTokens, useRevokeApiToken } from "@/lib/query/apiTokens";
import { isEmptyList } from "@/lib/query/emptiness";
import { loadStateOf } from "@/lib/query/loadState";
import { settled } from "@/lib/query/unwrap";
import CopyButton from "./CopyButton";
import CreateTokenDialog, { type NewToken } from "./CreateTokenDialog";
import RevokeTokenDialog from "./RevokeTokenDialog";
import TokenCreatedDialog from "./TokenCreatedDialog";
import { LIMIT_REACHED_COPY, STATUS_LABEL, tokenDate } from "./tokenCopy";

// Read once at build time, like every other use of the public API URL.
const SERVER_URL = mcpServerUrl(process.env.NEXT_PUBLIC_API_URL);

const STATUS_CLASS: Record<ApiToken["status"], string> = {
  active: "bg-green-100 text-green-800",
  expired: "bg-gray-200 text-gray-700",
  revoked: "bg-red-100 text-red-800",
};

/** FEAT-07 "Connect an AI assistant": server URL, the token list, create and revoke. */
export default function ApiTokensSection({ toast }: { toast: ToastController }) {
  const { userData } = useFormState();
  const dark = userData?.theme === "dark";
  const query = useApiTokens();
  const state = loadStateOf(query, isEmptyList);
  const revoke = useRevokeApiToken();
  const [creating, setCreating] = useState(false);
  /** The new secret, in memory only until the "created" dialog closes. */
  const [created, setCreated] = useState<NewToken | null>(null);
  const [revoking, setRevoking] = useState<ApiToken | null>(null);
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  const tokens = state.status === "ready" ? state.data : [];
  const full = activeCount(tokens) >= API_TOKEN_RULES.maxActive;
  const muted = dark ? "text-gray-300" : "text-[#676767]";
  const border = dark ? "border-gray-800" : "border-gray-100";

  const confirmRevoke = async (token: ApiToken) => {
    setRevoking(null);
    // The row's Revoke button goes away at once (optimistic), so focus needs somewhere to land.
    focusFallback(headingRef);
    const result = await settled(revoke.mutateAsync(token.id));
    if (result.ok) toast.success("Token revoked", "Any assistant using it has stopped working");
    else toast.failure(result.failure);
  };

  return (
    <section
      aria-labelledby={headingId}
      className={`flex flex-col gap-4 rounded-[10px] p-5 ${dark ? "bg-foreground-dark border border-gray-800 text-white" : "bg-white text-text"}`}
    >
      <div className="flex flex-col gap-1">
        <h2 ref={headingRef} tabIndex={-1} id={headingId} className="font-lato text-2xl text-primary-default outline-none">
          Connect an AI assistant
        </h2>
        <p className={`font-lato text-[13px] ${dark ? "text-white" : "text-text"}`}>
          Your AI assistant (Claude Code, Cursor and others) can read and manage your tasks and projects. Deletes can be
          recovered. Treat a token like a password: anyone who has it can use your account through an assistant.
        </p>
      </div>

      {SERVER_URL && (
        <div className="flex flex-col gap-1">
          <div className="flex items-end justify-between gap-2">
            <label htmlFor={`${headingId}-url`} className="font-lato text-base">
              Server URL
            </label>
            <CopyButton text={SERVER_URL} what="the server URL" target={urlRef} dark={dark} />
          </div>
          <input
            ref={urlRef}
            id={`${headingId}-url`}
            readOnly
            value={SERVER_URL}
            onFocus={(e) => e.currentTarget.select()}
            className={`w-full rounded-md border px-2 py-2 font-mono text-xs ${dark ? "border-gray-800 bg-black/30 text-white" : "border-[#E0E0E0] bg-[#F7F7F7] text-text"}`}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-lato text-lg font-bold">Your tokens</h3>
        <button
          ref={createButtonRef}
          type="button"
          onClick={() => setCreating(true)}
          disabled={full}
          className="rounded-[5px] bg-primary-default px-4 py-2 font-lato text-sm font-bold text-white transition-colors hover:bg-primary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Create token
        </button>
      </div>
      {full && <p className={`font-lato text-xs ${muted}`}>{LIMIT_REACHED_COPY}</p>}

      {state.status === "loading" ? (
        <p role="status" className={`font-lato text-sm ${muted}`}>
          Loading your tokens…
        </p>
      ) : state.status === "error" ? (
        <LoadError
          widget="your tokens"
          failure={state.failure}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
          theme={userData?.theme}
        />
      ) : state.status === "empty" ? (
        <p className={`font-lato text-sm ${muted}`}>No tokens yet.</p>
      ) : (
        <>
          {state.refreshFailure && (
            <LoadError
              widget="your tokens"
              failure={state.refreshFailure}
              onRetry={() => void query.refetch()}
              retrying={query.isFetching}
              theme={userData?.theme}
              variant="compact"
            />
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse font-lato text-sm">
              <caption className="sr-only">Your personal access tokens</caption>
              <thead>
                <tr className={`border-b text-left ${border} ${muted}`}>
                  <th scope="col" className="py-2 pr-3 font-normal">Name</th>
                  <th scope="col" className="py-2 pr-3 font-normal">Created</th>
                  <th scope="col" className="py-2 pr-3 font-normal">Last used</th>
                  <th scope="col" className="py-2 pr-3 font-normal">Expires</th>
                  <th scope="col" className="py-2 pr-3 font-normal">Status</th>
                  <th scope="col" className="py-2 font-normal"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => (
                  <tr key={t.id} className={`border-b last:border-b-0 ${border}`}>
                    <th scope="row" className="max-w-[200px] truncate py-2 pr-3 text-left font-bold" title={t.name}>
                      {t.name}
                    </th>
                    <td className="whitespace-nowrap py-2 pr-3">{tokenDate(t.created_at)}</td>
                    <td className="whitespace-nowrap py-2 pr-3">{tokenDate(t.last_used_at)}</td>
                    <td className="whitespace-nowrap py-2 pr-3">{tokenDate(t.expires_at)}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_CLASS[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                    </td>
                    <td className="py-2 text-right">
                      {t.status === "active" && (
                        <button
                          type="button"
                          onClick={() => setRevoking(t)}
                          aria-label={`Revoke ${t.name}`}
                          className="rounded-[5px] border border-error-default px-3 py-1 text-xs text-error-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className={`font-lato text-xs ${muted}`}>
        Using claude.ai, the Claude desktop or phone app? Connector sign-in is coming soon.
      </p>

      {creating && (
        <CreateTokenDialog
          dark={dark}
          toast={toast}
          onClose={() => setCreating(false)}
          onCreated={(c) => {
            setCreating(false);
            setCreated(c);
          }}
        />
      )}
      {created && (
        <TokenCreatedDialog
          created={created}
          serverUrl={SERVER_URL}
          onClose={() => setCreated(null)}
          returnFocus={createButtonRef}
          dark={dark}
        />
      )}
      {revoking && (
        <RevokeTokenDialog
          token={revoking}
          dark={dark}
          onCancel={() => setRevoking(null)}
          onConfirm={() => void confirmRevoke(revoking)}
        />
      )}
    </section>
  );
}
