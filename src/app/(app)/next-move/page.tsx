import { requireUser } from '@/lib/auth-guards';
import { NextMoveWorkspace } from '@/components/gate1/NextMoveWorkspace';
export default async function NextMovePage({ searchParams }: { searchParams: Promise<{ film?: string }> }) {
  const user = await requireUser('/next-move'); const { film } = await searchParams;
  return <NextMoveWorkspace actorId={user.id} role={user.role} filmId={typeof film === 'string' && film.length <= 128 ? film : undefined} />;
}
