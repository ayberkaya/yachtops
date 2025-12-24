"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { inviteCrewMember } from "@/actions/invite";
import { toast } from "@/components/ui/toast";
import { useState } from "react";

const inviteFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Please select a role"),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Sending..." : "Send Invitation"}
    </Button>
  );
}

interface InviteCrewFormProps {
  availableRoles: { value: string; label: string }[];
  onSuccess?: () => void;
}

export function InviteCrewForm({ availableRoles, onSuccess }: InviteCrewFormProps) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: availableRoles.length > 0 ? availableRoles[0].value : "",
    },
  });

  const onSubmit = async (data: InviteFormData) => {
    setError(null);
    
    const formData = new FormData();
    formData.append("email", data.email);
    formData.append("role", data.role);

    const result = await inviteCrewMember(formData);

    if (result.success) {
      toast({
        description: result.message || "Invitation sent successfully",
        variant: "success",
        duration: 5000,
      });
      form.reset();
      // Refresh the page to show the new invite in the list
      router.refresh();
      onSuccess?.();
    } else {
      const errorMessage = result.message || result.error || "Failed to send invitation";
      setError(errorMessage);
      toast({
        description: errorMessage,
        variant: "error",
        duration: 5000,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Crew Member</CardTitle>
        <CardDescription>
          Send an invitation to a new crew member to join your yacht
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="crew.member@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-900 dark:text-red-100">
                {error}
              </div>
            )}

            <SubmitButton />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

