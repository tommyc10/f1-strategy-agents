import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type Position = {
  driver: string;
  position: number;
  gap_to_leader: number;
};

const COLLAPSED_COUNT = 10;

export function ResultsTable({ positions }: { positions: Position[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? positions : positions.slice(0, COLLAPSED_COUNT);
  const canExpand = positions.length > COLLAPSED_COUNT;

  return (
    <Card className="backdrop-blur-xl h-full flex flex-col">
      <CardHeader className="px-5 py-3">
        <h2 className="text-[10px] uppercase tracking-[2px] text-[var(--f1-accent-muted)] font-semibold">
          Classification
        </h2>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-full">
          <div className="divide-y divide-border">
            {visible.map((p, i) => (
              <motion.div
                key={p.driver}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`flex items-center px-5 py-2 text-sm ${
                  p.position <= 3 ? "bg-[var(--bg-highlight)]" : ""
                }`}
              >
                <span
                  className={`w-8 text-xs font-mono ${
                    p.position === 1
                      ? "text-yellow-500"
                      : p.position === 2
                        ? "text-muted-foreground"
                        : p.position === 3
                          ? "text-amber-600"
                          : "text-muted-foreground"
                  }`}
                >
                  P{p.position}
                </span>
                <span className="flex-1 text-foreground font-medium text-[13px]">{p.driver}</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {p.position === 1 ? "LEADER" : `+${p.gap_to_leader.toFixed(1)}s`}
                </span>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      {canExpand && (
        <div className="border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            {expanded ? "Show less" : `+${positions.length - COLLAPSED_COUNT} more`}
            <ChevronDown size={10} className={`ml-1 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </Button>
        </div>
      )}
    </Card>
  );
}
