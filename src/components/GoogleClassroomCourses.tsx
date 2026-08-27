export type ClassroomCourseItem = {
  id: string;
  name: string;
  section: string | null;
  alternateLink: string | null;
};

export type ClassroomAssignmentItem = {
  id: string;
  title: string;
  dueDate: string | null;
  maxPoints: number | null;
  alternateLink: string | null;
  courseName: string;
  grade: number | null;
  submissionState: string | null;
};

function formatDue(dueDate: string | null): string {
  if (!dueDate) return "No due date";
  const d = new Date(dueDate);
  const days = Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return `Was due ${d.toLocaleDateString()}`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due ${d.toLocaleDateString()}`;
}

export function GoogleClassroomCourses({
  courses,
  assignments,
}: {
  courses: ClassroomCourseItem[];
  assignments: ClassroomAssignmentItem[];
}) {
  if (courses.length === 0) {
    return (
      <section className="card p-5 sm:p-6 mb-8">
        <div className="mono text-text-3 mb-2">Classes</div>
        <p className="text-text-2 text-sm">
          Your Google account is connected, but no Google Classroom courses were found.
        </p>
      </section>
    );
  }

  return (
    <section className="card p-5 sm:p-6 mb-8">
      <div className="mono text-text-3 mb-4">Classes</div>
      <div className="flex flex-wrap gap-2 mb-6">
        {courses.map((c) => (
          <a
            key={c.id}
            href={c.alternateLink ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="badge hover:text-text-1"
          >
            {c.name}
            {c.section ? ` · ${c.section}` : ""}
          </a>
        ))}
      </div>

      <div className="mono text-text-3 mb-3">Upcoming assignments</div>
      {assignments.length === 0 ? (
        <p className="text-text-2 text-sm">Nothing due right now.</p>
      ) : (
        <ul className="space-y-3">
          {assignments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between text-sm pb-3"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div>
                <div className="text-text-3 text-xs mb-0.5">{a.courseName}</div>
                {a.alternateLink ? (
                  <a href={a.alternateLink} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                    {a.title}
                  </a>
                ) : (
                  <span className="font-medium">{a.title}</span>
                )}
              </div>
              <div className="text-right text-text-2 text-xs">
                <div>{formatDue(a.dueDate)}</div>
                {a.grade !== null && (
                  <div className="text-text-3">
                    Grade: {a.grade}
                    {a.maxPoints ? ` / ${a.maxPoints}` : ""}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
