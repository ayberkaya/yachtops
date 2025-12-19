"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Anchor, Loader2 } from "lucide-react";

// Chunk loading error handling - log only, no auto-reload to prevent loops
// If chunks fail to load, it's usually a middleware/config issue that needs fixing
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  window.addEventListener("error", (event) => {
    const errorMessage = event.message || "";
    const isChunkError = errorMessage.includes("Failed to load chunk") || 
                         errorMessage.includes("turbopack");
    
    if (isChunkError) {
      console.error("[CHUNK ERROR] Chunk loading failed. This may indicate middleware is intercepting /_next/* paths.");
      console.error("[CHUNK ERROR] Check middleware.ts matcher excludes all /_next/* paths.");
      // Don't auto-reload - let user manually refresh after fix
    }
  }, true);
}

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean(),
});

type SignInForm = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const router = useRouter();
  // DISABLED: useSession to prevent redirect loops
  // Server-side redirect in auth/layout.tsx handles authenticated users
  // const { data: session, status, update } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const hasRedirectedRef = useRef(false); // Prevent infinite redirects
  
  // Get callbackUrl from query params
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);
  
  useEffect(() => {
    // Get callbackUrl from URL search params
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const url = params.get("callbackUrl");
      setCallbackUrl(url);
    }
  }, []);

  // Debug log helper that persists logs - memoized to prevent infinite loops
  const addDebugLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setDebugLogs(prev => [...prev.slice(-9), logMessage]); // Keep last 10 logs
    // Also store in localStorage for persistence
    if (typeof window !== "undefined") {
      const existing = JSON.parse(localStorage.getItem("signin-debug") || "[]");
      existing.push(logMessage);
      localStorage.setItem("signin-debug", JSON.stringify(existing.slice(-20))); // Keep last 20
    }
  }, []);

  const form = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // Handle redirect ONLY after successful login (not for already authenticated users)
  // Authenticated users should be handled by server-side redirects, not client-side
  // This prevents redirect loops
  
  // CRITICAL: Prevent redirect loop - if user is already authenticated, let server-side redirect handle it
  // Don't do any client-side redirects for authenticated users
  // REMOVED: useEffect that was causing redirect loops
  // Server-side redirect in auth/layout.tsx should handle authenticated users

  const onSubmit = async (data: SignInForm) => {
    addDebugLog(`Form submitted with email: ${data.email}`);
    setIsLoading(true);
    setError(null);

    // Clear any existing timeout
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }

    try {
      addDebugLog("Calling signIn('credentials')...");
      
      // Determine redirect target - use callbackUrl if valid, otherwise default to dashboard
      let target = "/dashboard";
      if (callbackUrl) {
        const decodedCallbackUrl = decodeURIComponent(callbackUrl);
        // Only use callbackUrl if it's a valid route
        if (decodedCallbackUrl.startsWith("/admin") || decodedCallbackUrl.startsWith("/dashboard") || decodedCallbackUrl.startsWith("/")) {
          target = decodedCallbackUrl;
        }
      }
      
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe.toString(),
        redirect: false,
      });

      addDebugLog(`signIn result: ${JSON.stringify({ ok: result?.ok, error: result?.error })}`);

      if (result?.error) {
        addDebugLog(`ERROR: ${result.error}`);
        setError("Invalid email or password");
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        addDebugLog("Login successful, waiting for cookie to be set...");
        setIsLoading(false);
        
        // CRITICAL FIX: Wait for cookie to be set before redirecting
        // signIn with redirect: false sets cookie via API call to /api/auth/callback/credentials
        // This is async, so we need to wait for it to complete before redirecting
        // Use a sufficient timeout to ensure the API call completes and cookie is set
        
        // Wait 800ms for the signIn API call to complete and set the HttpOnly cookie
        // This gives enough time for the API response to be processed and cookie to be set
        // Then use window.location.href (full page nav) to ensure cookies are sent with the request
        setTimeout(() => {
          addDebugLog(`Redirecting to: ${target}`);
          // Use window.location.href for full page navigation - ensures cookies are sent
          // This prevents the middleware redirect loop by ensuring cookie is available
          window.location.href = target;
        }, 800);
        
        return;
      }

      setError("An error occurred. Please try again.");
      setIsLoading(false);
    } catch (err) {
      console.error("Sign in error:", err);
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white via-blue-50/30 to-white p-4 relative overflow-hidden">
      {/* Background - Subtle geometric patterns */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-100/40 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-100/40 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-purple-100/30 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10" style={{ animation: 'fadeInUp 0.6s ease-out 0.2s forwards', opacity: 0 }}>
        {/* Logo Section */}
        <div className="text-center mb-10" style={{ animation: 'fadeInDown 0.8s ease-out 0.4s forwards', opacity: 0 }}>
          <Link href="/" className="inline-block cursor-pointer hover:scale-105 transition-transform duration-300">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-xl mb-6 hover:shadow-2xl transition-all duration-300" style={{ animation: 'zoomIn 0.6s ease-out 0.6s forwards', opacity: 0 }}>
              <Anchor className="text-white w-10 h-10" />
            </div>
          </Link>
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent mb-3">
            HelmOps
          </h1>
          <p className="text-lg text-slate-600 font-medium">
            Manage expenses, tasks, and operations for your yacht
          </p>
        </div>

        <Card className="border-2 border-slate-200 shadow-2xl bg-white" style={{ animation: 'fadeInUp 0.8s ease-out 0.3s forwards', opacity: 0 }}>
          <CardHeader className="space-y-2 pb-0">
            <CardTitle className="text-3xl font-bold text-slate-900">Sign In</CardTitle>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                {error && (
                  <div className="rounded-xl bg-red-50 border-2 border-red-200 p-4 text-sm text-red-700 font-medium" style={{ animation: 'fadeIn 0.3s ease-out forwards' }}>
                    {error}
                  </div>
                )}
                {/* Debug Panel - Development Only */}
                {process.env.NODE_ENV === "development" && debugLogs.length > 0 && (
                  <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-4 text-xs font-mono max-h-40 overflow-y-auto">
                    <div className="font-semibold text-slate-700 mb-2">Debug Logs:</div>
                    {debugLogs.map((log, idx) => (
                      <div key={idx} className="text-slate-600 mb-1">{log}</div>
                    ))}
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem style={{ animation: 'fadeInLeft 0.6s ease-out 0.5s forwards', opacity: 0 }}>
                      <FormLabel className="text-sm font-semibold text-slate-900">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email address"
                          className="h-12 text-base border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-white text-slate-900 placeholder:text-slate-400"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem style={{ animation: 'fadeInLeft 0.6s ease-out 0.7s forwards', opacity: 0 }}>
                      <FormLabel className="text-sm font-semibold text-slate-900">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          className="h-12 text-base border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-white text-slate-900 placeholder:text-slate-400"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem 
                      className="flex flex-row items-start space-x-3 space-y-0 pt-2"
                      style={{ animation: 'fadeInLeft 0.6s ease-out 0.9s forwards', opacity: 0 }}
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                          className="mt-0.5"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none flex-1">
                        <FormLabel 
                          className="text-sm font-normal text-slate-700 cursor-pointer"
                          onClick={() => field.onChange(!field.value)}
                        >
                          Remember me
                        </FormLabel>
                        <p className="text-xs text-slate-500">
                          Keep me signed in for 30 days
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 pt-6">
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-0"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 space-y-2" style={{ animation: 'fadeIn 1s ease-out 1s forwards', opacity: 0 }}>
          <p className="text-sm text-slate-600 font-medium">
            For private and charter yachts
          </p>
          <p className="text-sm text-slate-600">Don't have an account? Please contact your administrator.</p>
        </div>
      </div>
    </div>
  );
}
