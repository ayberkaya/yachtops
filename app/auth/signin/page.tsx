"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Anchor, Loader2, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect } from "react";

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignInForm = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignInForm) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        console.error("Sign in error:", result.error);
        setError("Invalid email or password");
        setIsLoading(false);
      } else if (result?.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError("An error occurred. Please try again.");
        setIsLoading(false);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white via-blue-50/30 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative overflow-hidden">
      {/* Light Mode Background - Subtle geometric patterns */}
      <div className="fixed inset-0 -z-10 dark:hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-100/40 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-100/40 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-purple-100/30 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      {/* Dark Mode Background */}
      <div className="fixed inset-0 -z-10 hidden dark:block">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Theme Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-lg"
          title={mounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {mounted && theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="w-full max-w-md relative z-10" style={{ animation: 'fadeInUp 0.6s ease-out 0.2s forwards', opacity: 0 }}>
        {/* Logo Section */}
        <div className="text-center mb-10" style={{ animation: 'fadeInDown 0.8s ease-out 0.4s forwards', opacity: 0 }}>
          <Link href="/" className="inline-block cursor-pointer hover:scale-105 transition-transform duration-300">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-xl mb-6 hover:shadow-2xl transition-all duration-300" style={{ animation: 'zoomIn 0.6s ease-out 0.6s forwards', opacity: 0 }}>
              <Anchor className="text-white w-10 h-10" />
            </div>
          </Link>
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-100 dark:to-white bg-clip-text text-transparent mb-3">
            YachtOps
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">
            Complete yacht operations management system
          </p>
        </div>

        <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-2xl bg-white dark:bg-slate-800" style={{ animation: 'fadeInUp 0.8s ease-out 0.3s forwards', opacity: 0 }}>
          <CardHeader className="space-y-2 pb-6">
            <CardTitle className="text-3xl font-bold text-slate-900 dark:text-slate-100">Welcome back</CardTitle>
            <CardDescription className="text-base text-slate-600 dark:text-slate-400">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                {error && (
                  <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400 font-medium" style={{ animation: 'fadeIn 0.3s ease-out forwards' }}>
                    {error}
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem style={{ animation: 'fadeInLeft 0.6s ease-out 0.5s forwards', opacity: 0 }}>
                      <FormLabel className="text-sm font-semibold text-slate-900 dark:text-slate-100">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          className="h-12 text-base border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                      <FormLabel className="text-sm font-semibold text-slate-900 dark:text-slate-100">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          className="h-12 text-base border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
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
        <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-8 font-medium" style={{ animation: 'fadeIn 1s ease-out 1s forwards', opacity: 0 }}>
          For private and charter yachts
        </p>
      </div>
    </div>
  );
}
