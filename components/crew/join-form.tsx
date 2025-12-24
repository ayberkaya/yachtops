"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { acceptInvite } from "@/actions/join";
import { toast } from "@/components/ui/toast";

const joinFormSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type JoinFormData = z.infer<typeof joinFormSchema>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Creating Account..." : "Join Crew"}
    </Button>
  );
}

interface JoinFormProps {
  token: string;
  email: string;
  role: string;
  yachtName: string;
}

export function JoinForm({ token, email, role, yachtName }: JoinFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<JoinFormData>({
    resolver: zodResolver(joinFormSchema),
    defaultValues: {
      fullName: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: JoinFormData) => {
    setError(null);

    const result = await acceptInvite(token, data.password, data.fullName);

    if (result.success) {
      toast({
        description: result.message || "Account created successfully!",
        variant: "success",
        duration: 5000,
      });
      // Redirect to login with success message
      router.push("/auth/signin?message=Welcome aboard! Please sign in.");
    } else {
      const errorMessage = result.error || "Failed to create account";
      setError(errorMessage);
      toast({
        description: errorMessage,
        variant: "error",
        duration: 5000,
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Read-only email field */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">Email</label>
          <Input
            type="email"
            value={email}
            disabled
            className="bg-slate-50 text-slate-600 cursor-not-allowed"
          />
          <p className="text-xs text-slate-500">
            This email was used for your invitation
          </p>
        </div>

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your full name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Create a password (min. 8 characters)"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Must be at least 8 characters long
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Confirm your password"
                  {...field}
                />
              </FormControl>
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
  );
}

