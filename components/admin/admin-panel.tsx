/* Admin Panel - super admin only */
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type UserForm = {
  name: string;
  email: string;
  username: string;
  password: string;
  vesselName: string;
  vesselFlag: string;
};

export default function AdminPanel() {
  const [form, setForm] = useState<UserForm>({
    name: "",
    email: "",
    username: "",
    password: "",
    vesselName: "",
    vesselFlag: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleCreate = async () => {
    setMessage(null);
    if (!form.name || !form.email || !form.username || !form.password || !form.vesselName || !form.vesselFlag) {
      setMessage("Please fill in all fields.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || "User creation failed");
      } else {
        setMessage("User and vessel created.");
        setForm({
          name: "",
          email: "",
          username: "",
          password: "",
          vesselName: "",
          vesselFlag: "",
        });
      }
    } catch (e) {
      setMessage("An error occurred, please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
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
              <Label>Username (login)</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
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

      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Add global app settings and admin tools here.
        </CardContent>
      </Card>
    </div>
  );
}

