import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-white border-t border-stone-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative w-8 h-8">
                <Image
                  src="/icon-192.png"
                  alt="HelmOps Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <span className="text-sm font-semibold text-slate-900 font-serif" style={{ fontFamily: 'var(--font-playfair), serif' }}>HelmOps</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <Link href="/contact" className="hover:text-slate-900 transition-colors">Contact</Link>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-stone-200 text-center text-sm text-slate-500">
          <p>© 2024 HelmOps. Crafted for the seas.</p>
        </div>
      </div>
    </footer>
  );
}

