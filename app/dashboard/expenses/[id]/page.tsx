import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { ExpenseDetail } from "@/components/expenses/expense-detail";
import { hasPermission } from "@/lib/permissions";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check permission
  if (!hasPermission(session.user, "expenses.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const expense = await db.expense.findUnique({
    where: {
      id,
      yachtId: session.user.yachtId || undefined,
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      approvedBy: {
        select: { id: true, name: true, email: true },
      },
      category: {
        select: { id: true, name: true },
      },
      trip: {
        select: { id: true, name: true, code: true },
      },
      receipts: {
        where: { deletedAt: null },
        select: { 
          id: true, 
          fileUrl: true, 
          storageBucket: true,
          storagePath: true,
          uploadedAt: true 
        },
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  if (!expense) {
    notFound();
  }

  const canApprove = hasPermission(session.user, "expenses.approve", session.user.permissions);
  const canEdit = hasPermission(session.user, "expenses.edit", session.user.permissions) && 
                  expense.createdByUserId === session.user.id && 
                  expense.status === "DRAFT";

  return (
    <div className="space-y-6">
      <ExpenseDetail expense={expense} canApprove={canApprove} canEdit={canEdit} />
    </div>
  );
}

