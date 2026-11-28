"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import LoadError from "@/app/components/LoadError";
import type { OAuthCheckOk } from "@/app/contracts/responses";
import type { OAuthDecision } from "@/app/contracts/requests";
import { consentPathOf, isFatalConsentFailure, isSafeRedirectTarget, readAuthorizeParams } from "@/lib/oauthConsent";
import { clearQueryCache } from "@/lib/query/client";
import { loadStateOf } from "@/lib/query/loadState";
import { useOAuthCheck, useOAuthDecision } from "@/lib/query/oauth";
import { useProfile } from "@/lib/query/queries";
import { settled } from "@/lib/query/unwrap";
import { withNext } from "@/lib/safeNext";

/** What an approved app can do. Fixed copy: it describes the `mcp` scope, whatever the app asks. */
export const CONSENT_CAPABILITIES = [
  "Read your tasks, projects, dashboard, notifications and project chats",
  "Create and edit tasks and projects",
  "Delete them (deleted items can be recovered)",
] as const;

export const INVALID_REQUEST_COPY =
  "This connection request isn't valid. Close this tab and try connecting again from your app.";

const LOOPBACK_WARNING = "This is an app running on your own computer. Only continue if you started it.";

/** The login page's card, centered on the auth panel's gradient (theme tokens). No sidebar. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-th-auth-a to-th-auth-b p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-th-card p-8 font-lato text-th-ink shadow-md">{children}</div>
    </main>
  );
}

function InvalidRequest() {
  return (
    <Frame>
      <h1 className="text-center text-2xl font-bold text-th-acc-t">Can&apos;t connect this app</h1>
      <p role="alert" className="text-center text-th-ink-body">
        {INVALID_REQUEST_COPY}
      </p>
    </Frame>
  );
}

function Busy({ text }: { text: string }) {
  return (
    <Frame>
      <div role="status" className="flex flex-col items-center gap-3 text-center text-th-ink-body">
        <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-th-acc-t" />
        <p>{text}</p>
      </div>
    </Frame>
  );
}

/**
 * The consent screen. The check result is display only: Allow and Deny re-send the raw query
 * parameters, and the backend validates them again. The browser leaves only for a URL that
 * passes `isSafeRedirectTarget`.
 */
export default function ConsentView() {
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const read = useMemo(() => readAuthorizeParams(search), [search]);
  const params = read.ok ? read.params : null;

  const check = useOAuthCheck(params);
  const state = loadStateOf(check, () => false);
  const profile = useProfile();
  const decision = useOAuthDecision();

  const [leaving, setLeaving] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const leaveTo = (url: unknown) => {
    if (!isSafeRedirectTarget(url)) {
      setInvalid(true);
      return;
    }
    setLeaving(true);
    window.location.assign(url);
  };

  // A request the backend says is wrong for a known app: it built the error redirect for us.
  const redirectTo = state.status === "ready" && state.data.outcome === "redirect" ? state.data.redirect_to : null;
  useEffect(() => {
    if (redirectTo === null) return;
    if (isSafeRedirectTarget(redirectTo)) window.location.assign(redirectTo);
    else setInvalid(true);
  }, [redirectTo]);

  const decide = async (choice: OAuthDecision) => {
    if (!params || decision.isPending || leaving) return;
    setSendError(null);
    const result = await settled(decision.mutateAsync({ params, decision: choice }));
    if (result.ok) {
      leaveTo(result.data.redirect_to);
      return;
    }
    const f = result.failure;
    if (f.kind === "aborted" || f.kind === "unauthorized") return; // the app is going to /login
    if (isFatalConsentFailure(f)) {
      setInvalid(true);
      return;
    }
    setSendError(
      f.status === 429
        ? "Too many attempts. Wait a minute and try again."
        : "Couldn't send your answer. Check your connection and try again. If our server was asleep, it can take a minute to wake up."
    );
  };

  const signOut = async () => {
    const back = consentPathOf(window.location.search);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The logout route clears the cookies; a failed call still leaves for the login page.
    }
    clearQueryCache(); // never show this session's data to the next one
    window.location.href = withNext("/login", back);
  };

  if (!read.ok || invalid) return <InvalidRequest />;
  if (leaving || redirectTo !== null) return <Busy text="Returning you to the app…" />;

  if (state.status === "loading") {
    return <Busy text="Checking the connection request… If our server was asleep, this can take up to a minute." />;
  }
  if (state.status === "error") {
    if (isFatalConsentFailure(state.failure)) return <InvalidRequest />;
    return (
      <Frame>
        <LoadError
          widget="the connection request"
          failure={state.failure}
          onRetry={() => void check.refetch()}
          retrying={check.isFetching}
        />
      </Frame>
    );
  }
  const data = state.status === "ready" ? state.data : null;
  if (!data || data.outcome !== "ok") return <InvalidRequest />;

  return (
    <ConsentScreen
      app={data}
      username={profile.data?.username}
      pending={decision.isPending}
      pendingChoice={decision.variables?.decision}
      sendError={sendError}
      onDecide={(c) => void decide(c)}
      onSignOut={() => void signOut()}
    />
  );
}

interface ConsentScreenProps {
  app: OAuthCheckOk;
  username: string | undefined;
  pending: boolean;
  pendingChoice: OAuthDecision | undefined;
  sendError: string | null;
  onDecide: (choice: OAuthDecision) => void;
  onSignOut: () => void;
}

function ConsentScreen({ app, username, pending, pendingChoice, sendError, onDecide, onSignOut }: ConsentScreenProps) {
  return (
    <Frame>
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-th-acc-t">
          <span className="break-words">{app.client_name}</span> wants to access your Get It Done account
        </h1>
        <p className="text-xs text-th-ink-dim">The app name is provided by the app.</p>
      </div>

      <p className="text-sm text-th-task">
        You&apos;ll be sent back to <strong className="break-all">{app.redirect_host}</strong>
      </p>

      {app.loopback_only && (
        <p role="note" className="rounded-md border border-th-note-line bg-th-note-bg p-3 text-sm text-th-note-t">
          {LOOPBACK_WARNING}
        </p>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-th-ink-hd">It will be able to:</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-th-task">
          {CONSENT_CAPABILITIES.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-th-ink-body">
        Signed in as <strong>{username ?? "…"}</strong>.{" "}
        <button
          type="button"
          onClick={onSignOut}
          disabled={pending}
          className="font-medium text-th-acc-t underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus disabled:opacity-60"
        >
          Not you? Sign out
        </button>
      </p>

      {sendError && (
        <p role="alert" className="rounded-lg bg-th-alert-bg p-3 text-sm text-th-alert-t">
          {sendError}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onDecide("deny")}
          disabled={pending}
          className="h-10 flex-1 rounded-sm border border-th-line font-medium text-th-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending && pendingChoice === "deny" ? "Denying…" : "Deny"}
        </button>
        <button
          type="button"
          onClick={() => onDecide("allow")}
          disabled={pending}
          className="h-10 flex-1 rounded-sm bg-gradient-to-r from-th-acc to-th-acc-soft font-medium text-th-on-acc shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending && pendingChoice === "allow" ? "Allowing…" : "Allow"}
        </button>
      </div>
    </Frame>
  );
}
