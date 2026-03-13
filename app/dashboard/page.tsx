'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MarketSummary from '@/components/MarketSummary';
import AssetTable from '@/components/AssetTable';
import NewsSection from '@/components/NewsSection';
import SentimentAnalysis from '@/components/SentimentAnalysis';
import { motion } from 'motion/react';

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-background-dark">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />
        
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-black text-white mb-6 tracking-tight uppercase">
              Market <span className="text-primary">Overview</span>
            </h2>
            <MarketSummary />
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <motion.div 
              className="xl:col-span-2 space-y-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <AssetTable />
              <NewsSection />
            </motion.div>

            <motion.div 
              className="space-y-8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <SentimentAnalysis />
              
              {/* Market Status Widget */}
              <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Market Open</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">S&P 500 Index</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-white">5,137.08</span>
                    <span className="text-primary text-xs font-bold">+0.82%</span>
                  </div>
                </div>
              </div>

              {/* Security Widget */}
              <div className="bg-surface-dark p-4 rounded-xl border border-border-dark flex items-center justify-between group cursor-help">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04m17.236 0a11.955 11.955 0 01-8.618 3.04m0 0v6.72c0 3.12 1.58 6.157 4.235 7.812a11.952 11.952 0 004.383-7.812V5.984z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">AES-256 Encrypted</span>
                </div>
                <div className="size-2 rounded-full bg-primary/20 group-hover:bg-primary transition-colors" />
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
