import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { CrewCertificationDashboard } from "@/components/documents/crew-certification-dashboard";
import { hasPermission } from "@/lib/permissions";

export default async function CrewDocumentsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!session.user.yachtId) {
    redirect("/dashboard");
  }

  // Check permission
  if (!hasPermission(session.user, "documents.crew.view", session.user.permissions)) {
    redirect("/dashboard");
  }

  // Filter out OWNER, SUPER_ADMIN, and ADMIN from crew member selection
  const crewMembers = await db.user.findMany({
    where: {
      yachtId: session.user.yachtId,
      role: {
        notIn: ["OWNER", "SUPER_ADMIN", "ADMIN"],
      },
    },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passportDate: true,
        passportNumber: true,
        healthReportDate: true,
        walletDate: true,
        walletQualifications: true,
        walletTcKimlikNo: true,
        walletSicilLimani: true,
        walletSicilNumarasi: true,
        walletDogumTarihi: true,
        walletUyrugu: true,
        licenseDate: true,
        radioDate: true,
        certificates: {
        select: {
          id: true,
          name: true,
          issueDate: true,
          expiryDate: true,
          isIndefinite: true,
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // Transform data for the dashboard component
  const transformedMembers = crewMembers.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    passportDate: member.passportDate,
    passportNumber: member.passportNumber,
    healthReportDate: member.healthReportDate,
    walletDate: member.walletDate,
    walletQualifications: member.walletQualifications ? (typeof member.walletQualifications === 'string' ? JSON.parse(member.walletQualifications) : member.walletQualifications) : null,
    walletTcKimlikNo: member.walletTcKimlikNo,
    walletSicilLimani: member.walletSicilLimani,
    walletSicilNumarasi: member.walletSicilNumarasi,
    walletDogumTarihi: member.walletDogumTarihi,
    walletUyrugu: member.walletUyrugu,
    licenseDate: member.licenseDate,
    radioDate: member.radioDate,
    certificates: member.certificates.map((cert) => ({
      id: cert.id,
      name: cert.name,
      issueDate: cert.issueDate,
      expiryDate: cert.expiryDate,
      isIndefinite: cert.isIndefinite,
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Crew Certification Dashboard</h1>
        <p className="text-muted-foreground">
          Track expiration dates for critical yacht documents and crew certifications.
        </p>
      </div>

      <CrewCertificationDashboard crewMembers={transformedMembers} />
    </div>
  );
}

