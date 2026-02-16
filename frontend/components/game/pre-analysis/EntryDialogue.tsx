import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface EntryDialogueProps {
  onStart: () => void;
}

type DialogueKey = 'start' | 'what' | 'dontcare' | 'mockery';

export const EntryDialogue: React.FC<EntryDialogueProps> = ({ onStart }) => {
  const [dialogueKey, setDialogueKey] = useState<DialogueKey>('start');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  const renderContent = () => {
    switch (dialogueKey) {
      case 'start':
        return (
          <>
            <motion.div
              variants={itemVariants}
              className="text-xl md:text-3xl font-serif text-primary mb-8 text-center space-y-4"
            >
              <p>
                Before we start...{' '}
                <span className="font-bold">I need to ask you a few questions.</span>
              </p>
              <p>
                Please answer them <span className="font-bold">calmly and honestly</span>. Your
                responses will not be stored or shared.
              </p>
            </motion.div>
            <div className="flex flex-col gap-4 w-full max-w-sm">
              <motion.div variants={itemVariants}>
                <Button
                  variant="outline"
                  onClick={() => setDialogueKey('what')}
                  className="w-full text-lg py-6 border-primary/20 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all duration-300"
                >
                  What are we doing exactly?
                </Button>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Button
                  variant="outline"
                  onClick={() => setDialogueKey('mockery')}
                  className="w-full text-lg py-6 border-primary/20 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all duration-300"
                >
                  Okay.
                </Button>
              </motion.div>
            </div>
          </>
        );

      case 'what':
        return (
          <>
            <motion.div variants={itemVariants} className="space-y-4 text-center mb-8 max-w-md">
              <p className="text-lg md:text-xl font-serif text-primary">
                We’re going to look into your film taste in detail.
              </p>
              <p className="text-lg md:text-xl font-serif text-primary">It will be fun.</p>
              <p className="text-lg md:text-xl font-serif text-primary font-bold">
                But first, you need to answer a few questions correctly.
              </p>
            </motion.div>
            <motion.div variants={itemVariants} className="w-full max-w-xs">
              <Button size="lg" onClick={onStart} className="w-full text-xl py-6">
                Let&apos;s start
              </Button>
            </motion.div>
          </>
        );

      case 'mockery':
        return (
          <>
            <motion.p
              variants={itemVariants}
              className="text-xl md:text-2xl font-serif text-primary mb-8 text-center"
            >
              You don’t even know what we’re doing.
            </motion.p>
            <div className="flex flex-col gap-4 w-full max-w-sm">
              <motion.div variants={itemVariants}>
                <Button
                  variant="outline"
                  onClick={() => setDialogueKey('what')}
                  className="w-full text-lg py-6 border-primary/20 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all duration-300"
                >
                  What are we doing exactly?
                </Button>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Button
                  variant="outline"
                  onClick={() => setDialogueKey('dontcare')}
                  className="w-full text-lg py-6 border-primary/20 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all duration-300"
                >
                  I don&apos;t really care.
                </Button>
              </motion.div>
            </div>
          </>
        );

      case 'dontcare':
        return (
          <>
            <motion.p
              variants={itemVariants}
              className="text-xl md:text-2xl font-serif text-primary mb-8 text-center"
            >
              Fair enough.
            </motion.p>
            <motion.div variants={itemVariants} className="w-full max-w-xs">
              <Button size="lg" onClick={onStart} className="w-full text-xl py-6">
                Let&apos;s start
              </Button>
            </motion.div>
          </>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-[100dvh] w-full p-6 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={dialogueKey}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="flex flex-col items-center w-full max-w-md"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
