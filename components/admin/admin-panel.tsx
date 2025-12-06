/* Admin Panel - super admin only */
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Owner = {
  id: string;
  name: string | null;
  email: string;
  yachtId: string | null;
  active: boolean;
  createdAt: string;
};

export default function AdminPanel() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", tenantId: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const loadOwners = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/owners", { cache: "no-store" });
      const data = await res.json();
      setOwners(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOwners();
  }, []);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.tenantId || !form.password) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create owner");
      setForm({ name: "", email: "", tenantId: "", password: "" });
      await loadOwners();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (ownerId: string, active: boolean) => {
    const prev = owners;
    setOwners((o) => o.map((x) => (x.id === ownerId ? { ...x, active } : x)));
    try {
      const res = await fetch(`/api/admin/owners/${ownerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) {
        throw new Error("Failed to toggle");
      }
    } catch (e) {
      console.error(e);
      setOwners(prev);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Owner List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p>Loading...</p>
          ) : owners.length === 0 ? (
            <p>No owners found</p>
          ) : (
            owners.map((owner) => (
              <div
                key={owner.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <div className="font-medium">{owner.name || "Unnamed"}</div>
                  <div className="text-sm text-muted-foreground">{owner.email}</div>
                  <div className="text-xs text-muted-foreground">
                    tenantId: {owner.yachtId || "-"}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={owner.active}
                    onCheckedChange={(val) => toggleActive(owner.id, !!val)}
                  />
                  Active
                </label>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Owner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
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
              <Label>Tenant ID</Label>
              <Input
                value={form.tenantId}
                onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value }))}
              />
            </div>
            <div>
              <Label>Temp Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={submitting}>
            {submitting ? "Creating..." : "Create Owner"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

