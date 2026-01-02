"use client";

import { useState, useMemo } from "react";
import { VesselCertificationKPIs } from "./vessel-certification-kpis";
import { VesselDocumentsTable } from "./vessel-documents-table";
import { VesselDocumentSheet } from "./vessel-document-sheet";
import { VesselDocumentUpload } from "./vessel-document-upload";
import { getDocumentStatus } from "@/lib/crew-certification-utils";

interface VesselDocument {
  id: string;
  title: string;
  fileUrl: string;
  notes: string | null;
  expiryDate: Date | string | null;
  createdAt: Date | string;
}

interface VesselCertificationDashboardProps {
  documents: VesselDocument[];
}

export function VesselCertificationDashboard({ documents: initialDocuments }: VesselCertificationDashboardProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const selectedDocument = useMemo(() => {
    if (!selectedDocumentId) return null;
    return documents.find((d) => d.id === selectedDocumentId) || null;
  }, [selectedDocumentId, documents]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    let criticalCount = 0;
    let warningCount = 0;
    let totalDocuments = documents.length;

    documents.forEach((doc) => {
      if (doc.expiryDate) {
        const status = getDocumentStatus(doc.expiryDate);
        if (status.status === "critical") criticalCount++;
        else if (status.status === "warning") warningCount++;
      }
    });

    const actionRequired30Days = documents.filter((doc) => {
      if (!doc.expiryDate) return false;
      const status = getDocumentStatus(doc.expiryDate);
      return status.status === "critical";
    }).length;

    const actionRequired90Days = documents.filter((doc) => {
      if (!doc.expiryDate) return false;
      const status = getDocumentStatus(doc.expiryDate);
      return status.status === "warning" || status.status === "critical";
    }).length;

    return {
      totalDocuments,
      actionRequired30Days,
      actionRequired90Days,
    };
  }, [documents]);

  const handleRowClick = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setIsSheetOpen(true);
  };

  const handleDelete = async (documentId: string) => {
    try {
      const res = await fetch(`/api/vessel-documents/${documentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete document");
      }

      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
      if (selectedDocumentId === documentId) {
        setIsSheetOpen(false);
        setSelectedDocumentId(null);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete document");
    }
  };

  const handleUploadSuccess = async () => {
    // Refresh data
    const res = await fetch("/api/vessel-documents?limit=1000");
    if (res.ok) {
      const response = await res.json();
      const docs = Array.isArray(response) ? response : (response.data || []);
      setDocuments(docs.filter((doc: any) => {
        const hasStorage = doc.storageBucket && doc.storagePath;
        const hasFileUrl = doc.fileUrl;
        return hasStorage || hasFileUrl;
      }).map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        fileUrl: doc.storageBucket && doc.storagePath 
          ? `/api/vessel-documents/${doc.id}/file`
          : doc.fileUrl || "",
        notes: doc.notes,
        expiryDate: doc.expiryDate ? (typeof doc.expiryDate === 'string' ? doc.expiryDate : doc.expiryDate.toISOString()) : null,
        createdAt: typeof doc.createdAt === 'string' ? doc.createdAt : doc.createdAt.toISOString(),
      })));
    }
  };

  return (
    <div className="space-y-6">
      <VesselDocumentUpload onUploadSuccess={handleUploadSuccess} />

      <VesselCertificationKPIs
        totalDocuments={kpis.totalDocuments}
        actionRequired30Days={kpis.actionRequired30Days}
        actionRequired90Days={kpis.actionRequired90Days}
      />

      <VesselDocumentsTable
        documents={documents}
        onRowClick={handleRowClick}
        onDelete={handleDelete}
      />

      <VesselDocumentSheet
        document={selectedDocument}
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) {
            setSelectedDocumentId(null);
          }
        }}
        onUpdate={async () => {
          // Refresh data
          const res = await fetch("/api/vessel-documents?limit=1000");
          if (res.ok) {
            const response = await res.json();
            const docs = Array.isArray(response) ? response : (response.data || []);
            setDocuments(docs.filter((doc: any) => {
              const hasStorage = doc.storageBucket && doc.storagePath;
              const hasFileUrl = doc.fileUrl;
              return hasStorage || hasFileUrl;
            }).map((doc: any) => ({
              id: doc.id,
              title: doc.title,
              fileUrl: doc.storageBucket && doc.storagePath 
                ? `/api/vessel-documents/${doc.id}/file`
                : doc.fileUrl || "",
              notes: doc.notes,
              expiryDate: doc.expiryDate ? (typeof doc.expiryDate === 'string' ? doc.expiryDate : doc.expiryDate.toISOString()) : null,
              createdAt: typeof doc.createdAt === 'string' ? doc.createdAt : doc.createdAt.toISOString(),
            })));
          }
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}

