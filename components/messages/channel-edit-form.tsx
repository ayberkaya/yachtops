"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";

const channelEditSchema = z.object({
  name: z.string().min(1, "Channel name is required"),
  description: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

type ChannelEditFormData = z.infer<typeof channelEditSchema>;

interface User {
  id: string;
  name: string | null;
  email: string;
  role?: string;
}

interface Channel {
  id: string;
  name: string;
  description: string | null;
  isGeneral: boolean;
  members: User[];
}

interface ChannelEditFormProps {
  channel: Channel;
  allUsers: User[];
  onSuccess: (channel: any) => void;
  onDelete: (channelId: string) => void;
}

export function ChannelEditForm({
  channel,
  allUsers,
  onSuccess,
  onDelete,
}: ChannelEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ChannelEditFormData>({
    resolver: zodResolver(channelEditSchema),
    defaultValues: {
      name: channel.name,
      description: channel.description || "",
      memberIds: channel.members.map((m) => m.id),
    },
  });

  const selectedMembers = form.watch("memberIds") || [];

  const toggleMember = (userId: string) => {
    const current = selectedMembers;
    if (current.includes(userId)) {
      form.setValue("memberIds", current.filter((id) => id !== userId));
    } else {
      form.setValue("memberIds", [...current, userId]);
    }
  };

  const onSubmit = async (data: ChannelEditFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/channels/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description || undefined,
          memberIds: data.memberIds || [],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to update channel");
        setIsLoading(false);
        return;
      }

      onSuccess(result);
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete channel "${channel.name}"?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/channels/${channel.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.error || "Failed to delete channel");
        setIsLoading(false);
        return;
      }

      onDelete(channel.id);
    } catch (error) {
      alert("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Channel Name *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., Engineering Team" 
                  {...field} 
                  disabled={channel.isGeneral}
                />
              </FormControl>
              {channel.isGeneral && (
                <FormDescription>
                  General channel name cannot be changed
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Optional description" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Members</FormLabel>
          <FormDescription>
            Select users who can access this channel
          </FormDescription>
          <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
            {allUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users available</p>
            ) : (
              <div className="space-y-2">
                {allUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`member-${user.id}`}
                      checked={selectedMembers.includes(user.id)}
                      onCheckedChange={() => toggleMember(user.id)}
                    />
                    <label
                      htmlFor={`member-${user.id}`}
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {user.name || user.email}
                      {user.role && (
                        <span className="text-muted-foreground ml-1">
                          ({user.role.toLowerCase()})
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading || channel.isGeneral}
          >
            Delete Channel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Channel"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

