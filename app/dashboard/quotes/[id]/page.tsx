import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { WorkRequestDetail } from "@/components/quotes/work-request-detail";
import { getTenantId } from "@/lib/tenant";
import { withTenantScope } from "@/lib/tenant-guard";

export default async function WorkRequestDetailPage({
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
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          documents: {
            orderBy: { uploadedAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!workRequest) {
    redirect("/dashboard/quotes");
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <WorkRequestDetail workRequest={workRequest as any} />
    </div>
  );
}

