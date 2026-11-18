"use client";
import { useId, useRef, useState } from "react";
import InputBox from "@/app/components/inputBox";
import { API_TOKEN_RULES } from "@/app/contracts/common";
import { CreateApiTokenRequestSchema } from "@/app/contracts/requests";
import type { ToastController } from "@/hooks/toastController";
import { useCreateApiToken } from "@/lib/query/apiTokens";
import { settled } from "@/lib/query/unwrap";
import { createErrorCopy, DEFAULT_EXPIRY, EXPIRY_OPTIONS, nameRuleCopy, type ExpiryChoice } from "./tokenCopy";
import TokenDialogShell from "./TokenDialogShell";

/** What the section keeps after a create: just enough to show it once. */
export interface NewToken {
  name: string;
  token: string;
}

interface CreateTokenDialogProps {
  onClose: () => void;
  /** Called once with the new secret; the dialog has already dropped its own copy. */
  onCreated: (created: NewToken) => void;
  toast: ToastController;
  dark: boolean;
}

/** Name (1-60 characters) and expiry (90 days preselected). Backend errors show in the form. */
export default function CreateTokenDialog({ onClose, onCreated, toast, dark }: CreateTokenDialogProps) {
  const create = useCreateApiToken();
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState<ExpiryChoice>(DEFAULT_EXPIRY);
  const [nameError, setNameError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const formErrorId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const muted = dark ? "text-gray-300" : "text-[#676767]";

  const submit = async () => {
    if (create.isPending) return;
    const parsed = CreateApiTokenRequestSchema.safeParse({ name, expires_in_days: expiry });
    if (!parsed.success) {
      setNameError(nameRuleCopy());
      return;
    }
    setNameError(undefined);
    setFormError(undefined);
    const result = await settled(create.mutateAsync(parsed.data));
    if (result.ok) {
      const created = { name: result.data.name, token: result.data.token };
      // Drop the mutation's copy of the response; from here only the section holds the secret.
      create.reset();
      onCreated(created);
      return;
    }
    const copy = createErrorCopy(result.failure);
    if (!copy) toast.failure(result.failure);
    else if (copy.field === "name") setNameError(copy.message);
    else setFormError(copy.message);
  };

  return (
    <TokenDialogShell
      title="Create a token"
      description="Give it a name you'll recognize, like the computer or app that will use it."
      onClose={onClose}
      dark={dark}
      width="w-[480px]"
      // Start on the name, not on Close.
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        nameRef.current?.focus();
      }}
    >
      <form
        className="flex flex-col gap-4"
        aria-describedby={formError ? formErrorId : undefined}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <InputBox
          label="Name"
          placeholder="e.g. Claude Code on my laptop"
          value={{ name }}
          onChange={(e) => {
            setName(e.target.value.slice(0, API_TOKEN_RULES.nameMax));
            if (nameError) setNameError(undefined);
          }}
          error={nameError}
          ref={nameRef}
        />

        <fieldset className="flex flex-col gap-2">
          <legend className={`font-lato text-base ${dark ? "text-white" : "text-text"}`}>
            Expires after
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {EXPIRY_OPTIONS.map((o) => (
              <label
                key={o.label}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 font-lato text-sm has-[:checked]:border-primary-default has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-default ${
                  dark ? "border-gray-800" : "border-[#E0E0E0]"
                }`}
              >
                <input
                  type="radio"
                  name="expires_in_days"
                  value={o.value ?? "never"}
                  checked={expiry === o.value}
                  onChange={() => setExpiry(o.value)}
                  className="accent-primary-default"
                />
                {o.label}
              </label>
            ))}
          </div>
          {expiry === null && (
            <p className={`font-lato text-xs ${muted}`}>
              A token without expiry works until you revoke it. Prefer an expiry where you can.
            </p>
          )}
        </fieldset>

        {formError && (
          <p id={formErrorId} role="alert" className="font-lato text-sm text-error-default">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-[5px] border px-4 py-2 font-lato text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default ${
              dark ? "border-gray-700" : "border-[#E0E0E0]"
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            aria-disabled={create.isPending}
            className="rounded-[5px] bg-primary-default px-4 py-2 font-lato text-sm font-bold text-white transition-colors hover:bg-primary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-default focus-visible:ring-offset-2 aria-disabled:opacity-60"
          >
            {create.isPending ? "Creating…" : "Create token"}
          </button>
        </div>
      </form>
    </TokenDialogShell>
  );
}
