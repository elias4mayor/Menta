"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Member = { userId: string; name: string; groupRole: string };
type Group = { id: string; name: string; description: string | null; filmCount: number; members: Member[] };
type RosterMember = { userId: string; name: string; teamRole: string };
type Grant = {
  id: string;
  userId: string;
  userName: string;
  permission: string;
  positionGroupId: string | null;
  positionGroupName: string | null;
};

const GROUP_ROLES = ["ATHLETE", "COACH", "ANALYST"] as const;

export function PositionGroupsManager({
  teamId,
  canGrant,
  initialGroups,
  roster,
  initialGrants,
  allPermissions,
}: {
  teamId: string;
  canGrant: boolean;
  initialGroups: Group[];
  roster: RosterMember[];
  initialGrants: Grant[];
  allPermissions: readonly string[];
}) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [grants, setGrants] = useState(initialGrants);
  const [newGroupName, setNewGroupName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/position-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create group.");
        return;
      }
      setGroups((prev) => [...prev, { id: data.group.id, name: data.group.name, description: data.group.description, filmCount: 0, members: [] }]);
      setNewGroupName("");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteGroup(groupId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/position-groups/${groupId}`, { method: "DELETE" });
      if (res.ok) setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } finally {
      setLoading(false);
    }
  }

  async function addMember(groupId: string, userId: string, groupRole: string) {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/position-groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, groupRole }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function removeMember(groupId: string, userId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/position-groups/${groupId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setGroups((prev) =>
          prev.map((g) => (g.id === groupId ? { ...g, members: g.members.filter((m) => m.userId !== userId) } : g))
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function grantPermission(userId: string, permission: string, positionGroupId: string | null) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/permission-grants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, permission, positionGroupId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't grant permission.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function revokeGrant(grantId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/permission-grants`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId }),
      });
      if (res.ok) setGrants((prev) => prev.filter((g) => g.id !== grantId));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="card p-5 sm:p-6">
        <div className="mono text-text-3 mb-4">Groups ({groups.length})</div>

        {groups.length === 0 ? (
          <p className="text-text-2 text-sm mb-4">No position groups yet — create your first one below.</p>
        ) : (
          <div className="space-y-3 mb-5">
            {groups.map((g) => {
              const isOpen = expanded === g.id;
              const availableToAdd = roster.filter((r) => !g.members.some((m) => m.userId === r.userId));
              return (
                <div key={g.id} className="rounded-lg" style={{ border: "1px solid var(--border)" }}>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-4 text-left"
                    onClick={() => setExpanded(isOpen ? null : g.id)}
                  >
                    <div>
                      <div className="font-medium">{g.name}</div>
                      <div className="text-text-3 text-xs">
                        {g.members.length} member{g.members.length === 1 ? "" : "s"} · {g.filmCount} film
                        {g.filmCount === 1 ? "" : "s"}
                      </div>
                    </div>
                    <span className="text-text-3 text-xs">{isOpen ? "Hide" : "Manage"}</span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
                      <ul className="space-y-1.5 text-sm mt-3">
                        {g.members.map((m) => (
                          <li key={m.userId} className="flex items-center justify-between">
                            <span>
                              {m.name} <span className="text-text-3">· {m.groupRole}</span>
                            </span>
                            <button
                              type="button"
                              className="text-xs text-text-3 hover:text-text-1"
                              disabled={loading}
                              onClick={() => removeMember(g.id, m.userId)}
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                        {g.members.length === 0 && <li className="text-text-3">No members yet.</li>}
                      </ul>

                      {availableToAdd.length > 0 && (
                        <AddMemberForm
                          options={availableToAdd}
                          disabled={loading}
                          onAdd={(userId, groupRole) => addMember(g.id, userId, groupRole)}
                        />
                      )}

                      <button
                        type="button"
                        className="text-xs"
                        style={{ color: "var(--danger)" }}
                        disabled={loading}
                        onClick={() => deleteGroup(g.id)}
                      >
                        Delete group
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={createGroup} className="flex gap-2 max-w-sm">
          <input
            className="field-input"
            placeholder="New group name (e.g. Quarterbacks)"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <button type="submit" disabled={loading} className="btn-secondary shrink-0">
            Add group
          </button>
        </form>
        {error && (
          <p className="text-sm mt-2" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </section>

      {canGrant && (
        <section className="card p-5 sm:p-6">
          <div className="mono text-text-3 mb-4">Permissions</div>
          <p className="text-text-2 text-sm mb-4">
            Give a specific capability to someone who isn&rsquo;t a head coach or admin — an assistant
            coach, a position coach, a video analyst — team-wide or scoped to one group.
          </p>

          {grants.length > 0 && (
            <ul className="space-y-1.5 text-sm mb-5">
              {grants.map((g) => (
                <li key={g.id} className="flex items-center justify-between">
                  <span>
                    {g.userName} <span className="text-text-3">· {g.permission}</span>{" "}
                    {g.positionGroupName && <span className="text-text-3">· {g.positionGroupName}</span>}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-text-3 hover:text-text-1"
                    disabled={loading}
                    onClick={() => revokeGrant(g.id)}
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}

          <GrantForm roster={roster} groups={groups} permissions={allPermissions} disabled={loading} onGrant={grantPermission} />
        </section>
      )}
    </div>
  );
}

function AddMemberForm({
  options,
  disabled,
  onAdd,
}: {
  options: RosterMember[];
  disabled: boolean;
  onAdd: (userId: string, groupRole: string) => void;
}) {
  const [userId, setUserId] = useState("");
  const [groupRole, setGroupRole] = useState<string>("ATHLETE");

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select className="field-input" value={userId} onChange={(e) => setUserId(e.target.value)}>
        <option value="">Add member…</option>
        {options.map((o) => (
          <option key={o.userId} value={o.userId}>
            {o.name}
          </option>
        ))}
      </select>
      <select className="field-input" value={groupRole} onChange={(e) => setGroupRole(e.target.value)}>
        {GROUP_ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn-secondary"
        disabled={disabled || !userId}
        onClick={() => {
          onAdd(userId, groupRole);
          setUserId("");
        }}
      >
        Add
      </button>
    </div>
  );
}

function GrantForm({
  roster,
  groups,
  permissions,
  disabled,
  onGrant,
}: {
  roster: RosterMember[];
  groups: Group[];
  permissions: readonly string[];
  disabled: boolean;
  onGrant: (userId: string, permission: string, positionGroupId: string | null) => void;
}) {
  const [userId, setUserId] = useState("");
  const [permission, setPermission] = useState<string>(permissions[0] ?? "");
  const [positionGroupId, setPositionGroupId] = useState<string>("");

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select className="field-input" value={userId} onChange={(e) => setUserId(e.target.value)}>
        <option value="">Choose person…</option>
        {roster.map((r) => (
          <option key={r.userId} value={r.userId}>
            {r.name}
          </option>
        ))}
      </select>
      <select className="field-input" value={permission} onChange={(e) => setPermission(e.target.value)}>
        {permissions.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <select className="field-input" value={positionGroupId} onChange={(e) => setPositionGroupId(e.target.value)}>
        <option value="">Team-wide</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name} only
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn-secondary"
        disabled={disabled || !userId || !permission}
        onClick={() => onGrant(userId, permission, positionGroupId || null)}
      >
        Grant
      </button>
    </div>
  );
}
