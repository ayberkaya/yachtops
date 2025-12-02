"use client";

import React from "react";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { AlertTriangle, Calendar } from "lucide-react";

interface CrewDocument {
  id: string;
  title: string;
  fileUrl: string;
  notes: string | null;
  expiryDate: string | null;
  createdAt: string;
  userId: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface MyDocumentsViewProps {
  initialDocs: CrewDocument[];
}

export function MyDocumentsView({ initialDocs }: MyDocumentsViewProps) {
  const [docs] = useState<CrewDocument[]>(initialDocs);

  const getExpiryStatus = (expiryDateStr: string | null) => {
    if (!expiryDateStr) return null;
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    
    if (isPast(expiry) && !isToday(expiry)) {
      const daysOverdue = differenceInDays(today, expiry);
      return { status: "expired", days: daysOverdue };
    }
    
    const daysUntilExpiry = differenceInDays(expiry, today);
    if (daysUntilExpiry <= 30) {
      return { status: "warning", days: daysUntilExpiry };
    }
    
    return { status: "valid", days: daysUntilExpiry };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Documents</CardTitle>
          <CardDescription>
            Documents assigned to you in the Crew Documents section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No documents assigned to you yet.
            </p>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => {
                const expiryStatus = getExpiryStatus(doc.expiryDate);
                return (
                  <div
                    key={doc.id}
                    className={`flex items-start justify-between rounded-md border p-3 ${
                      expiryStatus?.status === "expired"
                        ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
                        : expiryStatus?.status === "warning"
                        ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                        : ""
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {doc.title || "Crew Document"}
                        </p>
                        {expiryStatus && (
                          <Badge
                            variant={
                              expiryStatus.status === "expired"
                                ? "destructive"
                                : expiryStatus.status === "warning"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {expiryStatus.status === "expired" && (
                              <>
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Expired {expiryStatus.days} day{expiryStatus.days > 1 ? "s" : ""} ago
                              </>
                            )}
                            {expiryStatus.status === "warning" && (
                              <>
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Expires in {expiryStatus.days} day{expiryStatus.days > 1 ? "s" : ""}
                              </>
                            )}
                            {expiryStatus.status === "valid" && (
                              <>
                                <Calendar className="h-3 w-3 mr-1" />
                                Valid
                              </>
                            )}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Uploaded {format(new Date(doc.createdAt), "MMM d, yyyy")}
                      </p>
                      {doc.expiryDate && (
                        <p className="text-xs text-muted-foreground">
                          Expires: {format(new Date(doc.expiryDate), "MMM d, yyyy")}
                        </p>
                      )}
                      {doc.notes && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {doc.notes}
                        </p>
                      )}
                    </div>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline ml-4"
                    >
                      Open
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

