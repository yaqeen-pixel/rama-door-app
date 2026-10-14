import Sidebar from "@/components/Sidebar";
import Toast from "@/components/Toast";
import { StoreProvider } from "@/components/store";
import { getCreators, getOutdoorSites, getOutlets, getPrPackages, getWorkspace } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [creators, sites, outlets, packages, workspace] = await Promise.all([
    getCreators(), getOutdoorSites(), getOutlets(), getPrPackages(), getWorkspace(),
  ]);
  return (
    <StoreProvider catalogue={{ creators, sites, outlets, packages }} workspace={workspace}>
      <div className="shell">
        <Sidebar />
        <main className="main gut">
          <div className="main-in wide">
            {workspace.mode === "demo" && <p className="demo-banner">Demo mode: changes are kept in this browser tab only. Connect Supabase to save them (see README).</p>}
            {workspace.mode === "guest" && <p className="demo-banner">You are browsing as a guest. <a href="/login">Sign in</a> to send offers, bookings and orders.</p>}
            {children}
          </div>
        </main>
      </div>
      <Toast />
    </StoreProvider>
  );
}
