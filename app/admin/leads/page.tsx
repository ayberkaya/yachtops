import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { createClient } from "@supabase/supabase-js";
import { Inbox } from "lucide-react";
import { LeadsTable } from "@/components/admin/leads-table";
import { ToastContainer } from "@/components/ui/toast";

export const dynamic = "force-dynamic";

interface Lead {
  id: string;
  full_name: string;
  email: string;
  type: "DEMO_REQUEST" | "CONTACT_INQUIRY";
  role: string | null;
  vessel_size: string | null;
  vessel_name: string | null;
  subject: string | null;
  message: string | null;
  status: string | null;
  admin_notes: string | null;
  created_at: string;
}

export default async function AdminLeadsPage() {
  const session = await getSession();
  
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  // Initialize Supabase Admin Client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return (
      <div className="p-6">
        <p className="text-red-600">Supabase credentials not configured.</p>
      </div>
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Fetch leads from Supabase
  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching leads:", error);
    return (
      <div className="p-6">
        <p className="text-red-600">Error loading leads: {error.message}</p>
      </div>
    );
  }

  const leadsData: Lead[] = (leads || []) as Lead[];

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Inbox className="w-6 h-6 text-slate-600" />
          <h1 className="text-3xl font-bold text-slate-900">Inbound Leads</h1>
        </div>

        {/* Interactive Table */}
        <LeadsTable leads={leadsData} />
      </div>
    </>
  );
}

