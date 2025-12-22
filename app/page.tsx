import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Anchor, 
  DollarSign, 
  CheckSquare, 
  FileText, 
  Users, 
  Shield, 
  TrendingUp,
  Clock,
  Smartphone,
  Lock,
  Zap,
  BarChart3,
  MessageSquare,
  ShoppingCart,
  Wrench,
  Package,
  Route
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <Anchor className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-bold text-slate-900">HelmOps</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link href="/contact">Contact</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/demo-request">Demo</Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-100/40 via-transparent to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-100/40 via-transparent to-transparent rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-xl mb-6">
            <Anchor className="text-white w-10 h-10" />
          </div>
          
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-[0.3em] mb-4">
            Professional Yacht Operations
          </p>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 mb-6 leading-tight">
            Streamline Your Yacht
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Operations Management
            </span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            Complete solution for expense tracking, task management, crew coordination, 
            and operational excellence. Trusted by yacht owners, captains, and crew worldwide.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-lg px-8 py-6 h-auto shadow-xl">
              <Link href="/auth/signin">Get Started</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 h-auto border-2">
              <Link href="/demo-request">Request Demo</Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 pt-16 border-t border-slate-200">
            <p className="text-sm text-slate-500 mb-8">Trusted by yacht operations teams</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900">100%</div>
                <div className="text-sm text-slate-600 mt-1">Secure</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900">24/7</div>
                <div className="text-sm text-slate-600 mt-1">Support</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900">Offline</div>
                <div className="text-sm text-slate-600 mt-1">Capable</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900">GDPR</div>
                <div className="text-sm text-slate-600 mt-1">Compliant</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Everything You Need to Run Smooth Operations
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Comprehensive tools designed specifically for yacht operations, 
              from expense management to crew coordination.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-2 hover:border-blue-200 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                  <DollarSign className="text-white w-6 h-6" />
                </div>
                <CardTitle>Expense Management</CardTitle>
                <CardDescription>
                  Track expenses, receipts, approvals, and reimbursements with complete audit trails.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                  <CheckSquare className="text-white w-6 h-6" />
                </div>
                <CardTitle>Task Management</CardTitle>
                <CardDescription>
                  Assign tasks, track progress, and ensure nothing falls through the cracks.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                  <FileText className="text-white w-6 h-6" />
                </div>
                <CardTitle>Document Management</CardTitle>
                <CardDescription>
                  Organize receipts, certificates, permits, and compliance documents securely.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                  <Users className="text-white w-6 h-6" />
                </div>
                <CardTitle>Crew Coordination</CardTitle>
                <CardDescription>
                  Manage crew schedules, shifts, permissions, and certifications.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                  <Route className="text-white w-6 h-6" />
                </div>
                <CardTitle>Voyage Planning</CardTitle>
                <CardDescription>
                  Plan trips, estimate fuel costs, track routes, and generate post-voyage reports.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                  <Package className="text-white w-6 h-6" />
                </div>
                <CardTitle>Inventory Management</CardTitle>
                <CardDescription>
                  Track stock levels, manage provisions, and get low-stock alerts automatically.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                  <MessageSquare className="text-white w-6 h-6" />
                </div>
                <CardTitle>Team Communication</CardTitle>
                <CardDescription>
                  Real-time messaging, channels, and notifications to keep everyone connected.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                  <Wrench className="text-white w-6 h-6" />
                </div>
                <CardTitle>Maintenance Tracking</CardTitle>
                <CardDescription>
                  Schedule maintenance, track service history, and ensure vessel compliance.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                  <BarChart3 className="text-white w-6 h-6" />
                </div>
                <CardTitle>Analytics & Reporting</CardTitle>
                <CardDescription>
                  Generate monthly reports, track performance metrics, and make data-driven decisions.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Why Choose HelmOps?
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Built specifically for yacht operations with security, reliability, and ease of use in mind.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Shield className="text-white w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Enterprise Security</h3>
              <p className="text-slate-600">
                Bank-level encryption, role-based access control, and GDPR compliance.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Smartphone className="text-white w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Works Offline</h3>
              <p className="text-slate-600">
                Full functionality even without internet. Syncs automatically when online.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Zap className="text-white w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Lightning Fast</h3>
              <p className="text-slate-600">
                Optimized performance with instant loading and real-time updates.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Lock className="text-white w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Data Privacy</h3>
              <p className="text-slate-600">
                Your data stays yours. No third-party sharing, complete control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-cyan-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Operations?
          </h2>
          <p className="text-xl text-blue-50 mb-10 max-w-2xl mx-auto">
            Join yacht operations teams worldwide who trust HelmOps for their daily operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary" className="text-lg px-8 py-6 h-auto">
              <Link href="/auth/signin">Start Free Trial</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 h-auto border-2 border-white text-white hover:bg-white/10">
              <Link href="/demo-request">Schedule Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                  <Anchor className="text-white w-6 h-6" />
                </div>
                <span className="text-xl font-bold text-white">HelmOps</span>
              </div>
              <p className="text-sm text-slate-400">
                Professional yacht operations management platform.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/demo-request" className="hover:text-white transition-colors">Demo</Link></li>
                <li><Link href="/fleet-solutions" className="hover:text-white transition-colors">Fleet Solutions</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Security</h3>
              <ul className="space-y-2 text-sm">
                <li className="text-slate-400">GDPR Compliant</li>
                <li className="text-slate-400">SOC 2 Ready</li>
                <li className="text-slate-400">Bank-Level Encryption</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
            <p>© {new Date().getFullYear()} HelmOps. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
