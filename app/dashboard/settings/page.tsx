import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function SettingsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const yacht = session.user.yachtId
    ? await db.yacht.findUnique({
        where: { id: session.user.yachtId },
      })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and yacht settings</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p>{session.user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p>{session.user.name || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Role</p>
              <p className="capitalize">{session.user.role.toLowerCase()}</p>
            </div>
            <div className="pt-4">
              <Button asChild variant="outline">
                <Link href="/dashboard/settings/password">Change Password</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {yacht && (
          <Card>
            <CardHeader>
              <CardTitle>Yacht Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p>{yacht.name}</p>
              </div>
              {yacht.flag && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Flag</p>
                  <p>{yacht.flag}</p>
                </div>
              )}
              {yacht.length && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Length</p>
                  <p>{yacht.length} meters</p>
                </div>
              )}
              {yacht.registrationNumber && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Registration</p>
                  <p>{yacht.registrationNumber}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

