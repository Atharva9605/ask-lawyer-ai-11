import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Brain,
  Search,
  FileText,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Type definitions
interface SwotMatrixData {
  strength: string;
  weakness: string;
  opportunity: string;
  threat: string;
}

interface AnalysisState {
  partNumber: number;
  thoughts?: string[];
  searchQueries?: string[];
  deliverable?: string | SwotMatrixData;
}

const TYPING_SPEED_MS = 17;
const GRACE_COLLAPSE_MS = 1200;

function formatTextElements(text: string) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = (keyBase: string) => {
    if (bulletBuffer.length === 0) return;
    elements.push(
      <ul key={`ul-${keyBase}`} className="ml-6 list-disc space-y-1">
        {bulletBuffer.map((b, i) => (
          <li key={`li-${keyBase}-${i}`} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {b}
          </li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) {
      flushBullets(idx.toString());
      elements.push(<div key={`sp-${idx}`} className="h-3" />);
      return;
    }

    if (/^\d+\.\s+/.test(line) || (line === line.toUpperCase() && line.length < 80 && !line.includes(":"))) {
      flushBullets(idx.toString());
      elements.push(
        <h2 key={`h2-${idx}`} className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-50 mt-4 mb-2">
          {line.replace(/^\d+\.\s+/, "")}
        </h2>
      );
      return;
    }

    const mid = line.match(/^\*\*(.+?)\*\*:\s*(.*)$/);
    if (mid) {
      flushBullets(idx.toString());
      elements.push(
        <div key={`h3-${idx}`} className="mt-3 mb-2">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{mid[1]}</div>
          {mid[2] ? <div className="text-sm text-slate-700 dark:text-slate-300 mt-1">{mid[2]}</div> : null}
        </div>
      );
      return;
    }

    if (/^[-*•]\s+/.test(line)) {
      const val = line.replace(/^[-*•]\s+/, "");
      bulletBuffer.push(val);
      return;
    }

    if (/^[A-Z]\.\s+/.test(line)) {
      flushBullets(idx.toString());
      elements.push(
        <div key={`sub-${idx}`} className="mt-2 mb-2">
          <div className="inline-block px-2 py-0.5 rounded text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
            {line.split(" ")[0]}
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-300 mt-1">{line.replace(/^[A-Z]\.\s+/, "")}</div>
        </div>
      );
      return;
    }

    flushBullets(idx.toString());
    elements.push(
      <p key={`p-${idx}`} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed my-1">
        {line}
      </p>
    );
  });

  flushBullets("end");
  return elements;
}

const SwotMatrixDisplay: React.FC<{ data: SwotMatrixData }> = ({ data }) => {
  const quad = [
    { title: "Strengths", value: data.strength },
    { title: "Weaknesses", value: data.weakness },
    { title: "Opportunities", value: data.opportunity },
    { title: "Threats", value: data.threat },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
      {quad.map((q) => (
        <div key={q.title} className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{q.title}</div>
          </div>
          <div className="mt-3 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{q.value}</div>
        </div>
      ))}
    </div>
  );
};

function partMetadataTitle(partNumber: number) {
  const titles = [
    "Mission Briefing",
    "Legal Battlefield Analysis",
    "Asset & Intelligence Assessment",
    "Red Team Analysis",
    "Strategic SWOT Matrix",
    "Financial Exposure & Remedies",
    "Scenario War Gaming",
    "Leverage Points & Negotiation",
    "Execution Roadmap",
    "Final Counsel Briefing",
    "Mandatory Disclaimer",
  ];
  return titles[partNumber - 1] || `Part ${partNumber}`;
}

// Component to handle individual part with typing effect
const AnalysisPart: React.FC<{
  part: AnalysisState;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ part, isActive, isExpanded, onToggle }) => {
  const [displayed, setDisplayed] = useState("");
  const prevRef = useRef("");
  const mountedRef = useRef(true);

  const rawDeliverable = typeof part.deliverable === "string" ? part.deliverable : "";

  // Typing effect
  useEffect(() => {
    mountedRef.current = true;

    if (rawDeliverable.length < prevRef.current.length) {
      prevRef.current = rawDeliverable;
      setDisplayed(rawDeliverable);
      return;
    }

    if (rawDeliverable === prevRef.current) return;

    const startIndex = prevRef.current.length;
    const delta = rawDeliverable.slice(startIndex);

    let i = 0;
    const tick = () => {
      if (!mountedRef.current) return;
      if (i < delta.length) {
        setDisplayed((s) => s + delta[i]);
        i++;
        setTimeout(tick, TYPING_SPEED_MS);
      } else {
        prevRef.current = rawDeliverable;
      }
    };

    if (isActive) {
      tick();
    } else {
      setDisplayed(rawDeliverable);
      prevRef.current = rawDeliverable;
    }

    return () => {
      mountedRef.current = false;
    };
  }, [rawDeliverable, isActive]);

  useEffect(() => {
    if (!rawDeliverable) {
      prevRef.current = "";
      setDisplayed("");
    }
  }, [rawDeliverable]);

  const formatted = useMemo(() => formatTextElements(displayed), [displayed]);

  const Icon = (() => {
    if (part.partNumber === 1) return Search;
    if (part.partNumber === 5) return FileText;
    return Brain;
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      exit={{ opacity: 0, translateY: 6 }}
    >
      <div
        className={`rounded-lg border shadow-sm overflow-hidden transition-shadow duration-300 ${
          isActive
            ? "border-indigo-400 bg-indigo-50 dark:bg-slate-800/40 shadow-lg"
            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40"
        }`}
      >
        <div
          onClick={onToggle}
          className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-slate-100 dark:bg-slate-800">
              <Icon className="h-4 w-4 text-slate-700 dark:text-slate-200" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                {partMetadataTitle(part.partNumber)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Part {part.partNumber}
                {isActive ? " • streaming…" : ""}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ChevronDown className={`h-5 w-5 text-slate-500 transform transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </div>
        </div>

        <motion.div
          initial={false}
          animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
          transition={{ type: "tween", duration: 0.35 }}
          className="px-4 overflow-hidden"
        >
          <div className="py-3">
            {part.thoughts && part.thoughts.length > 0 && (
              <div className="rounded-md border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Internal Reasoning</div>
                </div>
                <div className="mt-2 space-y-2">
                  {part.thoughts.map((t, i) => (
                    <p key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {t}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {part.searchQueries && part.searchQueries.length > 0 && (
              <div className="rounded-md border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Research Queries</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">({part.searchQueries.length})</div>
                </div>
                <div className="mt-3 grid gap-2">
                  {part.searchQueries.map((q, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {i + 1}
                      </div>
                      <div className="flex-1 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {q}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {part.deliverable && (
              <div className="rounded-md border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Deliverable</div>
                  {isActive && <div className="text-xs text-indigo-600 dark:text-indigo-300">live</div>}
                </div>

                {part.partNumber === 5 && typeof part.deliverable === "object" ? (
                  <SwotMatrixDisplay data={part.deliverable as SwotMatrixData} />
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {formatted}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default function ProfessionalLegalChat(props: {
  analysisParts: AnalysisState[];
  isStreaming: boolean;
  isComplete: boolean;
  caseDescription?: string;
  currentPartNumber: number;
}) {
  const { analysisParts, isStreaming, isComplete, caseDescription, currentPartNumber } = props;

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [recentActive, setRecentActive] = useState<number | null>(null);
  const collapseTimersRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    if (!currentPartNumber) return;
    const prev = recentActive;
    setRecentActive(currentPartNumber);
    setExpanded((s) => new Set(Array.from(s).concat(currentPartNumber)));

    if (prev && prev !== currentPartNumber) {
      const existing = collapseTimersRef.current.get(prev);
      if (existing) {
        clearTimeout(existing);
        collapseTimersRef.current.delete(prev);
      }
      const id = window.setTimeout(() => {
        setExpanded((s) => {
          const ns = new Set(s);
          ns.delete(prev);
          return ns;
        });
        collapseTimersRef.current.delete(prev);
      }, GRACE_COLLAPSE_MS);
      collapseTimersRef.current.set(prev, id);
    }

    return () => {
      collapseTimersRef.current.forEach((id) => clearTimeout(id));
      collapseTimersRef.current.clear();
    };
  }, [currentPartNumber, recentActive]);

  const toggle = (num: number) => {
    setExpanded((s) => {
      const ns = new Set(s);
      if (ns.has(num)) ns.delete(num);
      else ns.add(num);
      return ns;
    });
  };

  const parts = useMemo(() => {
    return [...analysisParts].sort((a, b) => a.partNumber - b.partNumber);
  }, [analysisParts]);

  return (
    <Card className="w-full bg-transparent border-0">
      <CardHeader className="px-0">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-gradient-to-br from-slate-100 to-white dark:from-slate-800 dark:to-slate-900">
              <Bot className="h-6 w-6 text-slate-800 dark:text-slate-100" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Legal Analysis Directive</CardTitle>
              {caseDescription ? (
                <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Analysis for: "{caseDescription.slice(0, 110)}{caseDescription.length > 110 ? "..." : ""}"
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isStreaming && !isComplete && <Badge className="animate-pulse">Analyzing…</Badge>}
            {isComplete && (
              <Badge className="bg-green-600 text-white flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Complete
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-0">
        <div className="space-y-4">
          {parts.map((part) => {
            const isActive = isStreaming && part.partNumber === currentPartNumber;
            const isExpanded = expanded.has(part.partNumber);

            return (
              <AnalysisPart
                key={part.partNumber}
                part={part}
                isActive={isActive}
                isExpanded={isExpanded}
                onToggle={() => toggle(part.partNumber)}
              />
            );
          })}
        </div>

        {parts.length === 0 && (
          <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-4 text-sm text-slate-600">
            No analysis yet — start an analysis to see streaming output here.
          </div>
        )}
      </CardContent>
    </Card>
  );
}