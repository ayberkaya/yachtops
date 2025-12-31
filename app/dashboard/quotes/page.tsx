"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { WorkRequestList } from "@/components/quotes/work-request-list";
import { VendorManagement } from "@/components/quotes/vendor-management";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkRequestStatus, WorkRequestCategory, WorkRequestPriority } from "@prisma/client";

interface WorkRequest {
  id: string;
  title: string;
  description: string | null;
  category: WorkRequestCategory | null;
  priority: WorkRequestPriority;
  component: string | null;
  location: string | null;
  requestedCompletionDate: string | null;
  estimatedBudgetMin: number | null;
  estimatedBudgetMax: number | null;
  currency: string;
  status: WorkRequestStatus;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string } | null;
  quotes: Array<{ id: string; vendor: { name: string } }>;
}

export default function QuotesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [workRequests, setWorkRequests] = useState<WorkRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("work-requests");
  const [customRolePermissions, setCustomRolePermissions] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    // Fetch user's custom role permissions if they have a custom role
    const fetchCustomRolePermissions = async () => {
      try {
        const response = await fetch("/api/users/me");
        if (response.ok) {
          const userData = await response.json();
          if (userData.customRole?.permissions) {
            setCustomRolePermissions(userData.customRole.permissions);
          }
        }
      } catch (error) {
        console.error("Error fetching custom role permissions:", error);
      }
    };

    fetchCustomRolePermissions();
  }, [session, status]);

  useEffect(() => {
    if (status === "loading" || !session?.user) return;

    if (!hasPermission(session.user, "quotes.view", session.user.permissions, customRolePermissions)) {
      router.push("/dashboard");
      return;
    }

    const fetchWorkRequests = async () => {
      try {
        const response = await fetch("/api/work-requests");
        if (response.ok) {
          // Check if response is JSON before parsing
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            try {
              const data = await response.json();
              setWorkRequests(data);
            } catch (jsonError) {
              console.error("Failed to parse JSON response:", jsonError);
              const text = await response.text();
              console.error("Non-JSON response:", text.substring(0, 200));
            }
          } else {
            const text = await response.text();
            console.error("Non-JSON response received:", text.substring(0, 200));
          }
        }
      } catch (error) {
        console.error("Error fetching work requests:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkRequests();
  }, [session, status, customRolePermissions]);

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-8">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Teklif Yönetimi</h1>
        <p className="text-muted-foreground mt-2">
          İş talepleri oluşturun ve firmalardan teklif toplayın
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="work-requests">İş Talepleri</TabsTrigger>
          <TabsTrigger value="vendors">Firmalar</TabsTrigger>
        </TabsList>
        <TabsContent value="work-requests">
          <WorkRequestList initialWorkRequests={workRequests} />
        </TabsContent>
        <TabsContent value="vendors">
          <VendorManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}

