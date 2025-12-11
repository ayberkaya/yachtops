"use client";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-900">
      <div className="max-w-2xl space-y-4 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">HelmOps</p>
        <h1 className="text-3xl font-bold">Helm operations platform</h1>
        <p className="text-slate-600">
          Landing page geçici olarak sadeleştirildi. Uygulamaya giriş yapmak için lütfen{" "}
          <a className="text-blue-600 underline" href="/auth/signin">
            oturum açın
          </a>
          .
        </p>
      </div>
    </div>
  );
}
