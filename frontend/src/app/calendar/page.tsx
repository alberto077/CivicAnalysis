import { Calendar } from "@/components/civiq/Calendar";
import { Header } from "@/components/civiq/Header";
import { SiteFooter } from "@/components/civiq/SiteFooter";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-background">
      <Header />

      <main className="relative z-10 flex-1 px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <Calendar />
      </main>

      <SiteFooter />
    </div>
  );
}