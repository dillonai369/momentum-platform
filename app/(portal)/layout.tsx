import { Sidebar } from "@/components/portal/sidebar";
import { getAuthContext } from "@/lib/auth";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth + tenant resolution. Auto-provisions the user on first sign-in.
  const ctx = await getAuthContext();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface">
      <Sidebar
        userName={
          [ctx.user.first_name, ctx.user.last_name].filter(Boolean).join(" ") ||
          ctx.user.email
        }
        userRole={ctx.user.role}
        tenantName={ctx.tenant.name}
      />
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
