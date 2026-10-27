"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./ActionSheet.module.css";

/** Native modal semantics provide focus containment, Escape, and an inert background. */
export function ActionSheet({ title, children, onClose, busy = false }: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();

  useEffect(() => {
    const node = dialog.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    node?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      node?.close();
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, []);

  return (
    <dialog ref={dialog} className={styles.sheet} aria-labelledby={heading}
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
      <div className={styles.handle} aria-hidden="true" />
      <header className={styles.header}>
        <div>
          <p className={styles.brand}>MENTA · Training</p>
          <h2 id={heading} tabIndex={-1} autoFocus>{title}</h2>
        </div>
        <button type="button" className={styles.close} aria-label="Close workout" disabled={busy} onClick={onClose}>×</button>
      </header>
      {children}
    </dialog>
  );
}
