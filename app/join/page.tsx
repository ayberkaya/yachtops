import { redirect } from "next/navigation";
import { getInviteDetails, acceptInvite } from "@/actions/join";
import { JoinForm } from "@/components/crew/join-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or missing a token.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please check your invitation email and use the complete link provided.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get invite details
  const inviteDetails = await getInviteDetails(token);

  if (!inviteDetails.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              {inviteDetails.error || "This invitation is no longer valid."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {inviteDetails.error || "This invitation may have expired or already been used."}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Join {inviteDetails.yachtName}</CardTitle>
            <CardDescription>
              You've been invited to join as a {inviteDetails.role.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JoinForm
              token={token}
              email={inviteDetails.email}
              role={inviteDetails.role}
              yachtName={inviteDetails.yachtName}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

