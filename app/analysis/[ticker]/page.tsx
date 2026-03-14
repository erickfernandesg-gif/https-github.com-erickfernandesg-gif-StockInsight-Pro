'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle, DollarSign, Info, Loader2, Target, XCircle, Save, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion'; // Ajustado para o padrão do framer-motion

type AnalysisData = {
  ticker: string;
  indicators: any;
  analysis: {
    recommendation: string;
    entry_price: number;
    stop_loss: number;
    take_profit: number;
    justification: string;
  };
};

const getRecommendationStyles = (recommendation: string) => {
  switch (recommendation) {
    case 'Compra Forte':
      return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
        icon: <CheckCircle className="w-5 h-5" />,
      };
    case 'Compra':
      return {
        bg: 'bg-green-500/10',
        border: 'border-green-500/20',
        text: 'text-green-400',
        icon: <CheckCircle className="w-5 h-5" />,
      };
    case 'Venda':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        text: 'text-red-400',
        icon: <XCircle className="w-5 h-5" />,
      };
    default: // Neutro
      return {
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/20',
        text: 'text-slate-400',
        icon: <Info className="w-5 h-5" />,
      };
  }
};

export default function AnalysisPage() {
  const params = useParams();
  const ticker = params.ticker as string;
  const [data, setData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Trade Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tradeValues, setTradeValues] = useState({ entry: 0, stop: 0, target: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!ticker) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker: ticker.toUpperCase() }),
        });
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || 'Failed to fetch analysis');
        }
        setData(result);
        setTradeValues({
          entry: result.analysis.entry_price,
          stop: result.analysis.stop_loss,
          target: result.analysis.take_profit
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [ticker]);

  const handleSaveTrade = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { error } = await supabase.from('user_favorites').insert({
        user_id: user.id,
        ticker: ticker.toUpperCase(),
        entry_price: tradeValues.entry,
        stop_loss: tradeValues.stop,
        target_price: tradeValues.target,
        status: 'active'
      });

      if (error) {
        if (error.code === '23505') alert('Este ativo já está na sua lista.');
        else throw error;
      } else {
        router.push('/watchlist');
      }
    } catch (e: any) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 1. TELA DE LOADING (Agora com Sidebar e Header)
  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background-dark">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Header />
          <div className="flex-1 flex items-center justify-center text-white">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="ml-4 text-lg">Analisando {ticker.toUpperCase()}...</p>
          </div>
        </main>
      </div>
    );
  }

  // 2. TELA DE ERRO (Agora com Sidebar e Header)
  if (error || !data) {
    return (
      <div className="flex min-h-screen bg-background-dark">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Header />
          <div className="flex-1 flex items-center justify-center text-red-400">
            <XCircle className="w-8 h-8 mr-4" />
            <p className="text-lg">Erro ao analisar: {error || 'Dados não encontrados.'}</p>
          </div>
        </main>
      </div>
    );
  }

  const { recommendation, entry_price, stop_loss, take_profit, justification } = data.analysis;
  const styles = getRecommendationStyles(recommendation);

  // 3. TELA PRINCIPAL DE ANÁLISE (Com Sidebar e Header)
  return (
    <div className="flex min-h-screen bg-background-dark">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />
        
        {/* Conteúdo Centralizado da Análise */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full text-white pb-20">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase mb-2">
            Análise <span className="text-primary">{data.ticker}</span>
          </h1>
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${styles.border} ${styles.bg} mb-8`}>
            <div className={styles.text}>{styles.icon}</div>
            <div>
              <h2 className={`text-xl font-bold ${styles.text}`}>{recommendation}</h2>
              <p className="text-sm text-slate-400">{justification}</p>
            </div>
          </div>

          <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark">
            <h3 className="text-lg font-bold text-white mb-4">Trade Setup</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div className="bg-background-dark/50 p-4 rounded-lg">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Entrada</p>
                <p className="text-2xl font-black text-primary">${entry_price?.toFixed(2)}</p>
              </div>
              <div className="bg-background-dark/50 p-4 rounded-lg">
                <p className="text-xs text-red-400 font-bold uppercase tracking-widest">Stop Loss</p>
                <p className="text-2xl font-black text-white">${stop_loss?.toFixed(2)}</p>
              </div>
              <div className="bg-background-dark/50 p-4 rounded-lg col-span-2 md:col-span-1">
                <p className="text-xs text-green-400 font-bold uppercase tracking-widest">Take Profit</p>
                <p className="text-2xl font-black text-white">${take_profit?.toFixed(2)}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full mt-6 bg-primary hover:bg-primary/90 text-background-dark font-black py-3.5 px-4 rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group"
            >
              <span>MONITORAR OPERAÇÃO</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Modal de Salvar Trade */}
          <AnimatePresence>
            {isModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-surface-dark border border-border-dark w-full max-w-md rounded-2xl p-6 shadow-2xl relative mx-4"
                >
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  
                  <h3 className="text-xl font-black text-white mb-1">Confirmar Setup</h3>
                  <p className="text-sm text-slate-400 mb-6">Ajuste os parâmetros antes de iniciar o monitoramento.</p>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Entrada</label>
                      <input 
                        type="number" 
                        value={tradeValues.entry}
                        onChange={(e) => setTradeValues({...tradeValues, entry: parseFloat(e.target.value)})}
                        className="w-full bg-background-dark border border-border-dark rounded-lg p-3 text-white font-mono focus:ring-2 focus:ring-primary/50 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-red-400 uppercase tracking-widest">Stop Loss</label>
                        <input 
                          type="number" 
                          value={tradeValues.stop}
                          onChange={(e) => setTradeValues({...tradeValues, stop: parseFloat(e.target.value)})}
                          className="w-full bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-200 font-mono focus:ring-2 focus:ring-red-500/50 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-green-400 uppercase tracking-widest">Take Profit</label>
                        <input 
                          type="number" 
                          value={tradeValues.target}
                          onChange={(e) => setTradeValues({...tradeValues, target: parseFloat(e.target.value)})}
                          className="w-full bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-200 font-mono focus:ring-2 focus:ring-green-500/50 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleSaveTrade}
                    disabled={isSaving}
                    className="w-full mt-6 bg-primary hover:bg-primary/90 text-background-dark font-black py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>SALVAR NA WATCHLIST</span>
                      </>
                    )}
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}