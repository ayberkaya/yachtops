import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { getTenantId } from "@/lib/tenant";
import { withTenantScope } from "@/lib/tenant-guard";
import { QuoteForm } from "@/components/quotes/quote-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string; quoteId: string }>;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!hasPermission(session.user, "quotes.edit", session.user.permissions)) {
    redirect("/dashboard/quotes");
  }

  const tenantId = getTenantId(session);
  if (!tenantId) {
    redirect("/dashboard/quotes");
  }

  const { id, quoteId } = await params;

  const workRequest = await db.workRequest.findFirst({
    where: withTenantScope(session, { id }),
    select: {
      id: true,
      title: true,
      description: true,
    },
  });

  if (!workRequest) {
    redirect("/dashboard/quotes");
  }

  const quote = await db.quote.findFirst({
    where: withTenantScope(session, { id: quoteId, workRequestId: id }),
    include: {
      vendor: true,
      documents: true,
    },
  });

  if (!quote) {
    redirect(`/dashboard/quotes/${id}`);
  }

  const initialData = {
    id: quote.id,
    workRequestId: quote.workRequestId,
    vendorId: quote.vendorId,
    title: quote.title,
    description: quote.description,
    productService: quote.productService,
    amount: quote.amount,
    currency: quote.currency,
    deliveryTime: quote.deliveryTime,
    warranty: quote.warranty,
    notes: quote.notes,
    documents: quote.documents,
  };

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
          <h1 className="text-2xl font-bold">Teklifi Düzenle</h1>
        </div>
        <p className="text-muted-foreground">
          <span className="font-medium">{workRequest.title}</span> için teklif bilgilerini güncelleyin
        </p>
      </div>

      <QuoteForm
        workRequestId={id}
        initialData={initialData}
        onSuccess={() => {
          // Success handled by component
        }}
      />
    </div>
  );
}

