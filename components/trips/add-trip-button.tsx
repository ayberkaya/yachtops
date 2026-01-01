"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { TripForm } from "./trip-form";

interface AddTripButtonProps {
  canEdit: boolean;
}

export function AddTripButton({ canEdit }: AddTripButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  if (!canEdit) {
    return null;
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Trip
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Trip</DialogTitle>
          <DialogDescription>
            Create a new trip or charter
          </DialogDescription>
        </DialogHeader>
        <TripForm
          onSuccess={() => {
            setIsDialogOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

