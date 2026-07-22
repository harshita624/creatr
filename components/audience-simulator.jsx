"use client";

import { useState } from "react";
import { BrainCircuit, Loader2, Radar, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AudienceSimulator({ text }) {
  const [loading, setLoading] = useState(false);
  const [simulation, setSimulation] = useState(null);

  const runSimulation = async () => {
    if (!text || text === "<p><br></p>") return;

    setLoading(true);
    try {
      const response = await fetch("/api/ai/audience-simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      setSimulation(data.simulation);
    } finally {
      setLoading(false);
    }
  };

  if (!text || text === "<p><br></p>") return null;

  return (
    <section className="app-panel overflow-hidden p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-300 via-violet-300 to-orange-300" />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="section-label">Audience insight</p>
          <h3 className="mt-2 flex items-center gap-2 text-xl font-bold text-slate-950">
            <BrainCircuit className="h-5 w-5 text-orange-500" />
            Audience Twin Simulator
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Preview how different reader types may react before you publish.
          </p>
        </div>
        <Button onClick={runSimulation} disabled={loading} className="soft-button">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Radar className="h-4 w-4" />
          )}
          Simulate readers
        </Button>
      </div>

      {simulation && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-violet-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-orange-500">
                Originality
              </div>
              <div className="mt-2 text-4xl font-black text-slate-950">
                {simulation.originalityScore || 0}
                <span className="text-sm text-slate-400">/100</span>
              </div>
            </div>
            <div className="rounded-2xl bg-white/70 p-4 md:col-span-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Sparkles className="h-4 w-4 text-orange-500" />
                Best next move
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {simulation.bestNextMove}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {simulation.audienceTwins?.map((twin) => (
              <div key={twin.name} className="rounded-2xl border border-slate-100 bg-white/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Users className="h-4 w-4 text-orange-500" />
                  {twin.name}
                </div>
                <p className="text-sm leading-6 text-slate-600">{twin.reaction}</p>
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-medium leading-5 text-slate-500">
                  Improve: {twin.improvement}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-white/70 p-4">
              <div className="text-sm font-bold text-slate-900">Likely comments</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {simulation.likelyComments}
              </p>
            </div>
            <div className="rounded-2xl bg-white/70 p-4">
              <div className="text-sm font-bold text-slate-900">Hidden risk</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {simulation.hiddenRisk}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
