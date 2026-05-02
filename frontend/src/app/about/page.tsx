import { Header } from "@/components/civiq/Header";
import { SiteFooter } from "@/components/civiq/SiteFooter";
import { MotionReveal } from "@/components/civiq/MotionReveal";
import { Shield, Target, Users, Zap } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-white">
      <Header />
      <main className="relative z-10 flex-1">
        {/* Hero Section */}
        <section className="relative px-4 py-24 sm:px-6 lg:px-8 bg-slate-50">
          <div className="mx-auto max-w-5xl text-center">
            <MotionReveal>
              <h1 className="font-limelight text-5xl font-medium tracking-tight text-[rgba(20,31,45,0.94)] sm:text-7xl">
                Illuminating City <span className="text-[var(--accent)]">Policy</span>
              </h1>
              <p className="mt-8 text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
                Civic Spiegel is a next-generation civic intelligence platform designed to bridge the gap between complex legislation and community impact. 
                Our mission is to provide every resident with clear, actionable insights into how their government works.
              </p>
            </MotionReveal>
          </div>
        </section>

        {/* Values */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { icon: Shield, title: "Unbiased", text: "We use direct primary sources, ensuring no political slant affects the briefing data." },
              { icon: Target, title: "Hyper-Local", text: "Policies are analyzed through the lens of your specific neighborhood and demographics." },
              { icon: Zap, title: "Real-Time", text: "Synced directly with city council transcripts and legislative archives as they happen." },
              { icon: Users, title: "Accessible", text: "Converting dense legal jargon into plain English for every citizen's benefit." }
            ].map((v, i) => (
              <MotionReveal key={i} className="flex flex-col items-center text-center">
                <div className="h-14 w-14 rounded-2xl bg-[var(--accent-soft)]/10 flex items-center justify-center text-[var(--accent)] mb-6">
                  <v.icon className="h-7 w-7" />
                </div>
                <h3 className="font-limelight text-xl font-medium text-[rgba(20,31,45,0.92)] mb-3">{v.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{v.text}</p>
              </MotionReveal>
            ))}
          </div>
        </section>

        {/* The Problem */}
        <section className="py-24 bg-slate-900 text-white px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-limelight text-3xl font-medium mb-8 text-slate-100">Why Civic Spiegel?</h2>
            <div className="grid gap-8 text-left">
              <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
                <h4 className="font-work-sans text-[var(--accent-soft)] font-bold uppercase tracking-widest text-xs mb-2">The Challenge</h4>
                <p className="text-slate-300">NYC produces thousands of pages of legislative transcripts and filings every month. For the average resident, staying informed on local changes is a full-time job.</p>
              </div>
              <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
                <h4 className="font-work-sans text-[var(--accent-soft)] font-bold uppercase tracking-widest text-xs mb-2">Our Solution</h4>
                <p className="text-slate-300">We use advanced RAG (Retrieval-Augmented Generation) to scan these archives instantly, pulling out the facts that matter most to your specific life and location.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
