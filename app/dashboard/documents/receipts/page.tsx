import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ExpenseStatus } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { ReceiptsView } from "@/components/documents/receipts-view";

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
        deletedAt: null, // Exclude soft-deleted expenses
      },
      deletedAt: null, // Exclude soft-deleted receipts
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
        <h1 className="text-3xl font-bold">Financial Documents</h1>
        <p className="text-muted-foreground">
          Approved expense receipts, invoices, and supporting files
        </p>
      </div>

      <ReceiptsView receipts={receipts.map((receipt: { id: string; uploadedAt: Date; expense: { id: string; date: Date; description: string | null; amount: string | number; currency: string; category: { id: string; name: string } } }) => ({
        id: receipt.id,
        uploadedAt: receipt.uploadedAt,
        expense: {
          id: receipt.expense.id,
          date: receipt.expense.date,
          description: receipt.expense.description,
          amount: receipt.expense.amount,
          currency: receipt.expense.currency,
          category: receipt.expense.category,
        },
      }))} />
    </div>
  );
}


