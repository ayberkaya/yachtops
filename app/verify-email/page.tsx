import { redirect } from "next/navigation";
import { verifyEmailToken } from "@/lib/email-verification";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = params?.token;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Invalid Verification Link
            </CardTitle>
            <CardDescription>
              The verification link is missing or invalid.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                Please check your email for the correct verification link, or contact support if you continue to experience issues.
              </AlertDescription>
            </Alert>
            <div className="mt-6 flex gap-3">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/login">Go to Login</Link>
              </Button>
              <Button asChild className="flex-1">
                <a href="mailto:support@helmops.com">Contact Support</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verify the token
  const verificationResult = await verifyEmailToken(token);

  if (!verificationResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Verification Failed
            </CardTitle>
            <CardDescription>
              The verification link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                This verification link may have expired (links are valid for 24 hours) or has already been used. Please contact support for assistance.
              </AlertDescription>
            </Alert>
            <div className="mt-6 flex gap-3">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/login">Go to Login</Link>
              </Button>
              <Button asChild className="flex-1">
                <a href="mailto:support@helmops.com">Contact Support</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect to set password page with token
  redirect(`/set-password?token=${token}`);
}

