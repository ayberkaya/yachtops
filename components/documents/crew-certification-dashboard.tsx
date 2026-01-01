"use client";

import { useState, useMemo } from "react";
import { CrewCertificationKPIs } from "./crew-certification-kpis";
import { CrewComplianceTable } from "./crew-compliance-table";
import { CrewDocumentSheet } from "./crew-document-sheet";
import { getDocumentStatus, calculateComplianceRate } from "@/lib/crew-certification-utils";

interface CrewCertificate {
  id: string;
  name: string;
  issueDate: Date | string | null;
  expiryDate: Date | string | null;
  isIndefinite: boolean;
}

interface CrewMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
  passportDate: Date | string | null;
  passportNumber: string | null;
  healthReportDate: Date | string | null;
  walletDate: Date | string | null;
  walletQualifications: Array<{ qualification: string; date: string | null }> | null;
  walletTcKimlikNo: string | null;
  walletSicilLimani: string | null;
  walletSicilNumarasi: string | null;
  walletDogumTarihi: Date | string | null;
  walletUyrugu: string | null;
  licenseDate: Date | string | null;
  radioDate: Date | string | null;
  certificates: CrewCertificate[];
}

interface CrewCertificationDashboardProps {
  crewMembers: CrewMember[];
}

export function CrewCertificationDashboard({ crewMembers: initialCrewMembers }: CrewCertificationDashboardProps) {
  const [crewMembers, setCrewMembers] = useState(initialCrewMembers);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    return crewMembers.find((m) => m.id === selectedMemberId) || null;
  }, [selectedMemberId, crewMembers]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    let criticalCount = 0;
    let warningCount = 0;
    let totalDocuments = 0;

    crewMembers.forEach((member) => {
      // Check core documents
      const documents = [
        member.passportDate,
        member.healthReportDate,
        member.walletDate,
      ].filter(Boolean);

      documents.forEach((date) => {
        if (date) {
          totalDocuments++;
          const status = getDocumentStatus(date);
          if (status.status === "critical") criticalCount++;
          else if (status.status === "warning") warningCount++;
        }
      });

      // Check certificates
      member.certificates.forEach((cert) => {
        if (!cert.isIndefinite) {
          totalDocuments++;
          const status = getDocumentStatus(cert.expiryDate, cert.isIndefinite);
          if (status.status === "critical") criticalCount++;
          else if (status.status === "warning") warningCount++;
        }
      });
    });

    const actionRequired = crewMembers.filter((member) => {
      const hasCritical =
        (member.passportDate && getDocumentStatus(member.passportDate).status === "critical") ||
        (member.healthReportDate && getDocumentStatus(member.healthReportDate).status === "critical") ||
        (member.walletDate && getDocumentStatus(member.walletDate).status === "critical") ||
        member.certificates.some(
          (cert) => !cert.isIndefinite && getDocumentStatus(cert.expiryDate, cert.isIndefinite).status === "critical"
        );
      
      const hasWarning =
        (member.passportDate && getDocumentStatus(member.passportDate).status === "warning") ||
        (member.healthReportDate && getDocumentStatus(member.healthReportDate).status === "warning") ||
        (member.walletDate && getDocumentStatus(member.walletDate).status === "warning") ||
        member.certificates.some(
          (cert) => !cert.isIndefinite && getDocumentStatus(cert.expiryDate, cert.isIndefinite).status === "warning"
        );

      return hasCritical || hasWarning;
    }).length;

    const complianceRate = calculateComplianceRate(totalDocuments, criticalCount, warningCount);

    return {
      totalCrew: crewMembers.length,
      actionRequired,
      complianceRate,
    };
  }, [crewMembers]);

  const handleRowClick = (memberId: string) => {
    setSelectedMemberId(memberId);
    setIsSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      <CrewCertificationKPIs
        totalCrew={kpis.totalCrew}
        actionRequired={kpis.actionRequired}
        complianceRate={kpis.complianceRate}
      />

      <CrewComplianceTable
        crewMembers={crewMembers}
        onRowClick={handleRowClick}
      />

      <CrewDocumentSheet
        member={selectedMember}
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) {
            setSelectedMemberId(null);
          }
        }}
        onUpdate={async () => {
          // Refresh data
          const res = await fetch("/api/crew-certification-data");
          if (res.ok) {
            const data = await res.json();
            setCrewMembers(data);
          }
        }}
      />
    </div>
  );
}

