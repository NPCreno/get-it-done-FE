import Image from "next/image";
import { motion } from "framer-motion";

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

  // Get gradient class based on header
  const getGradientClass = () => {
    switch (header.toLowerCase()) {
      case 'to do':
        return 'from-amber-50 to-amber-100/30';
      case 'all projects':
        return 'from-blue-50 to-blue-100/30';
      case 'complete':
        return 'from-green-50 to-green-100/30';
      default:
        return 'from-gray-50 to-gray-100/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: parseFloat(delay.split('-').pop() || '0') * 0.1 }}
      className={`lg:p-5 p-1 flex flex-row items-center gap-6 rounded-xl w-full h-full transition-all duration-300 
      hover:shadow-lg group ${getGradientClass()} ${className}`}
    >
      <div className={`relative sm:p-3 rounded-xl bg-white shadow-sm group-hover:shadow-md transition-all duration-300 ${getIconColor()}`}>
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
        <span className="sm:text-sm text-[8px] font-medium text-gray-500 font-lato tracking-wide">
          {header.toUpperCase()}
        </span>
        <motion.p 
          className="sm:text-2xl text-lg font-bold text-gray-800 font-lato mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {content}
        </motion.p>
      </div>
      
      {/* Decorative element */}
      <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-300">
          <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </motion.div>
  );
}
