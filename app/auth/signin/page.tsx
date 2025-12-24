"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, ArrowLeft } from "lucide-react";

// Chunk loading error handling - log only, no auto-reload to prevent loops
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  window.addEventListener("error", (event) => {
    const errorMessage = event.message || "";
    const isChunkError = errorMessage.includes("Failed to load chunk") || 
                         errorMessage.includes("turbopack");
    
    if (isChunkError) {
      console.error("[CHUNK ERROR] Chunk loading failed. This may indicate middleware is intercepting /_next/* paths.");
      console.error("[CHUNK ERROR] Check middleware.ts matcher excludes all /_next/* paths.");
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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  // Get callbackUrl from query params
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const url = params.get("callbackUrl");
      setCallbackUrl(url);
    }
  }, []);

  const addDebugLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setDebugLogs(prev => [...prev.slice(-9), logMessage]);
    if (typeof window !== "undefined") {
      const existing = JSON.parse(localStorage.getItem("signin-debug") || "[]");
      existing.push(logMessage);
      localStorage.setItem("signin-debug", JSON.stringify(existing.slice(-20)));
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

  const onSubmit = async (data: SignInForm) => {
    addDebugLog(`Form submitted with email: ${data.email}`);
    setIsLoading(true);
    setError(null);

    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }

    try {
      addDebugLog("Calling signIn('credentials')...");
      
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
        addDebugLog("Login successful, redirecting to dashboard...");
        
        // Determine redirect target: use callbackUrl if valid, otherwise default to /dashboard
        let target = "/dashboard";
        if (callbackUrl) {
          const decodedCallbackUrl = decodeURIComponent(callbackUrl);
          // Only allow safe redirects to dashboard or admin routes
          if (decodedCallbackUrl.startsWith("/admin") || decodedCallbackUrl.startsWith("/dashboard")) {
            target = decodedCallbackUrl;
            addDebugLog(`Using callbackUrl: ${target}`);
          }
        }
        
        // Refresh router to ensure session is updated
        router.refresh();
        
        // Force immediate redirect using router.replace (prevents back button issues)
        addDebugLog(`Redirecting to: ${target}`);
        router.replace(target);
        
        // Fallback: If router.replace doesn't work within 200ms, use window.location.replace
        setTimeout(() => {
          if (window.location.pathname === "/auth/signin") {
            addDebugLog("Router redirect didn't work, using window.location.replace as fallback");
            window.location.replace(target);
          }
        }, 200);
        
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
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side: Login Form */}
      <div className="flex items-center justify-center bg-white p-4 lg:p-8">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Back to Website Link */}
          <Link 
            href="/" 
            className="inline-flex items-center justify-center w-10 h-10 text-slate-600 hover:text-slate-900 hover:bg-stone-50 rounded-lg transition-all animate-fade-in-delay"
            aria-label="Back to website"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {/* Logo */}
          <div className="flex items-center space-x-3 animate-fade-in-delay-2">
            <div className="relative w-10 h-10">
              <Image
                src="/icon-192.png"
                alt="HelmOps Logo"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <span className="text-xl font-semibold text-slate-900 font-serif" style={{ fontFamily: 'var(--font-playfair), serif' }}>HelmOps</span>
          </div>

          {/* Heading */}
          <div className="space-y-2 animate-fade-in-delay-3">
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight font-serif" style={{ fontFamily: 'var(--font-playfair), serif' }}>
              Welcome Aboard
            </h1>
            <p className="text-slate-500 text-base">
              Enter your details to access the vessel dashboard.
            </p>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 animate-fade-in-delay-4">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 animate-fade-in">
                  {error}
                </div>
              )}

              {/* Debug Panel - Development Only */}
              {process.env.NODE_ENV === "development" && debugLogs.length > 0 && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs font-mono max-h-40 overflow-y-auto">
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
                  <FormItem className="animate-slide-in-left">
                    <FormLabel className="text-sm font-medium text-slate-900">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email address"
                        className="h-12 border-slate-200 focus:border-slate-900 focus:ring-slate-900 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 transition-all"
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
                  <FormItem className="animate-slide-in-left-delay">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-medium text-slate-900">Password</FormLabel>
                      <Link 
                        href="/auth/forgot-password" 
                        className="text-sm text-slate-600 hover:text-slate-900 hover:underline transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        className="h-12 border-slate-200 focus:border-slate-900 focus:ring-slate-900 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 transition-all"
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
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 animate-fade-in-delay-5">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal text-slate-700 cursor-pointer">
                        Remember me
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] animate-fade-in-delay-6"
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
            </form>
          </Form>

          {/* Footer */}
          <p className="text-sm text-slate-500 text-center animate-fade-in-delay-7">
            Don't have an account? Please contact your administrator.
          </p>
        </div>
      </div>

      {/* Right Side: Image with Overlay */}
      <div className="hidden lg:block relative h-screen animate-fade-in-right">
        {/* Background Image - Using local yacht image */}
        <div 
          className="absolute inset-0 bg-cover bg-center animate-zoom-in"
          style={{
            backgroundImage: "url(/login-hero.png)",
          }}
        />
        
        {/* Dark Navy Overlay */}
        <div className="absolute inset-0 bg-slate-900/50 animate-fade-in" />
        
        {/* Quote at Bottom Right */}
        <div className="absolute bottom-8 right-8 max-w-md text-right animate-fade-in-up-delay">
          <p className="text-white text-xl font-serif italic leading-relaxed" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            "The ultimate operating system for the modern superyacht."
          </p>
          <p className="text-white/80 text-sm mt-2">— HelmOps</p>
        </div>
      </div>
    </div>
  );
}
