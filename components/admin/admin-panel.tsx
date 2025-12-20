/* Admin Panel - super admin only */
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, UserPlus, ChevronDown, Trash2 } from "lucide-react";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ownerToDelete, setOwnerToDelete] = useState<OwnerItem | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        setMessage("Customer created successfully. They can now sign in and start using the app.");
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

  const handleDeleteClick = (owner: OwnerItem) => {
    setOwnerToDelete(owner);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ownerToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/owners/${ownerToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete owner");
      }

      // Remove owner from list
      setOwners((list) => list.filter((o) => o.id !== ownerToDelete.id));
      
      // If deleted owner was selected, clear selection
      if (selectedOwnerId === ownerToDelete.id) {
        setSelectedOwnerId(null);
      }

      setDeleteDialogOpen(false);
      setOwnerToDelete(null);
    } catch (e: any) {
      console.error("Delete error:", e);
      alert(e.message || "Failed to delete owner. Please try again.");
    } finally {
      setDeleting(false);
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
              <CardTitle>Create New Customer</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Creates a new vessel and owner account. Default expense categories will be set up automatically.
              </p>
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
                {submitting ? "Creating..." : "Create Customer"}
              </Button>
              {message && <p className="text-sm text-muted-foreground">{message}</p>}
            </CardContent>
          </Card>
        )}

        {view === "owners" && (
          <>
            {loadingOwners && (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  Loading owners...
                </CardContent>
              </Card>
            )}

            {!loadingOwners && owners.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Owners</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  No owners found.
                </CardContent>
              </Card>
            )}

            {!loadingOwners && owners.length > 0 && (
              <div className="space-y-3">
                {owners.map((owner) => (
                  <Collapsible
                    key={owner.id}
                    open={selectedOwnerId === owner.id}
                    onOpenChange={(open) => {
                      if (open) {
                        setSelectedOwnerId(owner.id);
                      } else if (selectedOwnerId === owner.id) {
                        setSelectedOwnerId(null);
                      }
                    }}
                  >
                    <Card className="gap-1.5 p-3">
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between py-1.5 px-0 min-h-0">
                          <div className="flex items-center gap-2">
                            <CardTitle className="m-0 text-base">{owner.name || "Unnamed"}</CardTitle>
                            {!owner.active && (
                              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                Inactive
                              </span>
                            )}
                          </div>
                          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 data-[state=open]:rotate-180" />
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-2 pt-0 px-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-muted-foreground">{owner.email}</div>
                              <div className="text-xs text-muted-foreground">
                                Tenant: {owner.yachtId || "-"}
                              </div>
                              {owner.users && owner.users.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {owner.users.length} user{owner.users.length !== 1 ? "s" : ""} in this vessel
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant={owner.active ? "secondary" : "default"}
                                onClick={() => toggleOwnerActive(owner.id, !owner.active)}
                              >
                                {owner.active ? "Deactivate" : "Activate"}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteClick(owner)}
                                title="Delete owner"
                                aria-label="Delete owner"
                                className="gap-2"
                              >
                                <Trash2 className="h-5 w-5 shrink-0 stroke-current" />
                                <span className="font-medium">Delete</span>
                              </Button>
                            </div>
                          </div>

                          {owner.users && owner.users.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-sm font-semibold">Users</div>
                              <div className="space-y-2">
                                {owner.users.map((u) => (
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
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Owner</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="text-sm text-muted-foreground space-y-3">
            <p>
              Are you sure you want to delete <strong>{ownerToDelete?.name || ownerToDelete?.email}</strong>?
            </p>
            <div>
              <p className="mb-2">This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>The owner account</li>
                <li>The associated vessel (yacht)</li>
                <li>All users in this vessel</li>
                <li>All data associated with this vessel (trips, tasks, expenses, etc.)</li>
              </ul>
            </div>
            <p className="text-destructive font-medium">This action cannot be undone.</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete Owner"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

