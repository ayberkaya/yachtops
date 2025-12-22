import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Anchor, 
  DollarSign, 
  CheckSquare, 
  FileText, 
  Users, 
  Shield, 
  Smartphone,
  Lock,
  Route,
  Package
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-100 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                <Anchor className="text-white w-5 h-5" />
              </div>
              <span className="text-lg font-semibold text-slate-900">HelmOps</span>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" asChild className="text-slate-600 hover:text-slate-900">
                <Link href="/contact">Contact</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="text-slate-600 hover:text-slate-900">
                <Link href="/demo-request">Demo</Link>
              </Button>
              <Button asChild size="sm" className="bg-slate-900 hover:bg-slate-800 text-white">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-50 rounded-full blur-3xl opacity-50" />
        </div>
        
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 mb-5 leading-tight tracking-tight">
            Yacht Operations
            <br />
            <span className="text-blue-600">Management Made Simple</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Complete solution for expense tracking, task management, and crew coordination. 
            Trusted by yacht owners and captains worldwide.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-16">
            <Button asChild size="lg" className="bg-slate-900 hover:bg-slate-800 text-white px-6">
              <Link href="/auth/signin">Get Started</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-6 border-slate-200 hover:bg-slate-50">
              <Link href="/demo-request">Request Demo</Link>
            </Button>
          </div>

          {/* Trust Indicators - Minimal */}
          <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-500 pt-8 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-slate-400" />
              <span>Offline Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400" />
              <span>GDPR Compliant</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Simplified */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
              Everything You Need
            </h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">
              Comprehensive tools designed specifically for yacht operations.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Expense Management</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Track expenses, receipts, and approvals with complete audit trails.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                <CheckSquare className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Task Management</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Assign tasks, track progress, and ensure nothing falls through the cracks.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Document Management</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Organize receipts, certificates, and compliance documents securely.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Crew Coordination</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Manage schedules, shifts, permissions, and certifications.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                <Route className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Voyage Planning</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Plan trips, estimate fuel costs, and generate post-voyage reports.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Inventory Management</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Track stock levels and get low-stock alerts automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Minimal */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-slate-300 mb-8 max-w-xl mx-auto">
            Join yacht operations teams worldwide who trust HelmOps.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-slate-100 px-6">
              <Link href="/auth/signin">Sign In</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-700 text-white hover:bg-slate-800 px-6">
              <Link href="/demo-request">Request Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="bg-white border-t border-slate-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                <Anchor className="text-white w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-slate-900">HelmOps</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-slate-600">
              <Link href="/contact" className="hover:text-slate-900 transition-colors">Contact</Link>
              <Link href="/demo-request" className="hover:text-slate-900 transition-colors">Demo</Link>
              <Link href="/fleet-solutions" className="hover:text-slate-900 transition-colors">Fleet</Link>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-100 text-center text-sm text-slate-500">
            <p>© {new Date().getFullYear()} HelmOps. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
