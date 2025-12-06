/* Admin Panel - super admin only */
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, UserPlus } from "lucide-react";

type UserForm = {
  name: string;
  email: string;
  password: string;
  vesselName: string;
  vesselFlag: string;
};

type TenantUser = {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  role: string;
  active: boolean;
  createdAt: string;
};

type OwnerItem = {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  role: string;
  yachtId: string | null;
  active: boolean;
  createdAt: string;
  users?: TenantUser[];
};

type AdminPanelProps = {
  view?: "create" | "owners";
};

export default function AdminPanel({ view = "create" }: AdminPanelProps) {
  const [form, setForm] = useState<UserForm>({
    name: "",
    email: "",
    password: "",
    vesselName: "",
    vesselFlag: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [owners, setOwners] = useState<OwnerItem[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);

  const handleCreate = async () => {
    setMessage(null);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      username: form.email.trim(), // use email as login
      password: form.password,
      vesselName: form.vesselName.trim(),
      vesselFlag: form.vesselFlag.trim(),
    };

    if (
      !payload.name ||
      !payload.email ||
      !payload.password ||
      !payload.vesselName ||
      !payload.vesselFlag
    ) {
      setMessage("Please fill in all fields.");
      return;
    }
    if (payload.password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        let serverMsg: string | null = null;
        try {
          const json = text ? JSON.parse(text) : null;
          const detail = json?.details?.fieldErrors
            ? Object.values<string[]>(json.details.fieldErrors)
                .flat()
                .filter(Boolean)
                .join(" ")
            : null;
          serverMsg = json?.error || detail || null;
        } catch (err) {
          serverMsg = null;
        }
        setMessage(serverMsg || "User creation failed");
      } else {
        setMessage("User and vessel created.");
        setForm({
          name: "",
          email: "",
          password: "",
          vesselName: "",
          vesselFlag: "",
        });
        await loadOwners();
      }
    } catch (e) {
      setMessage("An error occurred, please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const loadOwners = async () => {
    setLoadingOwners(true);
    try {
      const res = await fetch("/api/admin/owners?includeUsers=true", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to load owners (${res.status})`);
      }

      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      const safeOwners = Array.isArray(data) ? data : [];

      setOwners(safeOwners);
      if (!selectedOwnerId && safeOwners.length) {
        setSelectedOwnerId(safeOwners[0].id);
      }
    } catch (e) {
      console.error("loadOwners error", e);
      setOwners([]);
    } finally {
      setLoadingOwners(false);
    }
  };

  const toggleOwnerActive = async (ownerId: string, active: boolean) => {
    const prev = owners;
    setOwners((list) => list.map((o) => (o.id === ownerId ? { ...o, active } : o)));
    try {
      const res = await fetch(`/api/admin/owners/${ownerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("owner toggle failed");
    } catch (e) {
      console.error(e);
      setOwners(prev);
    }
  };

  const toggleUserActive = async (userId: string, active: boolean) => {
    const prev = owners;
    setOwners((list) =>
      list.map((o) => ({
        ...o,
        users: o.users?.map((u) => (u.id === userId ? { ...u, active } : u)),
      }))
    );
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("user toggle failed");
    } catch (e) {
      console.error(e);
      setOwners(prev);
    }
  };

  useEffect(() => {
    if (view === "owners") {
      loadOwners();
    }
  }, [view]);

  const selectedOwner = view === "owners" ? owners.find((o) => o.id === selectedOwnerId) || null : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {view === "create" ? <UserPlus className="h-4 w-4" /> : <Users className="h-4 w-4" />}
        <span>{view === "create" ? "Create User" : "Owners"}</span>
      </div>

      <div className="space-y-6">
        {view === "create" && (
          <Card>
            <CardHeader>
              <CardTitle>Create New User + Vessel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Vessel Name</Label>
                  <Input
                    value={form.vesselName}
                    onChange={(e) => setForm((f) => ({ ...f, vesselName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Vessel Flag</Label>
                  <Input
                    value={form.vesselFlag}
                    onChange={(e) => setForm((f) => ({ ...f, vesselFlag: e.target.value }))}
                  />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "Creating..." : "Create User"}
              </Button>
              {message && <p className="text-sm text-muted-foreground">{message}</p>}
            </CardContent>
          </Card>
        )}

        {view === "owners" && owners.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Owners</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              No owners found.
            </CardContent>
          </Card>
        )}

        {view === "owners" && selectedOwner && (
          <Card>
            <CardHeader>
              <CardTitle>Owner Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{selectedOwner.name || "Unnamed"}</div>
                  <div className="text-sm text-muted-foreground">{selectedOwner.email}</div>
                  <div className="text-xs text-muted-foreground">
                    Tenant: {selectedOwner.yachtId || "-"}
                  </div>
                </div>
                <Button
                  variant={selectedOwner.active ? "secondary" : "default"}
                  onClick={() => toggleOwnerActive(selectedOwner.id, !selectedOwner.active)}
                >
                  {selectedOwner.active ? "Deactivate Owner" : "Activate Owner"}
                </Button>
              </div>

              {selectedOwner.users && selectedOwner.users.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold">Users</div>
                  <div className="space-y-2">
                    {selectedOwner.users.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between rounded border p-2"
                      >
                        <div>
                          <div className="font-medium text-sm">
                            {u.name || u.username || u.email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {u.email} • {u.role}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={u.active ? "secondary" : "default"}
                          onClick={() => toggleUserActive(u.id, !u.active)}
                        >
                          {u.active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

