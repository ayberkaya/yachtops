import { login } from "@/app/login/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/app/login/submit-button";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

interface LoginPageProps {
  searchParams: Promise<{ message?: string }> | { message?: string };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams;
  const errorMessage = params.message;

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

          {/* Error Message */}
          {errorMessage && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 animate-fade-in">
              {errorMessage}
            </div>
          )}

          {/* Form - Uses Server Action */}
          <form action={login} className="space-y-6 animate-fade-in-delay-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-900">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email address"
                required
                className="h-12 border-slate-200 focus:border-slate-900 focus:ring-slate-900 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-slate-900">
                  Password
                </Label>
                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm text-slate-600 hover:text-slate-900 hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
                className="h-12 border-slate-200 focus:border-slate-900 focus:ring-slate-900 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 transition-all"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <Label 
                htmlFor="rememberMe" 
                className="text-sm font-normal text-slate-700 cursor-pointer"
              >
                Remember me
              </Label>
            </div>

            <SubmitButton />
          </form>

          {/* Footer */}
          <p className="text-sm text-slate-500 text-center animate-fade-in-delay-7">
            Don't have an account? Please contact your administrator.
          </p>
        </div>
      </div>

      {/* Right Side: Image with Overlay */}
      <div className="hidden lg:block relative h-screen animate-fade-in-right">
        {/* Background Image */}
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

