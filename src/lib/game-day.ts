import "server-only";
import { z } from "zod";
import type { GameDay } from "@prisma/client";

// Links open on the visitor's device. The server never fetches arbitrary URLs.
const httpsLink = z.string().trim().max(2000).url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}, "Use an HTTPS link without embedded credentials.").nullable();
export const gameSchema = z.object({
  teamId: z.string().min(1), opponentName: z.string().trim().min(1).max(100),
  homeName: z.string().trim().min(1).max(100), homeLogo: httpsLink, awayLogo: httpsLink,
  startsAt: z.string().datetime({ offset: true }), venue: z.string().trim().min(1).max(200),
  visitorInfo: z.string().trim().max(2000).default(""), watchUrl: httpsLink, ticketUrl: httpsLink,
  published: z.boolean().default(false), scorerId: z.string().min(1).nullable(),
}).strict();
export const scoreSchema = z.object({
  version: z.number().int().min(0), homeScore: z.number().int().min(0).max(999),
  awayScore: z.number().int().min(0).max(999), period: z.string().trim().min(1).max(40),
  status: z.enum(["SCHEDULED", "LIVE", "DELAYED", "FINAL", "CANCELLED"]),
  note: z.string().trim().min(1).max(240),
}).strict();

export function publicGame(game: GameDay) {
  return {
    id: game.id, teamId: game.teamId, homeName: game.homeName, opponentName: game.opponentName,
    homeLogo: game.homeLogo, awayLogo: game.awayLogo, startsAt: game.startsAt, venue: game.venue,
    visitorInfo: game.visitorInfo, watchUrl: game.watchUrl, ticketUrl: game.ticketUrl,
    homeScore: game.homeScore, awayScore: game.awayScore, period: game.period, status: game.status,
    version: game.version, updatedAt: game.updatedAt, published: game.published,
  };
}
