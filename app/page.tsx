import { redirect } from "next/navigation";

export default function RootPage() {
  // For now, send everyone straight into the portal.
  // Once auth is wired (task #7), this becomes a proper marketing/login route.
  redirect("/dashboard");
}
