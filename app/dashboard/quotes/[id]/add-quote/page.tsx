"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { QuoteForm } from "@/components/quotes/quote-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { hasPermission } from "@/lib/permissions";

export default function AddQuotePage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [workRequest, setWorkRequest] = useState<{ id: string; title: string; description: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const id = params?.id as string;

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    if (!hasPermission(session.user, "quotes.create", session.user.permissions)) {
      router.push("/dashboard/quotes");
      return;
    }

    const fetchWorkRequest = async () => {
      try {
        const response = await fetch(`/api/work-requests/${id}`);
        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            setWorkRequest(data);
          }
        } else {
          router.push("/dashboard/quotes");
        }
      } catch (error) {
        console.error("Error fetching work request:", error);
        router.push("/dashboard/quotes");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchWorkRequest();
    }
  }, [session, status, router, id]);

  if (isLoading || !workRequest) {
    return (
      <div className="container mx-auto py-6 max-w-3xl">
        <div className="text-center">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <div className="mb-6">
        <Link href={`/dashboard/quotes/${id}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            İş Talebine Dön
          </Button>
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Yeni Teklif Ekle</h1>
        </div>
        <p className="text-muted-foreground">
          <span className="font-medium">{workRequest.title}</span> için firma teklifi ekleyin
        </p>
      </div>

      <QuoteForm
        workRequestId={id}
        showAddAnother={true}
      />
    </div>
  );
}

