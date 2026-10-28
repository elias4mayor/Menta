"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { NavIcon } from "./NavIcons";

export type HomeOverviewProps = {
  name: string;
  today: string;
  coach?: boolean;
  headline: string;
  detail: string;
  primaryHref: string;
  primaryLabel: string;
  stats: { label: string; value: string | number; href: string }[];
  trainingCount: number;
  academicCount?: number;
  teamHref: string;
  timeline: {
    id: string;
    title: string;
    at: string;
    href: string;
    kind: string;
  }[];
};

const subscribe = () => () => {};

/** Navigation uses existing, permission-checked destinations. No simulated live connection. */
export function HomeOverview(props: HomeOverviewProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mode, setMode] = useState<"day" | "game">("day");
  const [duration, setDuration] = useState(300);
  const [remaining, setRemaining] = useState(300);
  const [running, setRunning] = useState(false);
  const deadline = useRef(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const dateOptions = mounted ? {} : { timeZone: "UTC" };
  const dayKey = (value: string | Date) =>
    new Date(value).toLocaleDateString("en-CA", dateOptions);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(props.today);
    date.setUTCDate(date.getUTCDate() + i);
    return date;
  });

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const seconds = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setRemaining(seconds);
      if (seconds === 0) setRunning(false);
    };
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [running]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      setCollapsed((previous) =>
        preference.matches ? false : window.scrollY > (previous ? 65 : 150),
      );
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    preference.addEventListener("change", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      preference.removeEventListener("change", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  function toggleTimer() {
    if (running) {
      setRemaining(
        Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)),
      );
      setRunning(false);
    } else {
      const seconds = remaining || duration;
      setRemaining(seconds);
      deadline.current = Date.now() + seconds * 1000;
      setRunning(true);
    }
  }

  const selectedDate = days[selectedDay];
  const items = props.timeline.filter(
    (item) => dayKey(item.at) === dayKey(selectedDate),
  );
  const clock = `${Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`;
  const gameActions = [
    {
      label: "Film room",
      detail: "Clips, review & breakdown",
      icon: "film",
      href: "/film",
    },
    {
      label: "Team messages",
      detail: "Open your conversations",
      icon: "messages",
      href: "/messages",
    },
    {
      label: props.coach ? "Command center" : "My team",
      detail: props.coach ? "Sessions & team training" : "Roster & team tools",
      icon: "team",
      href: props.teamHref,
    },
    {
      label: "Schedule",
      detail: "Practice & game calendar",
      icon: "calendar",
      href: "/calendar",
    },
  ];

  return (
    <section
      className={`home-overview${collapsed ? " home-is-collapsed" : ""}`}
      aria-label="Home overview"
    >
      <div className="home-heading">
        <div>
          <p className="home-eyebrow">YOUR ATHLETE OPERATING SYSTEM</p>
          <h1>
            Ready when you are<span>.</span>
          </h1>
          <p>Welcome back, {props.name.split(" ")[0]}. Let’s get to work.</p>
        </div>
        <div className="home-modes" role="group" aria-label="Home view">
          <button
            type="button"
            aria-pressed={mode === "day"}
            onClick={() => setMode("day")}
          >
            My day
          </button>
          <button
            type="button"
            aria-pressed={mode === "game"}
            onClick={() => setMode("game")}
          >
            Game day <span>↗</span>
          </button>
        </div>
      </div>

      {mode === "day" ? (
        <>
          <div className="home-top-grid">
            <article className="home-card home-focus">
              <div className="home-card-top">
                <span className="home-eyebrow">
                  {collapsed ? props.headline : "TODAY’S FOCUS"}
                </span>
                <Image
                  src="/logo.png"
                  alt="MENTA"
                  width={863}
                  height={194}
                  className="home-brand"
                  style={{ filter: "invert(1)" }}
                  priority
                />
                {collapsed && (
                  <Link
                    className="home-compact-action"
                    href={props.primaryHref}
                    aria-label={props.primaryLabel}
                  >
                    ↗
                  </Link>
                )}
              </div>
              <div className="home-focus-body" inert={collapsed}>
                <div>
                  <h2>{props.headline}</h2>
                  <p>{props.detail}</p>
                  <Link className="home-primary" href={props.primaryHref}>
                    {props.primaryLabel}
                    <span aria-hidden="true">↗</span>
                  </Link>
                </div>
                <div className="home-signal" aria-hidden="true">
                  {Array.from({ length: 32 }, (_, i) => (
                    <i
                      key={i}
                      style={{
                        height: `${18 + (i / 31) ** 2 * 82}%`,
                        opacity: 0.15 + i / 42,
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="home-stats" inert={collapsed}>
                {props.stats.map((stat) => (
                  <Link key={stat.label} href={stat.href}>
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </Link>
                ))}
              </div>
            </article>
          </div>
          <article className="home-card home-timer">
            <div className="home-card-top">
              <span className="home-eyebrow">FOCUS TIMER</span>
              <NavIcon name="mind" />
            </div>
            <div
              className="home-timer-ring"
              style={{
                background: `conic-gradient(#000 ${(remaining / duration) * 360}deg, #e5e5e8 0deg)`,
              }}
            >
              <div>
                <span
                  className="home-clock"
                  role="timer"
                  aria-label={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds remaining`}
                >
                  {clock}
                </span>
                <span>
                  {running
                    ? "Stay in the moment"
                    : remaining === 0
                      ? "Session complete"
                      : "One thing at a time"}
                </span>
              </div>
            </div>
            <div className="home-timer-presets" aria-label="Timer duration">
              {[5, 10, 20].map((minutes) => (
                <button
                  type="button"
                  key={minutes}
                  aria-pressed={duration === minutes * 60}
                  onClick={() => {
                    setDuration(minutes * 60);
                    setRemaining(minutes * 60);
                    setRunning(false);
                  }}
                >
                  {minutes} min
                </button>
              ))}
            </div>
            <div className="home-timer-actions">
              <button
                type="button"
                className="home-secondary"
                onClick={toggleTimer}
              >
                {running
                  ? "Pause"
                  : remaining === 0
                    ? "Start again"
                    : remaining < duration
                      ? "Resume"
                      : "Start focus"}
              </button>
              <button
                type="button"
                className="home-reset"
                aria-label="Reset timer"
                onClick={() => {
                  setRunning(false);
                  setRemaining(duration);
                }}
              >
                ↺
              </button>
            </div>
            <span className="home-sr-status" role="status">
              {remaining === 0 ? "Focus session complete" : ""}
            </span>
          </article>
          <div className="home-pillars">
            <Link href="/train" className="home-card home-pillar home-training">
              <span className="home-pillar-icon">
                <NavIcon name="train" />
              </span>
              <span className="home-eyebrow">TRAINING</span>
              <strong>
                {props.trainingCount}
                <small>
                  {props.coach ? "team workouts" : "workouts this week"}
                </small>
              </strong>
              <span className="home-pillar-action">
                {props.coach ? "Open training" : "Start a workout"}
                <span>↗</span>
              </span>
            </Link>
            <Link
              href="/recovery"
              className="home-card home-pillar home-recovery"
            >
              <span className="home-pillar-icon">
                <NavIcon name="recovery" />
              </span>
              <span className="home-eyebrow">RECOVERY</span>
              <strong>
                Check in<small>Make room to recharge</small>
              </strong>
              <span className="home-pillar-action">
                Open recovery<span>↗</span>
              </span>
            </Link>
            <Link
              href={props.coach ? props.teamHref : "/school"}
              className="home-card home-pillar home-academics"
            >
              <span className="home-pillar-icon">
                <NavIcon name={props.coach ? "team" : "school"} />
              </span>
              <span className="home-eyebrow">
                {props.coach ? "TEAM" : "ACADEMICS"}
              </span>
              <strong>
                {props.coach ? "Your roster" : (props.academicCount ?? 0)}
                <small>
                  {props.coach
                    ? "People behind the performance"
                    : "assignments due today"}
                </small>
              </strong>
              <span className="home-pillar-action">
                {props.coach ? "Open team" : "View assignments"}
                <span>↗</span>
              </span>
            </Link>
          </div>
        </>
      ) : (
        <div className="home-game-panel">
          <div className="home-game-intro">
            <span className="home-eyebrow">GAME DAY ESSENTIALS</span>
            <h2>
              Less searching.
              <br />
              More execution.
            </h2>
            <p>Your team’s tools, one tap away.</p>
          </div>
          <div className="home-game-actions">
            {gameActions.map((action) => (
              <Link className="home-card" key={action.label} href={action.href}>
                <NavIcon name={action.icon} />
                <h3>{action.label}</h3>
                <p>{action.detail}</p>
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="home-bottom-grid">
        <article className="home-card home-agenda">
          <div className="home-card-top">
            <h2>Your week</h2>
            <Link href="/calendar" aria-label="Open calendar">
              <NavIcon name="calendar" />
            </Link>
          </div>
          <div className="home-week" role="group" aria-label="Choose a day">
            {days.map((day, i) => (
              <button
                type="button"
                key={i}
                aria-pressed={selectedDay === i}
                onClick={() => setSelectedDay(i)}
              >
                <span>
                  {i === 0
                    ? "Today"
                    : day.toLocaleDateString("en-US", {
                        weekday: "short",
                        ...dateOptions,
                      })}
                </span>
                <strong>
                  {day.toLocaleDateString("en-US", {
                    day: "numeric",
                    ...dateOptions,
                  })}
                </strong>
                <i
                  className={
                    props.timeline.some(
                      (item) => dayKey(item.at) === dayKey(day),
                    )
                      ? "has-events"
                      : ""
                  }
                />
              </button>
            ))}
          </div>
          <div className="home-agenda-items">
            {items.length ? (
              items.map((item) => (
                <Link key={item.id} href={item.href}>
                  <span className="home-agenda-time">
                    {new Date(item.at).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                      ...dateOptions,
                    })}
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.kind}</span>
                  </div>
                  <span aria-hidden="true">↗</span>
                </Link>
              ))
            ) : (
              <div className="home-agenda-empty">
                <span>
                  No items scheduled
                  {selectedDay === 0 ? " today" : " for this day"}.
                </span>
                <Link href="/calendar">Plan your day ↗</Link>
              </div>
            )}
          </div>
        </article>
        <article className="home-card home-shortcuts">
          <div className="home-card-top">
            <h2>Jump back in</h2>
            <span aria-hidden="true">↗</span>
          </div>
          {[
            {
              href: "/film",
              icon: "film",
              label: "Film room",
              detail: "See it. Learn it. Run it.",
            },
            {
              href: "/messages",
              icon: "messages",
              label: "Messages",
              detail: "Stay close to your team.",
            },
            {
              href: "/ai-coach",
              icon: "spark",
              label: "Ask MENTA",
              detail: "Find your next step.",
            },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <span className="home-shortcut-icon">
                <NavIcon name={item.icon} />
              </span>
              <div>
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </div>
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </article>
      </div>
    </section>
  );
}
