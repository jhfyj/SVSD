"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { ArrowRight } from "@carbon/icons-react";
import { COUNTRY_CODE, formatPhone, isCompletePhone, maskPhone, phoneDigits } from "@/lib/auth/phone";
import { sendCode, verifyCode, type Session } from "@/lib/auth/session";
import { cue } from "@/lib/sound";
import { cn } from "../ui/cn";
import { LcdIcon } from "./LcdIcon";
import { ScrambleText } from "@/components/ui/ScrambleText";

const CODE_LENGTH = 6;

/** Shared frame for the two sign-in screens (no top bar): LCD icon on top, the submit button pinned to the bottom. */
function SignInScreen({
  icon,
  onSubmit,
  canSubmit,
  busyLabel,
  submitLabel,
  children,
}: {
  icon: ReactNode;
  onSubmit: () => void;
  canSubmit: boolean;
  busyLabel?: string;
  /** A full-width button with this label; NEXT with an arrow icon in the bottom right when left out. */
  submitLabel?: string;
  children: ReactNode;
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (canSubmit && !busyLabel) onSubmit();
  };
  return (
    <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col bg-background text-foreground">
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col pt-[98px]">
        <div className="flex flex-1 flex-col items-center">
          {icon}
          {children}
        </div>
        <div className={cn("flex pb-[33px] pt-8", submitLabel ? "justify-center" : "justify-end pr-[30px]")}>
          <button
            type="submit"
            data-cuelume-tap=""
            disabled={!canSubmit || !!busyLabel}
            aria-busy={!!busyLabel}
            className={cn(
              "inline-flex min-h-11 items-center justify-center bg-foreground px-6 py-3 text-base text-accent-foreground transition-opacity hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-40",
              submitLabel ? "w-[332px]" : "min-w-[125px]",
            )}
          >
            {busyLabel ?? submitLabel ?? (
              <span className="flex items-center gap-2">
                NEXT
                <ArrowRight size={16} aria-hidden />
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export type PhoneStepProps = {
  /** The 10 national digits typed so far. */
  digits: string;
  onDigitsChange: (digits: string) => void;
  onNext: () => void;
  sending?: boolean;
  error?: string;
};

/** "Sign in or sign up with your phone number" (Figma node 153:1092). */
export function PhoneStep({ digits, onDigitsChange, onNext, sending, error }: PhoneStepProps) {
  return (
    <SignInScreen
      icon={<LcdIcon icon="telephone" label="Phone" />}
      onSubmit={onNext}
      canSubmit={isCompletePhone(digits)}
      busyLabel={sending ? "SENDING…" : undefined}
    >
      <h1 className="mt-[85px] w-[293px] text-center text-xl"><ScrambleText>SIGN IN OR SIGN UP WITH YOUR PHONE NUMBER.</ScrambleText></h1>
      <label className="mt-[28px] flex h-[49px] w-[325px] items-center gap-3 bg-surface px-2.5 text-xl focus-within:outline focus-within:outline-1 focus-within:outline-foreground/60">
        <span className={digits ? "text-foreground" : "text-foreground/40"}>{COUNTRY_CODE}</span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          data-cuelume-type=""
          aria-label="Phone number"
          aria-invalid={!!error}
          autoFocus
          placeholder="123-456-7890"
          value={formatPhone(digits)}
          onChange={(e) => onDigitsChange(phoneDigits(e.target.value))}
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-foreground/40"
        />
      </label>
      {error && <p role="alert" className="mt-3 w-[325px] text-xs text-danger">{error}</p>}
    </SignInScreen>
  );
}

export type CodeStepProps = {
  digits: string;
  code: string;
  onCodeChange: (code: string) => void;
  onNext: (code: string) => void;
  onChangeNumber?: () => void;
  onResend?: () => void;
  checking?: boolean;
  error?: string;
  /** Show the caret in the first empty box, as when the field has focus. */
  defaultFocused?: boolean;
};

/** "Enter verification code" (Figma node 153:1102): six boxes over one real input. */
export function CodeStep({
  digits,
  code,
  onCodeChange,
  onNext,
  onChangeNumber,
  onResend,
  checking,
  error,
  defaultFocused = true,
}: CodeStepProps) {
  const [focused, setFocused] = useState(defaultFocused);
  // The bubble's dots hop for a moment after each keystroke.
  const [typedAt, setTypedAt] = useState(0);
  const typing = typedAt > 0 && !error && !checking;
  useEffect(() => {
    if (!typedAt) return;
    const t = setTimeout(() => setTypedAt(0), 1200);
    return () => clearTimeout(t);
  }, [typedAt]);
  const change = (value: string) => {
    const next = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setTypedAt(Date.now());
    onCodeChange(next);
    if (next.length === CODE_LENGTH && next !== code && !checking) onNext(next);
  };
  return (
    <SignInScreen
      icon={error ? <LcdIcon icon="warning" label="Wrong code" /> : <LcdIcon icon="message" label="Message" typing={typing} />}
      onSubmit={() => onNext(code)}
      canSubmit={code.length === CODE_LENGTH}
      busyLabel={checking ? "CHECKING…" : undefined}
      submitLabel="VERIFY"
    >
      <h1 className="mt-[61px] w-[293px] text-center text-xl"><ScrambleText>ENTER VERIFICATION CODE</ScrambleText></h1>
      <p className="mt-[19px] w-[293px] text-center text-base text-foreground/70">
        We sent a 6-digit code to {maskPhone(digits)}.
      </p>
      <div className="relative mt-[26px] flex w-[345px] gap-[11px]">
        {Array.from({ length: CODE_LENGTH }, (_, i) => (
          <div
            key={i}
            aria-hidden
            className={cn(
              "flex h-[69px] flex-1 items-center justify-center border bg-surface text-2xl",
              error ? "border-danger" : focused && i === code.length ? "border-foreground" : "border-border-input",
            )}
          >
            {code[i] ?? (focused && i === code.length && <span className="caret-blink h-[27px] w-px bg-foreground" />)}
          </div>
        ))}
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          data-cuelume-type=""
          pattern="[0-9]*"
          maxLength={CODE_LENGTH}
          aria-label="Verification code"
          aria-invalid={!!error}
          autoFocus={defaultFocused}
          value={code}
          onChange={(e) => change(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 cursor-text opacity-0"
        />
      </div>
      {error && <p role="alert" className="mt-3 w-[345px] text-xs text-danger">{error}</p>}
      <div className="mt-6 flex w-[345px] justify-between text-xs text-foreground/70">
        <button type="button" onClick={onChangeNumber} className="min-h-11 uppercase underline-offset-4 hover:underline">
          Change number
        </button>
        <button type="button" onClick={onResend} className="min-h-11 uppercase underline-offset-4 hover:underline">
          Resend code
        </button>
      </div>
    </SignInScreen>
  );
}

export type PhoneSignInProps = {
  send?: (phone: string) => Promise<unknown>;
  verify?: (phone: string, code: string) => Promise<Session>;
  onSignedIn?: (session: Session) => void;
};

/** The whole sign-in flow: phone number, then the code we "texted". Signing up is the same flow. */
export function PhoneSignIn({ send = sendCode, verify = verifyCode, onSignedIn }: PhoneSignInProps) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [digits, setDigits] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const phone = `${COUNTRY_CODE}${digits}`;

  const requestCode = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await send(phone);
      setCode("");
      setStep("code");
    } catch (e) {
      cue("error");
      setError(e instanceof Error ? e.message : "Couldn't send a code. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const checkCode = async (value: string) => {
    setBusy(true);
    setError(undefined);
    try {
      const session = await verify(phone, value);
      cue("success");
      onSignedIn?.(session);
    } catch (e) {
      cue("error");
      setError(e instanceof Error ? e.message : "That code didn't match. Try again.");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  if (step === "phone") {
    return (
      <PhoneStep
        digits={digits}
        onDigitsChange={(d) => {
          setDigits(d);
          setError(undefined);
        }}
        onNext={requestCode}
        sending={busy}
        error={error}
      />
    );
  }
  return (
    <CodeStep
      digits={digits}
      code={code}
      onCodeChange={(c) => {
        setCode(c);
        if (c) setError(undefined);
      }}
      onNext={checkCode}
      checking={busy}
      error={error}
      onChangeNumber={() => {
        setStep("phone");
        setError(undefined);
      }}
      onResend={requestCode}
    />
  );
}
