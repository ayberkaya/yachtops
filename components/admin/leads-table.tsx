"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  MoreVertical,
  Mail,
  UserCheck,
  Archive,
  UserPlus,
  FileText,
} from "lucide-react";
import { updateLeadStatus, updateLeadNotes, deleteLead } from "@/actions/leads";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";

interface Lead {
  id: string;
  full_name: string;
  email: string;
  type: "DEMO_REQUEST" | "CONTACT_INQUIRY";
  role: string | null;
  vessel_size: string | null;
  vessel_name: string | null;
  subject: string | null;
  message: string | null;
  status: string | null;
  admin_notes: string | null;
  created_at: string;
}

interface LeadsTableProps {
  leads: Lead[];
}

export function LeadsTable({ leads }: LeadsTableProps) {
  const { toast } = useToast();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Helper function to truncate message
  const truncateMessage = (message: string | null, maxLength: number = 50) => {
    if (!message) return "-";
    return message.length > maxLength
      ? `${message.substring(0, maxLength)}...`
      : message;
  };

  // Helper function to format details based on type
  const formatDetails = (lead: Lead) => {
    if (lead.type === "DEMO_REQUEST") {
      const parts = [];
      if (lead.role) parts.push(lead.role);
      if (lead.vessel_size) parts.push(lead.vessel_size);
      return parts.length > 0 ? parts.join(" - ") : "-";
    } else {
      return lead.subject || "-";
    }
  };

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setNotes(lead.admin_notes || "");
    setIsSheetOpen(true);
  };

  const handleMarkAsContacted = async (leadId: string) => {
    const result = await updateLeadStatus(leadId, "CONTACTED");
    if (result.success) {
      toast({
        title: "Status Updated",
        description: "Lead marked as contacted",
        variant: "success",
      });
      // Refresh the page to show updated status
      window.location.reload();
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "error",
      });
    }
  };

  const handleMarkAsJunk = async (leadId: string) => {
    if (!confirm("Are you sure you want to mark this lead as junk/archive?")) {
      return;
    }
    const result = await updateLeadStatus(leadId, "ARCHIVED");
    if (result.success) {
      toast({
        title: "Status Updated",
        description: "Lead marked as archived",
        variant: "success",
      });
      window.location.reload();
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "error",
      });
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this lead? This action cannot be undone.")) {
      return;
    }
    const result = await deleteLead(leadId);
    if (result.success) {
      toast({
        title: "Lead Deleted",
        description: "Lead has been deleted",
        variant: "success",
      });
      window.location.reload();
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "error",
      });
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedLead) return;
    
    setIsSavingNotes(true);
    const result = await updateLeadNotes(selectedLead.id, notes);
    setIsSavingNotes(false);

    if (result.success) {
      toast({
        title: "Notes Saved",
        description: "Admin notes updated successfully",
        variant: "success",
      });
      // Update the selected lead's notes
      setSelectedLead({ ...selectedLead, admin_notes: notes });
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "error",
      });
    }
  };

  const getConvertToCustomerUrl = (lead: Lead) => {
    const params = new URLSearchParams();
    if (lead.full_name) {
      params.append("name", lead.full_name);
    }
    if (lead.email) {
      params.append("email", lead.email);
    }
    if (lead.vessel_name) {
      params.append("vessel", lead.vessel_name);
    }
    if (lead.role) {
      params.append("role", lead.role);
    }
    return `/admin/create?${params.toString()}`;
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                  No leads found.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-stone-50"
                  onClick={() => handleViewLead(lead)}
                >
                  <TableCell className="text-sm text-slate-600">
                    {format(new Date(lead.created_at), "dd MMM yyyy, HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {lead.full_name}
                      </div>
                      <div className="text-sm text-slate-500">
                        {lead.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        lead.type === "DEMO_REQUEST" ? "default" : "secondary"
                      }
                      className={
                        lead.type === "DEMO_REQUEST"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-200 text-slate-700 border-slate-300"
                      }
                    >
                      {lead.type === "DEMO_REQUEST" ? "Demo Request" : "Contact"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {formatDetails(lead)}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 max-w-xs">
                    {truncateMessage(lead.message)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={lead.status === "NEW" ? "default" : "outline"}
                      className={
                        lead.status === "NEW"
                          ? "bg-green-600 text-white border-green-600"
                          : ""
                      }
                    >
                      {lead.status || "NEW"}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleViewLead(lead)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => window.location.href = `mailto:${lead.email}`}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleMarkAsContacted(lead.id)}
                        >
                          <UserCheck className="mr-2 h-4 w-4" />
                          Mark as Contacted
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleMarkAsJunk(lead.id)}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Mark as Junk/Archive
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={getConvertToCustomerUrl(lead)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Convert to Customer
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteLead(lead.id)}
                          variant="destructive"
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Lead Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-white flex flex-col">
          {selectedLead && (
            <>
              <SheetHeader className="pb-6 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <SheetTitle 
                        className="text-2xl font-semibold text-slate-900 font-serif tracking-tight"
                        style={{ fontFamily: 'var(--font-playfair), serif' }}
                      >
                        {selectedLead.full_name}
                      </SheetTitle>
                      <Badge
                        variant={
                          selectedLead.type === "DEMO_REQUEST" ? "default" : "secondary"
                        }
                        className={
                          selectedLead.type === "DEMO_REQUEST"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-200 text-slate-700 border-slate-300"
                        }
                      >
                        {selectedLead.type === "DEMO_REQUEST" ? "Demo Request" : "Contact"}
                      </Badge>
                    </div>
                    <SheetDescription 
                      className="text-slate-500 text-sm font-sans"
                      style={{ fontFamily: 'var(--font-inter), sans-serif' }}
                    >
                      {selectedLead.email}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex flex-col gap-[13px] px-6 pt-[3px] pb-[3px]">
                {/* Vessel Info */}
                {selectedLead.type === "DEMO_REQUEST" && (
                  <div className="space-y-4">
                    <h3 
                      className="text-base font-medium text-slate-900 font-serif tracking-tight"
                      style={{ fontFamily: 'var(--font-playfair), serif' }}
                    >
                      Vessel Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedLead.role && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Role
                          </div>
                          <div className="text-base font-medium text-slate-900">
                            {selectedLead.role}
                          </div>
                        </div>
                      )}
                      {selectedLead.vessel_name && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Vessel Name
                          </div>
                          <div className="text-base font-medium text-slate-900">
                            {selectedLead.vessel_name}
                          </div>
                        </div>
                      )}
                      {selectedLead.vessel_size && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Vessel Size
                          </div>
                          <div className="text-base font-medium text-slate-900">
                            {selectedLead.vessel_size}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Subject (for Contact inquiries) */}
                {selectedLead.type === "CONTACT_INQUIRY" && selectedLead.subject && (
                  <div className="space-y-4">
                    <h3 
                      className="text-base font-medium text-slate-900 font-serif tracking-tight"
                      style={{ fontFamily: 'var(--font-playfair), serif' }}
                    >
                      Subject
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Subject
                        </div>
                        <div className="text-base font-medium text-slate-900">
                          {selectedLead.subject}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message */}
                {selectedLead.message && (
                  <div className="space-y-4">
                    <h3 
                      className="text-base font-medium text-slate-900 font-serif tracking-tight"
                      style={{ fontFamily: 'var(--font-playfair), serif' }}
                    >
                      Enquiry Message
                    </h3>
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {selectedLead.message}
                      </p>
                    </div>
                  </div>
                )}

                {/* Admin Notes */}
                <div className="space-y-4">
                  <h3 
                    className="text-base font-medium text-slate-900 font-serif tracking-tight"
                    style={{ fontFamily: 'var(--font-playfair), serif' }}
                  >
                    Notes
                  </h3>
                  <div className="space-y-3">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add internal notes about this lead..."
                      className="min-h-[120px] border-stone-200 focus:border-slate-900 focus:ring-slate-900 rounded-lg bg-white"
                    />
                    <Button
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="bg-slate-900 hover:bg-slate-800 text-white"
                    >
                      {isSavingNotes ? "Saving..." : "Save Notes"}
                    </Button>
                  </div>
                </div>
              </div>

              <SheetFooter className="mt-auto pt-6 border-t border-slate-100 gap-3">
                <Button
                  asChild
                  variant="outline"
                  className="border-slate-900 text-slate-900 hover:bg-stone-50"
                >
                  <Link href={getConvertToCustomerUrl(selectedLead)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Convert to Customer
                  </Link>
                </Button>
                <Button
                  onClick={() => window.location.href = `mailto:${selectedLead.email}`}
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Draft Email
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

