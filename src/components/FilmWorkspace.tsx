"use client";

import { useRef } from "react";
import { FilmPlayer } from "@/components/FilmPlayer";
import { FilmComments, type FilmCommentItem } from "@/components/FilmComments";
import { FilmTags, type TagDefinition, type FilmTagItem } from "@/components/FilmTags";
import { FilmAnnotator, type FilmAnnotationItem } from "@/components/FilmAnnotator";
import { FilmReviewRequests, type ReviewRequestItem } from "@/components/FilmReviewRequests";

type Clip = {
  id: string;
  startSec: number;
  endSec: number | null;
  label: string;
  notes: string | null;
  createdByName: string;
  isMine: boolean;
};

export function FilmWorkspace({
  film,
  initialClips,
  teamId,
  canComment,
  canLeavePrivateComments,
  canTag,
  canManageTagDefinitions,
  canAnnotate,
  initialComments,
  initialTagDefinitions,
  initialTags,
  initialAnnotations,
  initialReviewRequests,
}: {
  film: { id: string; title: string; description: string | null; durationSec: number | null; isMine: boolean };
  initialClips: Clip[];
  teamId: string | null;
  canComment: boolean;
  canLeavePrivateComments: boolean;
  canTag: boolean;
  canManageTagDefinitions: boolean;
  canAnnotate: boolean;
  initialComments: FilmCommentItem[];
  initialTagDefinitions: TagDefinition[];
  initialTags: FilmTagItem[];
  initialAnnotations: FilmAnnotationItem[];
  initialReviewRequests: ReviewRequestItem[];
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  function seek(sec: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
      videoRef.current.play();
    }
  }

  return (
    <div>
      <FilmPlayer film={film} initialClips={initialClips} onVideoRef={(el) => (videoRef.current = el)} />

      {teamId && (
        <FilmTags
          filmId={film.id}
          teamId={teamId}
          canTag={canTag}
          canManageDefinitions={canManageTagDefinitions}
          initialDefinitions={initialTagDefinitions}
          initialTags={initialTags}
          currentTime={() => videoRef.current?.currentTime ?? 0}
          onSeek={seek}
        />
      )}

      {teamId && (
        <FilmAnnotator filmId={film.id} videoRef={videoRef} canAnnotate={canAnnotate} initialAnnotations={initialAnnotations} />
      )}

      {teamId && (
        <FilmReviewRequests
          filmId={film.id}
          initialRequests={initialReviewRequests}
          currentTime={() => videoRef.current?.currentTime ?? 0}
        />
      )}

      {canComment && (
        <FilmComments
          filmId={film.id}
          initialComments={initialComments}
          canLeavePrivate={canLeavePrivateComments}
          currentTime={() => videoRef.current?.currentTime ?? 0}
          onSeek={seek}
        />
      )}
    </div>
  );
}
