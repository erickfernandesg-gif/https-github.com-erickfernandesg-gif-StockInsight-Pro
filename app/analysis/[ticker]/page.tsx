'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Activity, 
  BarChart3, 
  Target, 
  ChevronDown, 
  Settings2, 
  Maximize2, 
  CheckCircle2, 
  AlertTriangle,
  Bolt,
  Loader2,
  TrendingDown,
  Minus
} from 'lucide-react';

interface AnalysisResult {
  decisao: 'Buy' | 'Sell' | 'Neutral';
  precoEntrada: string;
  stopLoss: string;
  takeProfit: string;
  justificativa: string;
  confidence?: number;
}

interface IndicatorData {
  sma200: number[];
  ema9: number[];
  ema21: number[];
  rsi: number[];
  macd: { macd: number[]; signal: number[]; histogram: number[] };
  bollinger: { upper: number[]; middle: number[]; lower: number[] };
}

export default function AnalysisPage() {
  const params = useParams();
  const ticker = (params.ticker as string).toUpperCase();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [indicators, setIndicators] = useState<any | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const supabase = createClient();

  const fetchAnalysis = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.analysis);
        setIndicators(data.indicators);
        setHistoricalData(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
    } finally {
      setIsLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    fetchAnalysis();
    
    const checkFavorite = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('user_favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('ticker', ticker)
          .single();
        setIsFavorite(!!data);
      }
    };
    checkFavorite();
  }, [fetchAnalysis, ticker, supabase]);

  const handleToggleFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isFavorite) {
      await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('ticker', ticker);
      setIsFavorite(false);
    } else {
      await supabase
        .from('user_favorites')
        .insert([{ user_id: user.id, ticker }]);
      setIsFavorite(true);
    }
  };

  const candlesticks = useMemo(() => {
    if (!historicalData.length) return [];
    
    // Map historical data to chart coordinates
    const maxPrice = Math.max(...historicalData.map(d => d.h));
    const minPrice = Math.min(...historicalData.map(d => d.l));
    const range = maxPrice - minPrice;
    
    return historicalData.slice(-20).map((d, i) => {
      const x = 50 + i * 35;
      const y = 300 - ((d.o - minPrice) / range) * 200;
      const h = Math.abs(((d.c - d.o) / range) * 200);
      return {
        x,
        y: d.c > d.o ? y - h : y,
        h: Math.max(h, 2),
        isUp: d.c >= d.o,
        raw: d
      };
    });
  }, [historicalData]);

  const currentPrice = historicalData.length > 0 ? historicalData[historicalData.length - 1].c : 0;
  const prevPrice = historicalData.length > 1 ? historicalData[historicalData.length - 2].c : currentPrice;
  const priceChange = ((currentPrice - prevPrice) / prevPrice) * 100;

  return (
    <div className="flex min-h-screen bg-background-dark">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        
        {/* Sub-header */}
        <div className="h-16 border-b border-border-dark flex items-center justify-between px-8 bg-surface-dark/30 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-xl font-black text-white">{ticker}</span>
              <span className="text-slate-500 text-sm font-medium">NVIDIA Corporation</span>
            </div>
            <div className="h-6 w-px bg-border-dark"></div>
            <div className="flex gap-1">
              {['1D', '1W', '1M', '1Y', 'ALL'].map((range) => (
                <button 
                  key={range}
                  className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${
                    range === '1M' ? 'bg-primary/20 text-primary' : 'text-slate-500 hover:bg-surface-dark hover:text-slate-300'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span className={`size-2 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-primary'}`} />
              {isLoading ? 'Analyzing Market...' : 'Real-time Data Active'}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Current Price', value: `$${currentPrice.toFixed(2)}`, change: `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`, isPositive: priceChange >= 0 },
              { label: 'High (24h)', value: historicalData.length ? `$${historicalData[historicalData.length-1].h.toFixed(2)}` : '-', change: 'High', isPositive: true },
              { label: 'Low (24h)', value: historicalData.length ? `$${historicalData[historicalData.length-1].l.toFixed(2)}` : '-', change: null },
              { label: 'Volume', value: historicalData.length ? `${(historicalData[historicalData.length-1].v / 1000000).toFixed(1)}M` : '-', change: null },
            ].map((stat, i) => (
              <div key={i} className="bg-surface-dark/50 p-5 rounded-2xl border border-border-dark group hover:border-primary/30 transition-all">
                <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white group-hover:text-primary transition-colors">{stat.value}</span>
                  {stat.change && (
                    <span className={`text-xs font-bold ${stat.isPositive ? 'text-primary' : 'text-rose-500'}`}>{stat.change}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Chart Area */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-surface-dark/30 rounded-2xl border border-border-dark relative overflow-hidden flex flex-col min-h-[500px]">
                <div className="p-4 border-b border-border-dark flex justify-between items-center bg-surface-dark/50">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-widest">
                      <Activity className="w-4 h-4 text-primary" /> 
                      Advanced Candlestick View
                    </span>
                    <div className="flex gap-2">
                      <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-400/20 uppercase">EMA 9</span>
                      <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-400/20 uppercase">EMA 21</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={fetchAnalysis} className="size-8 flex items-center justify-center rounded-lg hover:bg-border-dark text-slate-400 hover:text-white transition-all">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
                    </button>
                    <button className="size-8 flex items-center justify-center rounded-lg hover:bg-border-dark text-slate-400 hover:text-white transition-all"><Maximize2 className="w-4 h-4" /></button>
                  </div>
                </div>

                {/* Chart Visualization Placeholder */}
                <div className="flex-1 relative chart-grid p-6">
                  {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background-dark/50 backdrop-blur-sm z-10">
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-sm font-black text-white uppercase tracking-widest">Generating AI Insights...</p>
                      </div>
                    </div>
                  ) : null}
                  
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 400">
                    {/* Simulated Candlesticks */}
                    {candlesticks.map((candle, i) => (
                      <g key={i}>
                        <line x1={candle.x + 4} y1={candle.y - 10} x2={candle.x + 4} y2={candle.y + candle.h + 10} stroke={candle.isUp ? '#10b77f' : '#f43f5e'} strokeWidth="1" />
                        <rect x={candle.x} y={candle.y} width="8" height={candle.h} fill={candle.isUp ? '#10b77f' : '#f43f5e'} rx="1" />
                      </g>
                    ))}
                    
                    {/* Price Line */}
                    <line x1="0" y1="80" x2="800" y2="80" stroke="#10b77f" strokeWidth="1" strokeDasharray="4" />
                    <rect x="740" y="70" width="60" height="20" fill="#10b77f" rx="4" />
                    <text x="745" y="84" fill="#10221c" fontSize="10" fontWeight="bold">{currentPrice.toFixed(2)}</text>
                  </svg>
                  
                  <div className="absolute bottom-4 left-4 flex gap-6 text-[10px] font-mono text-slate-500 font-bold uppercase tracking-widest">
                    {historicalData.length > 0 && (
                      <>
                        <div>O: <span className="text-slate-200">{historicalData[historicalData.length-1].o.toFixed(2)}</span></div>
                        <div>H: <span className="text-slate-200">{historicalData[historicalData.length-1].h.toFixed(2)}</span></div>
                        <div>L: <span className="text-slate-200">{historicalData[historicalData.length-1].l.toFixed(2)}</span></div>
                        <div>C: <span className="text-slate-200">{historicalData[historicalData.length-1].c.toFixed(2)}</span></div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Indicators */}
              <div className="grid grid-cols-2 gap-6 h-48">
                <div className="bg-surface-dark/50 rounded-2xl border border-border-dark p-5">
                  <h4 className="text-[10px] font-black text-slate-500 mb-4 uppercase tracking-widest">RSI (Relative Strength Index)</h4>
                  <div className="h-24 w-full relative">
                    <svg className="w-full h-full" viewBox="0 0 400 100">
                      <rect x="0" y="30" width="400" height="40" fill="rgba(16, 183, 127, 0.05)" />
                      <path d="M 0 60 L 50 55 L 100 65 L 150 40 L 200 45 L 250 35 L 300 38 L 350 32 L 400 34" fill="none" stroke="#10b77f" strokeWidth="2" />
                    </svg>
                    <div className="absolute right-2 top-0 text-2xl font-black text-primary">
                      {indicators?.rsi?.length ? indicators.rsi[indicators.rsi.length - 1].toFixed(1) : '-'}
                    </div>
                  </div>
                </div>
                <div className="bg-surface-dark/50 rounded-2xl border border-border-dark p-5">
                  <h4 className="text-[10px] font-black text-slate-500 mb-4 uppercase tracking-widest">MACD Histogram</h4>
                  <div className="h-24 w-full flex items-end gap-1.5">
                    {indicators?.macd?.histogram?.slice(-15).map((h, i) => (
                      <div 
                        key={i} 
                        className={`flex-1 rounded-t-sm transition-all duration-500 ${h < 0 ? 'bg-rose-500/40' : 'bg-primary/40'}`} 
                        style={{ height: `${Math.min(Math.abs(h) * 10, 100)}%` }} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Analysis */}
            <div className="space-y-6">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">AI Analysis</h3>
                <div className={`border rounded-3xl p-8 text-center relative overflow-hidden group ${
                  analysis?.decisao === 'Buy' ? 'bg-primary/10 border-primary/30' : 
                  analysis?.decisao === 'Sell' ? 'bg-rose-500/10 border-rose-500/30' : 
                  'bg-slate-500/10 border-slate-500/30'
                }`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                  <div className={`size-16 rounded-full flex items-center justify-center mx-auto mb-4 text-background-dark shadow-xl group-hover:scale-110 transition-transform duration-500 ${
                    analysis?.decisao === 'Buy' ? 'bg-primary shadow-primary/20' : 
                    analysis?.decisao === 'Sell' ? 'bg-rose-500 shadow-rose-500/20' : 
                    'bg-slate-500 shadow-slate-500/20'
                  }`}>
                    {analysis?.decisao === 'Buy' ? <TrendingUp className="w-8 h-8" /> : 
                     analysis?.decisao === 'Sell' ? <TrendingDown className="w-8 h-8" /> : 
                     <Minus className="w-8 h-8" />}
                  </div>
                  <h4 className={`text-3xl font-black mb-1 uppercase tracking-tighter ${
                    analysis?.decisao === 'Buy' ? 'text-primary' : 
                    analysis?.decisao === 'Sell' ? 'text-rose-500' : 
                    'text-slate-400'
                  }`}>
                    {isLoading ? 'Analyzing...' : analysis?.decisao || 'Neutral'}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Confidence Score: {analysis?.confidence || 85}%
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Trade Setup</h5>
                <div className="space-y-3">
                  {[
                    { label: 'Entry Price', value: analysis?.precoEntrada || '-', color: 'text-primary' },
                    { label: 'Stop Loss', value: analysis?.stopLoss || '-', color: 'text-rose-500' },
                    { label: 'Take Profit', value: analysis?.takeProfit || '-', color: 'text-blue-400' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-surface-dark/50 border border-border-dark group hover:border-primary/30 transition-all">
                      <span className="text-xs font-medium text-slate-300">{item.label}</span>
                      <span className={`text-sm font-black uppercase tracking-widest ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-auto space-y-4">
                <div className="p-5 bg-surface-dark/30 rounded-2xl border border-dashed border-border-dark">
                  <p className="text-xs text-slate-500 italic leading-relaxed font-medium">
                    &quot;{analysis?.justificativa || 'Waiting for AI analysis to complete...'}&quot;
                  </p>
                </div>
                <button className="w-full py-4 bg-primary text-background-dark font-black rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/10">
                  EXECUTE TRADE <Bolt className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleToggleFavorite}
                  className={`w-full py-4 font-black rounded-2xl border transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 ${
                    isFavorite 
                      ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20' 
                      : 'bg-surface-dark text-white border-border-dark hover:bg-border-dark'
                  }`}
                >
                  {isFavorite ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> IN WATCHLIST
                    </>
                  ) : (
                    'ADD TO WATCHLIST'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
