# MENTA home overview

The authenticated workspace uses an absolute #000 black canvas and white home widgets with black typography and large numbers. The existing MENTA wordmark appears in the white focus card in black and in workspace chrome in white. Marketing and authentication pages retain their existing themes.

## Motion and navigation

The large white focus bubble collapses to a 72px sticky capsule after scrolling down and expands when returning to the top. Its primary action remains available in compact form. Hidden expanded content is inert so it cannot receive keyboard focus. A reserved layout area avoids shifting the page as the bubble changes height. A passive scroll listener schedules updates through requestAnimationFrame and cleans up on unmount. Reduced-motion users retain a static expanded card.

On phones and iPads up to 1180px, navigation uses a floating white pill with a black sliding selection indicator. The dock keeps the existing role-specific destinations, exposes aria-current for the active page, and respects the safe area inset. Desktop keeps the sidebar. Transition durations range from 250ms for color to 500ms for the bubble shape, with reduced-motion handling.

## Widgets

- **Today's focus:** real scheduled session or agenda headline, with entry to training. Coach accounts open the team's existing command center.
- **Training:** actual workout completions (athlete) or team workouts (coach).
- **Recovery:** entry to the existing private recovery check-in; no invented readiness score.
- **Academics / Team:** assignments due today for athletes; team access for coaches.
- **Focus timer:** 5, 10, and 20 minute presets, pause/resume, reset, elapsed-time compensation when the browser throttles intervals, and an accessible completion announcement. The timer is local to this home screen and resets when navigating away.
- **Your week:** seven selectable days, populated from actual agenda records, using the visitor's local time after hydration.
- **Game day:** large shortcuts into film, team messages, team training, and the calendar. This is navigation to existing tools; it does not introduce press-box audio/video calling.

All existing server-side role routing, account scoping, plan cards, goals, and detailed dashboard sections remain in place. Motion uses short opacity/translation transitions and respects reduced-motion preferences. Primary controls have 44px touch targets.

## Validation

- `next typegen` and `tsc --noEmit` pass.
- Browser-tested temporary renderings of the production components with illustrative props: timer presets/start/pause/reset, game-day toggle, agenda day filtering, scroll compression/expansion, pure-black computed background, and an iPad-width AppShell/dock.
- Visually reviewed tablet (1024px) and phone (390px) frames. The temporary preview routes and development-only configuration were removed before commit.
- Extended the existing authenticated smoke test for the home heading, scroll compression/inert content, tablet dock, timer behavior, and game-day link. Database-backed E2E was not run in this environment; it requires the project's test PostgreSQL configuration.
- Default Turbopack build fails while resolving existing `next/font/google` Fraunces imports. A webpack build independently hits an environment policy block downloading from `fonts.gstatic.com`. A clean production build is still required in the normal CI/deployment environment.

`home-overview-preview.jpg` shows the component with illustrative sample data; those sample records are not part of the shipped app.
