"use client";

import { useEffect, useRef } from "react";

const LENGTH = 6;

/**
 * Six individual boxes for a numeric verification code. Autofocuses the
 * first box, advances on digit entry, moves back on Backspace from an
 * empty box, accepts a full paste into any box, and supports the
 * `autoComplete="one-time-code"` hook iOS/Android use to offer the SMS/
 * email-code autofill chip above the keyboard.
 */
export function VerificationCodeInput({
  value,
  onChange,
  onComplete,
  disabled,
  error,
  autoFocus = true,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) inputRefs.current[0]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);

  function setDigitAt(index: number, digit: string) {
    const next = digits.slice();
    next[index] = digit;
    const joined = next.join("");
    onChange(joined);
    if (joined.length === LENGTH && next.every((d) => d !== "")) {
      onComplete?.(joined);
    }
  }

  function handleChange(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      setDigitAt(index, "");
      return;
    }
    if (cleaned.length > 1) {
      // A multi-char value here means a paste landed in a single box
      // (some browsers route paste through onChange, not onPaste).
      applyPaste(index, cleaned);
      return;
    }
    setDigitAt(index, cleaned);
    if (index < LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function applyPaste(startIndex: number, text: string) {
    const cleaned = text.replace(/\D/g, "").slice(0, LENGTH - startIndex);
    if (!cleaned) return;
    const next = digits.slice();
    for (let i = 0; i < cleaned.length; i++) next[startIndex + i] = cleaned[i];
    const joined = next.join("");
    onChange(joined);
    const lastFilled = Math.min(startIndex + cleaned.length, LENGTH) - 1;
    inputRefs.current[lastFilled]?.focus();
    if (joined.length === LENGTH && next.every((d) => d !== "")) {
      onComplete?.(joined);
    }
  }

  function handlePaste(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (!text) return;
    e.preventDefault();
    applyPaste(index, text);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault();
      setDigitAt(index - 1, "");
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  return (
    <div className="flex gap-2.5 justify-center" role="group" aria-label="6-digit verification code">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={LENGTH}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${LENGTH}`}
          className="code-box"
          data-error={error ? "true" : undefined}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
