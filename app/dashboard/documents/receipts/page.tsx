import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ExpenseStatus } from "@prisma/client";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { hasPermission } from "@/lib/permissions";

export default async function ReceiptsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!session.user.yachtId) {
    redirect("/dashboard");
  }

  // Check permission
  if (!hasPermission(session.user, "documents.receipts.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  const receipts = await db.expenseReceipt.findMany({
    where: {
      expense: {
        yachtId: session.user.yachtId,
        status: ExpenseStatus.APPROVED,
      },
    },
    include: {
      expense: {
        select: {
          id: true,
          date: true,
          description: true,
          amount: true,
          currency: true,
          category: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground">
          Approved expense receipts and invoices
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receipts & Invoices</CardTitle>
          <CardDescription>
            All receipt photos from approved expenses, with date and category.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No approved receipts found yet.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {receipts.map((receipt) => (
                <Card key={receipt.id} className="overflow-hidden">
                  <CardContent className="p-3 space-y-2">
                    <div className="aspect-video w-full overflow-hidden rounded-md bg-muted">
                      {/* Simple image preview; data URL stored in fileUrl */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={receipt.fileUrl}
                        alt="Receipt"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {receipt.expense.category?.name ?? "Uncategorized"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(
                          new Date(receipt.expense.date),
                          "MMM d, yyyy"
                        )}{" "}
                        •{" "}
                        {receipt.expense.amount.toLocaleString("en-US", {
                          style: "currency",
                          currency: receipt.expense.currency,
                        })}
                      </p>
                      <p className="text-xs line-clamp-2">
                        {receipt.expense.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded{" "}
                        {format(new Date(receipt.uploadedAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <Link
                        href={receipt.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Open image
                      </Link>
                      <Link
                        href={`/dashboard/expenses/${receipt.expense.id}`}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        View expense
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


