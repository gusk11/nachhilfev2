'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { pageEnterVariants, pageExitVariants } from '@/app/lib/motionVariants';

interface MotionPageWrapperProps {
  children: React.ReactNode;
}

export default function MotionPageWrapper({ children }: MotionPageWrapperProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={pageEnterVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.25 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
