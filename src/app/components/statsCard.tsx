import Image from "next/image";
import { motion } from "framer-motion";
import { statCardTransition, STAT_VALUE_TRANSITION } from "./statsCardMotion";

interface StatsCardProps {
  icon: string;
  header: string;
  content: string;
  delay: string;
  className?: string;
}

export default function StatsCard({
  icon,
  header,
  content,
  delay,
  className = ''
}: StatsCardProps) {
  // Determine icon color based on header
  const getIconColor = () => {
    switch (header.toLowerCase()) {
      case 'to do':
        return 'text-amber-500';
      case 'all projects':
        return 'text-blue-500';
      case 'complete':
        return 'text-green-500';
      default:
        return 'text-primary-default';
    }
  };

  // The hover tint (it only paints under `hover:bg-gradient-to-br`). RD-2: each card's stops are
  // tokens, so Classic keeps its own colour per card and the mode switches in CSS.
  const getGradientClass = () => {
    switch (header.toLowerCase()) {
      case 'to do':
        return 'hover:from-[var(--stat-todo-a)] hover:to-[var(--stat-todo-b)]';
      case 'all projects':
        return 'hover:from-[var(--stat-proj-a)] hover:to-[var(--stat-proj-b)]';
      case 'complete':
        return 'hover:from-[var(--stat-done-a)] hover:to-[var(--stat-done-b)]';
      default:
        return 'hover:from-[var(--stat-all-a)] hover:to-[var(--stat-all-b)]';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={statCardTransition(delay)}
      className={`lg:p-5 p-1 flex flex-row items-center gap-6 rounded-xl w-full h-full transition-all duration-300 
      bg-th-stat-bg [border-width:var(--stat-bw)] border-th-rule hover:shadow-lg group ${getGradientClass()} ${className}`}
    >
      <div className={`relative sm:p-3 rounded-xl shadow-sm group-hover:shadow-md transition-all duration-300 ${getIconColor()}
      bg-th-tile-bg [border-width:var(--edge-w)] border-th-edge`}>
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-10 h-10 flex items-center justify-center"
        >
          <Image 
            src={icon} 
            alt={header} 
            width={24} 
            height={24} 
            className="transition-transform duration-300 group-hover:scale-110"
          />
        </motion.div>
      </div>
      
      <div className="flex-1">
        <span className="sm:text-sm text-[8px] font-medium text-th-stat-label font-ui tracking-wide">
          {header.toUpperCase()}
        </span>
        <motion.p 
          className="sm:text-2xl text-lg font-bold text-th-ink-hd font-ui mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={STAT_VALUE_TRANSITION}
        >
          {content}
        </motion.p>
      </div>
      
      {/* Decorative element */}
      <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-th-ico-faint">
          <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </motion.div>
  );
}
