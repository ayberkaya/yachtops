import { auth } from "./auth-config";

export async function getSession() {
  return await auth();
}

