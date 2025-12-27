import { redirect } from "next/navigation";

export default function MaintenancePage() {
  redirect("/dashboard/tasks?tab=maintenance");
}
