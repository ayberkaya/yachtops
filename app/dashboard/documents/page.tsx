import { redirect } from "next/navigation";

export default function DocumentsIndexPage() {
  // Redirect base documents route to receipts list for now
  redirect("/dashboard/documents/receipts");
}


