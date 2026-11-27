"use client";
import { useId, useRef, type RefObject } from "react";
import { claudeCodeCommand, cursorConfig } from "@/lib/mcpSetup";
import CopyButton from "./CopyButton";
import type { NewToken } from "./CreateTokenDialog";
import TokenDialogShell from "./TokenDialogShell";

interface TokenCreatedDialogProps {
  created: NewToken;
  serverUrl: string;
  /** Drops the token: the section clears its state. */
  onClose: () => void;
  /** Where focus goes after closing (the opener, the create dialog, is gone by then). */
  returnFocus: RefObject<HTMLElement | null>;
}

/** Shown once, right after a create. The token is in React state only, until this closes. */
export default function TokenCreatedDialog({ created, serverUrl, onClose, returnFocus }: TokenCreatedDialogProps) {
  const tokenRef = useRef<HTMLInputElement>(null);
  const claudeRef = useRef<HTMLPreElement>(null);
  const cursorRef = useRef<HTMLPreElement>(null);
  const tokenLabelId = useId();
  const warningId = useId();
  const claude = serverUrl ? claudeCodeCommand(serverUrl, created.token) : "";
  const cursor = serverUrl ? cursorConfig(serverUrl, created.token) : "";
  const muted = "text-th-ink-note";
  const field = `w-full rounded-md border px-2 py-2 font-mono text-xs border-th-line bg-th-code-bg text-th-ink`;

  return (
    <TokenDialogShell
      title={`Token "${created.name}" created`}
      description="Put it in your AI assistant's settings, or run one of the commands below."
      onClose={onClose}
      width="w-[640px]"
      // A stray click outside must not throw the token away; Close and Esc still close.
      onPointerDownOutside={(e) => e.preventDefault()}
      onCloseAutoFocus={(e) => {
        e.preventDefault();
        returnFocus.current?.focus();
      }}
    >
      <p id={warningId} role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 font-lato text-sm font-bold text-amber-900">
        Copy it now. You won&apos;t see it again.
      </p>

      <div className="flex flex-col gap-1">
        <div className="flex items-end justify-between gap-2">
          <label id={tokenLabelId} htmlFor={`${tokenLabelId}-input`} className="font-lato text-base">
            Your token
          </label>
          <CopyButton text={created.token} what="the token" target={tokenRef} />
        </div>
        <input
          ref={tokenRef}
          id={`${tokenLabelId}-input`}
          readOnly
          value={created.token}
          aria-describedby={warningId}
          spellCheck={false}
          autoComplete="off"
          onFocus={(e) => e.currentTarget.select()}
          className={field}
        />
      </div>

      {serverUrl && (
        <>
          <Snippet
            title="Claude Code"
            hint="Run this in your terminal:"
            text={claude}
            what="the Claude Code command"
            preRef={claudeRef}
            className={field}
            muted={muted}
          />
          <Snippet
            title="Cursor"
            hint="Put this in .cursor/mcp.json (or merge the get-it-done entry into your existing mcpServers):"
            text={cursor}
            what="the Cursor configuration"
            preRef={cursorRef}
            className={field}
            muted={muted}
          />
        </>
      )}

      <p className={`font-lato text-xs ${muted}`}>
        Treat it like a password. If it leaks, revoke it in this section and create a new one.
      </p>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[5px] bg-th-acc px-4 py-2 font-lato text-sm font-bold text-th-on-acc transition-colors hover:bg-th-acc-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-focus focus-visible:ring-offset-2"
        >
          Done
        </button>
      </div>
    </TokenDialogShell>
  );
}

function Snippet({
  title,
  hint,
  text,
  what,
  preRef,
  className,
  muted,
}: {
  title: string;
  hint: string;
  text: string;
  what: string;
  preRef: RefObject<HTMLPreElement | null>;
  className: string;
  muted: string;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-1">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h3 id={headingId} className="font-lato text-base font-bold">
            {title}
          </h3>
          <p className={`font-lato text-xs ${muted}`}>{hint}</p>
        </div>
        <CopyButton text={text} what={what} target={preRef} />
      </div>
      {/* Focusable so keyboard users can scroll a long line. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable code block must be reachable by keyboard */}
      <pre ref={preRef} tabIndex={0} aria-labelledby={headingId} className={`${className} overflow-x-auto whitespace-pre`}>
        <code>{text}</code>
      </pre>
    </section>
  );
}
