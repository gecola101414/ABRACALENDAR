import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface BirthdayCakeSymbolProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

export const BirthdayCakeSymbol: React.FC<BirthdayCakeSymbolProps> = ({ 
  size = 'md', 
  showLabel = true,
  animated = true 
}) => {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const containerPadding = {
    sm: 'px-2 py-0.5 text-[9px] gap-1',
    md: 'px-3 py-1.5 text-xs gap-1.5',
    lg: 'px-4 py-2 text-sm gap-2'
  };

  return (
    <div className={`inline-flex items-center font-black rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 text-white shadow-md shadow-orange-500/20 border border-amber-200/50 ${containerPadding[size]}`}>
      {/* Cake with Lit Candle Graphic */}
      <div className={`relative flex items-center justify-center ${iconSizes[size]}`}>
        {/* Custom Lit Candle & Cake SVG */}
        <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Animated Flame with Lit Glow */}
          {animated ? (
            <motion.path
              d="M12 2C11 3.5 10.5 4.5 12 6C13.5 4.5 13 3.5 12 2Z"
              fill="#FFF066"
              stroke="#FF8800"
              strokeWidth="0.8"
              animate={{ 
                scale: [1, 1.25, 0.95, 1.15, 1],
                y: [0, -0.5, 0.3, -0.3, 0],
                filter: [
                  'drop-shadow(0 0 3px #FFE600)',
                  'drop-shadow(0 0 6px #FF9900)',
                  'drop-shadow(0 0 3px #FFE600)'
                ]
              }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            />
          ) : (
            <path
              d="M12 2C11 3.5 10.5 4.5 12 6C13.5 4.5 13 3.5 12 2Z"
              fill="#FFF066"
              stroke="#FF8800"
              strokeWidth="0.8"
            />
          )}

          {/* Candle stick */}
          <rect x="11.2" y="6" width="1.6" height="4" rx="0.5" fill="#FFFFFF" stroke="#D97706" strokeWidth="0.5" />

          {/* Top frosting layer */}
          <path
            d="M5 11C5 10.4 5.4 10 6 10H18C18.6 10 19 10.4 19 11C19 12 17.8 12.5 17 12C16.2 11.5 15.8 12.5 15 12.5C14.2 12.5 13.8 11.5 13 12C12.2 12.5 11.8 12.5 11 12.5C10.2 12.5 9.8 11.5 9 12C8.2 12.5 7.8 11.5 7 12C6.2 12.5 5 12 5 11Z"
            fill="#FFFBEB"
          />

          {/* Middle cake body */}
          <path
            d="M5 11.5H19V16.5C19 16.8 18.8 17 18.5 17H5.5C5.2 17 5 16.8 5 16.5V11.5Z"
            fill="#F472B6"
          />

          {/* Strawberry cream stripe */}
          <rect x="5" y="13.5" width="14" height="1.2" fill="#FDE047" />

          {/* Bottom cake plate / base */}
          <path
            d="M3 18C3 17.4 3.4 17 4 17H20C20.6 17 21 17.4 21 18C21 18.6 20.6 19 20 19H4C3.4 19 3 18.6 3 18Z"
            fill="#E0E7FF"
          />
        </svg>

        {animated && (
          <motion.span
            className="absolute -top-1 -right-1 pointer-events-none text-yellow-200"
            animate={{ rotate: [0, 15, -15, 0], scale: [0.8, 1.2, 0.8] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Sparkles className="w-2.5 h-2.5 text-yellow-200" />
          </motion.span>
        )}
      </div>

      {showLabel && (
        <span className="tracking-tight uppercase font-black whitespace-nowrap">
          CONFERMATO 🎂🕯️
        </span>
      )}
    </div>
  );
};
