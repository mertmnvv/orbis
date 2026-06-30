import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { LayoutProvider } from '@/providers/LayoutProvider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider>
      <div className="flex flex-col h-screen bg-[#0a0a0a] overflow-hidden">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </LayoutProvider>
  );
}
