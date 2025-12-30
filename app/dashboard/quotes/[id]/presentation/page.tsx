import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { getTenantId } from "@/lib/tenant";
import { withTenantScope } from "@/lib/tenant-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PrintButton } from "@/components/quotes/print-button";

export default async function PresentationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!hasPermission(session.user, "quotes.view", session.user.permissions)) {
    redirect("/dashboard/quotes");
  }

  const tenantId = getTenantId(session);
  if (!tenantId) {
    redirect("/dashboard/quotes");
  }

  const { id } = await params;

  const workRequest = await db.workRequest.findFirst({
    where: withTenantScope(session, { id }),
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      quotes: {
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              contactPerson: true,
              email: true,
              phone: true,
            },
          },
          documents: {
            orderBy: { uploadedAt: "desc" },
          },
        },
        orderBy: { amount: "asc" },
      },
    },
  });

  if (!workRequest) {
    redirect("/dashboard/quotes");
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href={`/dashboard/quotes/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Geri
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mt-4">{workRequest.title}</h1>
          <p className="text-muted-foreground mt-2">
            {workRequest.description || "Teklif karşılaştırması"}
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>İş Talebi Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Oluşturan</p>
                <p>{workRequest.createdBy?.name || workRequest.createdBy?.email || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tarih</p>
                <p>{format(new Date(workRequest.createdAt), "dd MMM yyyy")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {workRequest.quotes.map((quote: {
            id: string;
            title: string;
            description: string | null;
            productService: string | null;
            amount: number;
            currency: string;
            vatIncluded: boolean;
            deliveryTime: string | null;
            warranty: string | null;
            notes: string | null;
            vendor: {
              id: string;
              name: string;
              contactPerson: string | null;
              email: string | null;
              phone: string | null;
            };
            documents: Array<{
              id: string;
              title: string | null;
            }>;
          }) => (
            <Card key={quote.id} className="print:break-inside-avoid">
              <CardHeader>
                <CardTitle className="text-xl">{quote.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {quote.vendor.name}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Fiyat</p>
                  <p className="text-2xl font-bold">
                    {Number(quote.amount).toLocaleString("tr-TR", {
                      style: "currency",
                      currency: quote.currency,
                    })}
                    <span className="text-xs text-muted-foreground ml-1">
                      {quote.vatIncluded ? "(KDV Dahil)" : "(+ KDV)"}
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Ürün/Hizmet</p>
                    <p>{quote.productService || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Teslim Süresi</p>
                    <p>{quote.deliveryTime || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Garanti</p>
                    <p>{quote.warranty || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">İletişim</p>
                    <p className="text-xs">
                      {quote.vendor.contactPerson || "-"}
                      {quote.vendor.email && `\n${quote.vendor.email}`}
                      {quote.vendor.phone && `\n${quote.vendor.phone}`}
                    </p>
                  </div>
                </div>

                {quote.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Açıklama</p>
                    <p className="text-sm whitespace-pre-wrap">{quote.description}</p>
                  </div>
                )}

                {quote.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notlar</p>
                    <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
                  </div>
                )}

                {quote.documents.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Dosyalar</p>
                    <div className="space-y-1">
                      {quote.documents.map((doc: { id: string; title: string | null }) => (
                        <a
                          key={doc.id}
                          href={`/api/quotes/${quote.id}/document/${doc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-blue-600 hover:underline"
                        >
                          {doc.title || "Dosya"}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {workRequest.quotes.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Henüz teklif eklenmemiş
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

