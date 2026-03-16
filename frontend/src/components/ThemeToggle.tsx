import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";

type Props = {
  theme: "dark" | "light";
  onToggle: () => void;
};

export function ThemeToggle({ theme, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-card)] border border-[var(--f1-border-strong)] hover:bg-[var(--bg-card-hover)] transition-colors"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <motion.div
        key={theme}
        initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.2 }}
      >
        {theme === "dark" ? (
          <Sun size={14} className="text-[var(--text-secondary)]" />
        ) : (
          <Moon size={14} className="text-[var(--text-secondary)]" />
        )}
      </motion.div>
    </button>
  );
}
