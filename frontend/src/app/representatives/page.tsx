import { Header } from "@/components/civiq/Header";
import { SiteFooter } from "@/components/civiq/SiteFooter";
import { PoliticianCards } from "@/components/civiq/PoliticianCards";

export const metadata = {
  title: "NYC Representatives | Civic Spiegel",
  description: "Find and connect with your local NYC Council members.",
};

export default function RepresentativesPage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div
        className="ambient-orb -top-24 -left-20 h-72 w-72 bg-[rgba(168,218,220,0.28)]"
        aria-hidden
      />
      <Header />
      <main className="relative z-10 flex-1 pt-12">
        <PoliticianCards />
      </main>
      <SiteFooter />
    </div>
  );
}
