"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";

/**
 * Click-to-upload avatar for the Profile page. No client-side crop tool
 * (that's a real, nontrivial UI to build correctly) — the browser's own
 * image is shown as an immediate local preview, then uploaded as-is.
 * No automatic resizing/optimization happens server-side either; that
 * would need an image-processing library this project doesn't have
 * installed, so this stays honest about what it does: store and serve
 * exactly the file you upload, up to the size limit.
 */
export function AvatarUpload({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  async function handleFile(file: File) {
    setError(null);
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Couldn't upload photo.");
        setPreview(null);
        return;
      }
      setVersion((v) => v + 1);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setUploading(true);
    try {
      await fetch("/api/profile/avatar", { method: "DELETE" });
      setPreview(null);
      setVersion((v) => v + 1);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative"
        style={{ borderRadius: "50%", cursor: "pointer" }}
        aria-label="Change profile photo"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not an optimizable static asset
          <img src={preview} alt={name} width={72} height={72} style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <Avatar key={version} userId={userId} name={name} size={72} />
        )}
      </button>
      <div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : "Change photo"}
          </button>
          <button type="button" className="text-xs text-text-3 hover:text-text-1" onClick={handleRemove} disabled={uploading}>
            Remove
          </button>
        </div>
        {error && <p className="text-sm mt-1" style={{ color: "var(--danger)" }}>{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
