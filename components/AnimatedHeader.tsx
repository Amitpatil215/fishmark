import { FishSymbol } from "lucide-react";
import { motion } from "framer-motion";

export function AnimatedHeader() {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, 15, -15, 0] }}
        transition={{
          duration: 3,
          ease: "easeInOut",
          repeat: Infinity,
          repeatDelay: 1
        }}
      >
        <FishSymbol className="text-primary" />
      </motion.div>
      <h1 className="text-2xl font-semibold">
        Fishmark
      </h1>
    </div>
  );
} 