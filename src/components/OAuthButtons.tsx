/**
 * Real Google/Facebook sign-in buttons. There's no separate "Log in with
 * Meta" product distinct from Facebook Login, so this offers Google and
 * Facebook only. Both hit real OAuth routes (src/lib/oauth.ts) — when the
 * server has no client id/secret configured, the flow redirects back with
 * an honest error instead of faking a sign-in.
 */
export function OAuthButtons() {
  return (
    <div>
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <span className="mono text-text-3">Or continue with</span>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- these are API route handlers (server redirects), not Next pages */}
        <a href="/api/auth/oauth/google" className="btn-secondary w-full justify-center">
          <GoogleIcon />
          Google
        </a>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- these are API route handlers (server redirects), not Next pages */}
        <a href="/api/auth/oauth/facebook" className="btn-secondary w-full justify-center">
          <FacebookIcon />
          Facebook
        </a>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.6 12.23c0-.68-.06-1.36-.18-2H12v3.79h5.4a4.62 4.62 0 0 1-2 3.03v2.5h3.23c1.9-1.75 2.97-4.33 2.97-7.32Z"
        opacity="0.9"
      />
      <path
        fill="currentColor"
        d="M12 22c2.7 0 4.97-.89 6.63-2.42l-3.23-2.5c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.05v2.59A10 10 0 0 0 12 22Z"
        opacity="0.7"
      />
      <path
        fill="currentColor"
        d="M6.39 13.91a5.99 5.99 0 0 1 0-3.82V7.5H3.05a10 10 0 0 0 0 9l3.34-2.59Z"
        opacity="0.5"
      />
      <path
        fill="currentColor"
        d="M12 6.06c1.47 0 2.79.5 3.82 1.49l2.87-2.87C16.96 2.99 14.7 2 12 2A10 10 0 0 0 3.05 7.5l3.34 2.59C7.18 7.82 9.39 6.06 12 6.06Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.16 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.77l-.44 2.91h-2.33V22c4.78-.78 8.44-4.94 8.44-9.94Z"
      />
    </svg>
  );
}
