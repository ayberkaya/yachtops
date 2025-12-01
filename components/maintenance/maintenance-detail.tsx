"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MaintenanceType } from "@prisma/client";
import { ArrowLeft, Wrench, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MaintenanceDetailProps {
  log: any;
  canEdit: boolean;
  canDelete: boolean;
}

export function MaintenanceDetail({ log, canEdit, canDelete }: MaintenanceDetailProps) {
  const router = useRouter();

  const getTypeBadge = (type: MaintenanceType) => {
    const variants: Record<MaintenanceType, "default" | "secondary" | "destructive" | "outline"> = {
      [MaintenanceType.PREVENTIVE]: "default",
      [MaintenanceType.REPAIR]: "destructive",
      [MaintenanceType.INSPECTION]: "secondary",
      [MaintenanceType.UPGRADE]: "outline",
      [MaintenanceType.EMERGENCY]: "destructive",
    };

    const labels: Record<MaintenanceType, string> = {
      [MaintenanceType.PREVENTIVE]: "Preventive",
      [MaintenanceType.REPAIR]: "Repair",
      [MaintenanceType.INSPECTION]: "Inspection",
      [MaintenanceType.UPGRADE]: "Upgrade",
      [MaintenanceType.EMERGENCY]: "Emergency",
    };

    return (
      <Badge variant={variants[type]}>
        {labels[type]}
      </Badge>
    );
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/maintenance/${log.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        alert("Failed to delete maintenance log");
        return;
      }

      router.push("/dashboard/maintenance");
      router.refresh();
    } catch (error) {
      console.error("Error deleting maintenance log:", error);
      alert("An error occurred while deleting");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/maintenance">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Maintenance Details</h1>
            <p className="text-muted-foreground">{log.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getTypeBadge(log.type)}
          {canEdit && (
            <Button asChild>
              <Link href={`/dashboard/maintenance/${log.id}/edit`}>Edit</Link>
            </Button>
          )}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the maintenance log.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Date</p>
              <p>{format(new Date(log.date), "MMMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Type</p>
              <p>{getTypeBadge(log.type)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Title</p>
              <p>{log.title}</p>
            </div>
            {log.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="whitespace-pre-wrap">{log.description}</p>
              </div>
            )}
            {log.component && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Component</p>
                <p>{log.component}</p>
              </div>
            )}
            {log.serviceProvider && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Service Provider</p>
                <p>{log.serviceProvider}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost & Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {log.cost && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cost</p>
                <p className="text-lg font-semibold">
                  {Number(log.cost).toLocaleString("en-US", {
                    style: "currency",
                    currency: log.currency,
                  })}
                </p>
              </div>
            )}
            {log.mileage && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Mileage/Engine Hours</p>
                <p>
                  {log.mileage} {log.mileageUnit || "hours"}
                </p>
              </div>
            )}
            {log.nextDueDate && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Next Due Date</p>
                <p>{format(new Date(log.nextDueDate), "MMMM d, yyyy")}</p>
              </div>
            )}
            {log.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="whitespace-pre-wrap">{log.notes}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created By</p>
              <p>{log.createdBy.name || log.createdBy.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created At</p>
              <p>{format(new Date(log.createdAt), "MMMM d, yyyy 'at' h:mm a")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {log.documents && log.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Attached documents and files</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {log.documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">{doc.title || "Document"}</p>
                    <p className="text-sm text-muted-foreground">
                      Uploaded {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      Open
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

