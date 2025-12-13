"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskStatus } from "@prisma/client";
import { Check, Upload, X } from "lucide-react";

interface TaskCompletionDialogProps {
  task: {
    id: string;
    title: string;
    status: TaskStatus;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (taskId: string, photoFile?: File | null, note?: string) => Promise<void>;
}

export function TaskCompletionDialog({
  task,
  open,
  onOpenChange,
  onComplete,
}: TaskCompletionDialogProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onComplete(task.id, photoFile, note);
      // Reset form
      setPhotoFile(null);
      setNote("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error completing task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>
            Complete this task and optionally add a photo and note
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="photo">Photo (Optional)</Label>
            {photoFile ? (
              <div className="relative">
                <img
                  src={URL.createObjectURL(photoFile)}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => setPhotoFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg">
                <Label
                  htmlFor="photo"
                  className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload a photo or use camera
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    JPG, JPEG, PNG only
                  </span>
                </Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const fileName = file.name.toLowerCase();
                      const validExtensions = ['.jpg', '.jpeg', '.png'];
                      const isValid = validExtensions.some(ext => fileName.endsWith(ext));
                      if (!isValid) {
                        alert('Only JPG, JPEG, and PNG images are allowed.');
                        e.target.value = '';
                        setPhotoFile(null);
                        return;
                      }
                      setPhotoFile(file);
                    } else {
                      setPhotoFile(null);
                    }
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (Optional)</Label>
            <Textarea
              id="note"
              placeholder="Add a note about completing this task..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              {isSubmitting ? "Completing..." : "Complete Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

