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
      setMessage("Lütfen tüm alanları doldurun.");
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
        setMessage(data?.error || "Kullanıcı oluşturulamadı");
      } else {
        setMessage("Kullanıcı ve vessel oluşturuldu.");
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
      setMessage("Hata oluştu, lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Yeni Kullanıcı + Vessel Oluştur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Ad Soyad</Label>
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
              <Label>Kullanıcı adı (giriş)</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div>
              <Label>Şifre</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div>
              <Label>Vessel adı</Label>
              <Input
                value={form.vesselName}
                onChange={(e) => setForm((f) => ({ ...f, vesselName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Vessel flag</Label>
              <Input
                value={form.vesselFlag}
                onChange={(e) => setForm((f) => ({ ...f, vesselFlag: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={submitting}>
            {submitting ? "Oluşturuluyor..." : "Kullanıcı Oluştur"}
          </Button>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uygulama Ayarları</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Buraya uygulama genel ayarları ve yönetim araçları eklenebilir.
        </CardContent>
      </Card>
    </div>
  );
}

