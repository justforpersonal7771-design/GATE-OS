"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Sparkles, Flame, CheckCircle2, TrendingUp, Trophy, Compass } from "lucide-react";

interface HeroSectionProps {
  streak: number;
  solved: number;
  accuracy: number;
  onNewExam: () => void;
}

export function HeroSection({ streak, solved, accuracy, onNewExam }: HeroSectionProps) {
  const [animatedStreak, setAnimatedStreak] = useState(0);
  const [animatedSolved, setAnimatedSolved] = useState(0);
  const [animatedAccuracy, setAnimatedAccuracy] = useState(0);

  useEffect(() => {
    // Smooth counting animation on mount
    const duration = 1200;
    const steps = 60;
    const stepTime = duration / steps;
    
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      // Ease out quad
      const easeProgress = progress * (2 - progress);

      setAnimatedStreak(Math.round(streak * easeProgress));
      setAnimatedSolved(Math.round(solved * easeProgress));
      setAnimatedAccuracy(Math.round(accuracy * easeProgress));

      if (currentStep >= steps) {
        setAnimatedStreak(streak);
        setAnimatedSolved(solved);
        setAnimatedAccuracy(accuracy);
        clearInterval(interval);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [streak, solved, accuracy]);

  // Determine mastery level and estimated readiness
  const masteryLevel = solved > 300 
    ? "Grandmaster Scholar" 
    : solved > 150 
      ? "Master Scholar" 
      : solved > 50 
        ? "Advanced Scholar" 
        : "Scholar Novice";

  // Estimating readiness using a formula: accuracy weight (75%) + questions solved weight (25%, max 400 questions)
  const solvedWeight = Math.min(solved / 4, 25);
  const accuracyWeight = accuracy * 0.75;
  const estimatedReadiness = Math.round(solvedWeight + accuracyWeight);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 border border-indigo-500/20 text-white shadow-xl p-6 md:p-8">
      {/* Dynamic Animated Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 40, 0],
            y: [0, -30, 0],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 blur-3xl"
        />
        <motion.div 
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -40, 0],
            y: [0, 30, 0],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 blur-3xl"
        />
      </div>

      <div className="relative z-10 flex flex-col xl:flex-row gap-6 justify-between items-stretch">
        
        {/* Welcome Text Block */}
        <div className="flex flex-col justify-between max-w-2xl">
          <div className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold border border-white/10 uppercase tracking-widest text-indigo-200"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>GATE Preparation Workspace</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight"
            >
              Conquer your <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">GATE 2027 Goals</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-slate-300 font-medium text-sm md:text-base leading-relaxed"
            >
              Your personal study engine. Analyze weaknesses, test accuracy, schedule practice routines, and maintain your learning streak every single day.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-4 mt-6 xl:mt-8"
          >
            <button
              onClick={onNewExam}
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 font-extrabold tracking-wide uppercase text-xs rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition cursor-pointer"
            >
              Start Practice Session
            </button>
          </motion.div>
        </div>

        {/* Floating Glass Stats Summary Cards */}
        <motion.div 
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
          className="flex-1 max-w-xl grid grid-cols-2 md:grid-cols-3 gap-4"
        >
          {/* Streak Card */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-12 h-12 bg-rose-500/10 rounded-bl-full pointer-events-none transition-all group-hover:scale-125" />
            <div className="text-[10px] font-black text-rose-300 uppercase tracking-widest flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 fill-rose-500 stroke-none" />
              <span>Streak</span>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-white tracking-tighter">{animatedStreak}</span>
              <span className="text-xs text-rose-200 ml-1 font-bold">Days</span>
            </div>
          </div>

          {/* Solved Card */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/10 rounded-bl-full pointer-events-none transition-all group-hover:scale-125" />
            <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Solved</span>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-white tracking-tighter">{animatedSolved}</span>
              <span className="text-xs text-indigo-200 ml-1 font-bold">Questions</span>
            </div>
          </div>

          {/* Accuracy Card */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group col-span-2 md:col-span-1">
            <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/10 rounded-bl-full pointer-events-none transition-all group-hover:scale-125" />
            <div className="text-[10px] font-black text-emerald-300 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Accuracy</span>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-white tracking-tighter">{animatedAccuracy}%</span>
            </div>
          </div>

          {/* Mastery Level */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between shadow-lg col-span-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/10 rounded-bl-full pointer-events-none transition-all group-hover:scale-125" />
            <div className="text-[10px] font-black text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              <span>Mastery Rank</span>
            </div>
            <div className="mt-3 font-extrabold text-lg text-amber-100 uppercase tracking-wide truncate">
              {masteryLevel}
            </div>
          </div>

          {/* Estimated Readiness */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-12 h-12 bg-purple-500/10 rounded-bl-full pointer-events-none transition-all group-hover:scale-125" />
            <div className="text-[10px] font-black text-purple-300 uppercase tracking-widest flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>Readiness</span>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-white tracking-tighter">{estimatedReadiness}%</span>
            </div>
          </div>

        </motion.div>

      </div>
    </div>
  );
}
