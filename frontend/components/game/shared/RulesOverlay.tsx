'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RulesOverlayProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function RulesOverlay({ title, children, className, icon }: RulesOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleOpen = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleClose = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150); // Small buffer for desktop hover transition
  };

  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={() => {
        // Only trigger hover on desktop
        if (window.innerWidth >= 768) handleOpen();
      }}
      onMouseLeave={() => {
        if (window.innerWidth >= 768) handleClose();
      }}
    >
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300',
          'text-muted-foreground hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/20',
          isOpen && 'text-primary bg-primary/5 border-primary/20',
        )}
      >
        {icon || <HelpCircle className="w-4 h-4" />}
        <span className="text-xs font-bold tracking-wider uppercase">Rules</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop (Mobile Only) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[100] bg-background/60 backdrop-blur-md md:hidden"
            />

            {/* Content Overlay */}
            <motion.div
              initial={
                window.innerWidth < 768
                  ? { y: '100%' } // Mobile Slide Up
                  : { opacity: 0, y: 10, scale: 0.95 } // Desktop Fade
              }
              animate={window.innerWidth < 768 ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
              exit={window.innerWidth < 768 ? { y: '100%' } : { opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onMouseEnter={handleOpen}
              onMouseLeave={handleClose}
              className={cn(
                // Mobile: Bottom Sheet Design
                'fixed bottom-0 left-0 right-0 z-[101] w-full bg-card border-t border-primary/20 rounded-t-[2.5rem] p-8 pb-12',
                // Desktop: Dropdown Design
                'md:absolute md:bottom-auto md:left-1/2 md:top-full md:-translate-x-1/2 md:mt-2 md:w-[320px] md:rounded-2xl md:border md:p-6 md:shadow-2xl',
                'shadow-[0_-10px_40px_rgba(0,0,0,0.2)] md:shadow-2xl overflow-hidden',
              )}
            >
              {/* Mobile Handle (Visual Cue) */}
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6 md:hidden" />

              {/* Background Accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-12 -mt-12 blur-3xl" />

              <div className="relative space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-serif text-xl md:text-lg font-bold text-primary flex items-center gap-2">
                      <Sparkles className="w-5 h-5 md:w-4 md:h-4" />
                      {title}
                    </h3>
                    <div className="h-0.5 w-8 bg-primary/30 rounded-full" />
                  </div>

                  {/* Close button - Desktop only or as explicit mobile action */}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-full hover:bg-primary/5 transition-colors"
                  >
                    <X className="w-5 h-5 md:w-4 md:h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto no-scrollbar pb-2">
                  {children}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
