import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GameDayBoard } from "@/components/GameDayBoard";

export const dynamic = "force-dynamic";
export default async function PublicGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const game = await prisma.gameDay.findFirst({ where: { id: gameId, published: true }, select: { id: true } });
  if (!game) notFound();
  return <div className="game-day-shell min-h-screen"><main className="max-w-3xl w-full mx-auto px-5 py-8 sm:py-12"><header className="flex justify-between items-center mb-10"><Link href="/" aria-label="MENTA home"><Image src="/logo.png" alt="MENTA" width={132} height={30} /></Link><span className="text-text-2">Game day</span></header><h1 className="text-3xl font-semibold mb-8">Follow the game.</h1><GameDayBoard gameId={game.id} /><footer className="mt-12 text-sm text-text-2">Game details and scores are published by the team. Broadcasts and tickets open the school&apos;s selected external provider.</footer></main></div>;
}
