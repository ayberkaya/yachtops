"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getDocumentStatus, getWorstStatus, type DocumentStatus } from "@/lib/crew-certification-utils";

interface CrewMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
  passportDate: Date | string | null;
  healthReportDate: Date | string | null;
  walletDate: Date | string | null;
  walletQualifications: Array<{ qualification: string; date: string | null }> | null;
  certificates: Array<{
    expiryDate: Date | string | null;
    isIndefinite: boolean;
  }>;
}

interface CrewComplianceTableProps {
  crewMembers: CrewMember[];
  onRowClick: (memberId: string) => void;
}

function StatusIndicator({ status }: { status: DocumentStatus }) {
  if (status === "indefinite") {
    return (
      <div className="h-2.5 w-2.5 rounded-full bg-blue-500" title="Indefinite" />
    );
  }
  if (status === "critical") {
    return (
      <div className="h-2.5 w-2.5 rounded-full bg-red-500" title="Critical" />
    );
  }
  if (status === "warning") {
    return (
      <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" title="Warning" />
    );
  }
  return (
    <div className="h-2.5 w-2.5 rounded-full bg-green-500" title="Good" />
  );
}

function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  if (status === "indefinite") {
    return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">Indefinite</Badge>;
  }
  if (status === "critical") {
    return <Badge variant="destructive">Critical</Badge>;
  }
  if (status === "warning") {
    return <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">Warning</Badge>;
  }
  return <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">Good</Badge>;
}

export function CrewComplianceTable({ crewMembers, onRowClick }: CrewComplianceTableProps) {
  const getMemberOverallStatus = (member: CrewMember): DocumentStatus => {
    const statuses: DocumentStatus[] = [];
    
    // Check passport
    if (member.passportDate) {
      statuses.push(getDocumentStatus(member.passportDate).status);
    }
    
    // Check health report
    if (member.healthReportDate) {
      statuses.push(getDocumentStatus(member.healthReportDate).status);
    }
    
    // Check wallet (seaman's book)
    if (member.walletDate) {
      statuses.push(getDocumentStatus(member.walletDate).status);
    }
    
    // Check certificates
    member.certificates.forEach((cert) => {
      statuses.push(getDocumentStatus(cert.expiryDate, cert.isIndefinite).status);
    });
    
    return getWorstStatus(statuses.length > 0 ? statuses : ["good"]);
  };

  return (
    <div className="rounded-xl border border-zinc-200/60 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50/50">
            <TableHead className="w-[200px]">Name</TableHead>
            <TableHead className="w-[150px]">Role</TableHead>
            <TableHead className="w-[120px]">Passport</TableHead>
            <TableHead className="w-[120px]">Health</TableHead>
            <TableHead className="w-[120px]">Seaman's Book</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {crewMembers.map((member) => {
            const passportStatus = getDocumentStatus(member.passportDate);
            const healthStatus = getDocumentStatus(member.healthReportDate);
            const walletStatus = getDocumentStatus(member.walletDate);
            const overallStatus = getMemberOverallStatus(member);

            return (
              <TableRow
                key={member.id}
                className="cursor-pointer hover:bg-zinc-50/50 transition-colors"
                onClick={() => onRowClick(member.id)}
              >
                <TableCell>
                  <p className="font-medium text-sm">
                    {member.name || member.email}
                  </p>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">{member.role}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusIndicator status={passportStatus.status} />
                    <span className="text-xs text-muted-foreground">
                      {passportStatus.daysLeft !== null
                        ? `${passportStatus.daysLeft}d`
                        : "-"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusIndicator status={healthStatus.status} />
                    <span className="text-xs text-muted-foreground">
                      {healthStatus.daysLeft !== null
                        ? `${healthStatus.daysLeft}d`
                        : "-"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <StatusIndicator status={walletStatus.status} />
                      <span className="text-xs text-muted-foreground">
                        {walletStatus.daysLeft !== null
                          ? `${walletStatus.daysLeft}d`
                          : "-"}
                      </span>
                    </div>
                    {member.walletQualifications && member.walletQualifications.length > 0 && (
                      <div className="space-y-1 pl-4">
                        {member.walletQualifications.map((qual, index) => {
                          const qualStatus = qual.date ? getDocumentStatus(qual.date) : null;
                          return (
                            <div key={index} className="flex items-center gap-1.5">
                              <StatusIndicator status={qualStatus?.status || "good"} />
                              <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                {qual.qualification}
                              </span>
                              {qualStatus?.daysLeft !== null && qualStatus?.daysLeft !== undefined && (
                                <span className="text-xs text-muted-foreground">
                                  {qualStatus.daysLeft < 0 
                                    ? `${Math.abs(qualStatus.daysLeft)}d`
                                    : `${qualStatus.daysLeft}d`}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <DocumentStatusBadge status={overallStatus} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

