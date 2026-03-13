'use client';

import React from 'react';
import { motion } from 'motion/react';

export default function SentimentAnalysis() {
  const score = 72;
  const rotation = (score / 100) * 180 - 90;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Sentiment Analysis</h2>
      <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark shadow-sm text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-yellow-500 to-primary opacity-20" />
        
        <p className="text-xs font-medium text-slate-500 mb-6 uppercase tracking-widest">Ibovespa Fear & Greed Index</p>
        
        <div className="relative w-48 h-24 mx-auto mb-6 overflow-hidden">
          {/* Gauge Background */}
          <svg className="w-full h-full" viewBox="0 0 100 50">
            <path 
              d="M10,50 A40,40 0 0,1 90,50" 
              fill="none" 
              stroke="#1e2e2a" 
              strokeWidth="8" 
              strokeLinecap="round" 
            />
            {/* Gradient Path */}
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#10b77f" />
              </linearGradient>
            </defs>
            <motion.path 
              initial={{ pathLength: 0 }}
              animate={{ pathLength: score / 100 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              d="M10,50 A40,40 0 0,1 90,50" 
              fill="none" 
              stroke="url(#gaugeGradient)" 
              strokeWidth="8" 
              strokeLinecap="round" 
            />
          </svg>
          
          {/* Needle */}
          <motion.div 
            initial={{ rotate: -90 }}
            animate={{ rotate: rotation }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute bottom-0 left-1/2 w-1 h-16 bg-white origin-bottom -translate-x-1/2 rounded-full shadow-lg z-10"
            style={{ bottom: '0' }}
          />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full border-4 border-background-dark z-20" />
        </div>

        <div className="flex flex-col items-center justify-center -mt-4 mb-6">
          <span className="text-4xl font-black text-white tracking-tighter">{score}</span>
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Greed</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-background-dark/50 rounded-xl border border-border-dark group hover:border-primary/30 transition-colors">
            <p className="text-slate-500 mb-1 font-bold uppercase tracking-tighter">Bullish</p>
            <p className="text-lg font-black text-primary">68%</p>
          </div>
          <div className="p-3 bg-background-dark/50 rounded-xl border border-border-dark group hover:border-rose-500/30 transition-colors">
            <p className="text-slate-500 mb-1 font-bold uppercase tracking-tighter">Bearish</p>
            <p className="text-lg font-black text-rose-500">32%</p>
          </div>
        </div>
      </div>

      <motion.div 
        whileHover={{ scale: 1.02 }}
        className="bg-primary p-4 rounded-xl text-background-dark shadow-lg shadow-primary/10 cursor-pointer"
      >
        <h4 className="text-sm font-black uppercase tracking-wider mb-1">Market Insight</h4>
        <p className="text-xs font-medium leading-relaxed opacity-90">
          IBOV is showing strong resistance at 128.5k level. Watch for volatility during US opening hours.
        </p>
      </motion.div>
    </div>
  );
}
