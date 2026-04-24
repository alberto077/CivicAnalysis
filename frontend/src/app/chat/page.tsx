import { Header } from "@/components/civiq/Header";
import { SiteFooter } from "@/components/civiq/SiteFooter";
import { ChatPanel } from "@/components/civiq/ChatPanel";

export const metadata = {
  title: "Policy AI Explorer | Civic Spiegel",
  description: "Dive deep into NYC policy with our specialized AI assistant.",
};

export default function ChatPage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-slate-50">
      <div
        className="ambient-orb top-0 right-0 h-96 w-96 bg-[rgba(168,218,220,0.15)]"
        aria-hidden
      />
      <div
        className="ambient-orb bottom-0 left-0 h-96 w-96 bg-[rgba(230,57,70,0.05)]"
        aria-hidden
      />
      <Header />
      <main className="relative z-10 flex-1 pt-12">
        <ChatPanel isStandalone={true} />
      </main>
      <SiteFooter />
    </div>
  );
}
