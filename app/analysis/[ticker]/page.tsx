'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle, Info, Loader2, XCircle, Save, X, BrainCircuit, TrendingUp, TrendingDown, Activity, Target, ShieldAlert, DollarSign } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

type AnalysisData = {
  ticker: string;
  indicators: {
    rsi: number | null;
    sma50: number | null;
    macd: number | null;
    atr: number | null;
  };
  analysis: {
    recommendation: string;
    entry_price: number;
    stop_loss: number;
    take_profit: number;
    justification: string;
  };
};

const getRecommendationStyles = (recommendation: string) => {
  if (recommendation?.includes('Compra Forte')) return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: <CheckCircle className="w-6 h-6" /> };
  if (recommendation?.includes('Compra')) return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: <CheckCircle className="w-6 h-6" /> };
  if (recommendation?.includes('Venda')) return { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', icon: <XCircle className="w-6 h-6" /> };
  return { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', icon: <Info className="w-6 h-6" /> };
};

export default function AnalysisPage() {
  const params = useParams();
  const ticker = (params.ticker as string).toUpperCase();
  const router = useRouter();
  const supabase = createClient();

  const [data, setData] = useState<AnalysisData | null>(null);
  const [assetData, setAssetData] = useState<any>(null); // NOVO: Para buscar o preço real
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tradeValues, setTradeValues] = useState({ entry: '', stop: '', target: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!ticker) return;

    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // 1. Busca a cotação ao vivo para o cabeçalho
        const resAsset = await fetch('/api/watchlist-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers: [ticker] }),
        });
        const assetJson = await resAsset.json();
        if (assetJson && assetJson[ticker]) {
          setAssetData(assetJson[ticker]);
        }

        // 2. Aciona o Robô Quantitativo da IA
        const resAi = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker }),
        });
        const resultAi = await resAi.json();
        
        if (!resAi.ok) throw new Error(resultAi.error || 'Falha ao analisar o ativo');
        
        setData(resultAi);
        
        // Preenche o modal com os dados sugeridos pela IA
        setTradeValues({
          entry: resultAi.analysis.entry_price?.toString() || '',
          stop: resultAi.analysis.stop_loss?.toString() || '',
          target: resultAi.analysis.take_profit?.toString() || ''
        });

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
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
        ticker: ticker,
        entry_price: parseFloat(tradeValues.entry.replace(',', '.')),
        stop_loss: parseFloat(tradeValues.stop.replace(',', '.')),
        target_price: parseFloat(tradeValues.target.replace(',', '.')),
        status: 'active'
      });

      if (error) {
        if (error.code === '23505') alert('Este ativo já está na sua Watchlist.');
        else throw error;
      } else {
        router.push('/watchlist');
      }
    } catch (e: any) {
      alert('Erro ao guardar: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background-dark">
        <div className="hidden md:block"><Sidebar /></div>
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Header />
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Robô Quantitativo a analisar {ticker}...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen bg-background-dark">
        <div className="hidden md:block"><Sidebar /></div>
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Header />
          <div className="flex-1 flex flex-col items-center justify-center text-rose-500">
            <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm font-bold uppercase tracking-widest">Erro: {error || 'Dados não encontrados.'}</p>
            <button onClick={() => router.back()} className="mt-6 px-6 py-2 bg-surface-dark border border-border-dark rounded-xl text-white font-bold hover:bg-white/5 transition-colors">Voltar</button>
          </div>
        </main>
      </div>
    );
  }

  const { recommendation, entry_price, stop_loss, take_profit, justification } = data.analysis;
  const styles = getRecommendationStyles(recommendation);

  return (
    <div className="flex min-h-screen bg-background-dark">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />
        
        <div className="p-4 md:p-8 max-w-5xl mx-auto w-full pb-20 space-y-6">
          
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-bold uppercase tracking-widest text-xs">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          {/* Cabeçalho do Ativo com Cotação Real */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-surface-dark border border-border-dark flex items-center justify-center font-black text-2xl text-primary shadow-lg">
                {ticker.charAt(0)}
              </div>
              <div>
                <h1 className="text-4xl font-black text-white tracking-tight">{ticker}</h1>
                <p className="text-slate-400 font-medium uppercase tracking-widest text-sm mt-1">
                  {assetData?.name || 'Ação Brasileira'}
                </p>
              </div>
            </div>

            {assetData && (
              <div className="text-right bg-surface-dark p-4 rounded-2xl border border-border-dark shadow-sm">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Cotação Atual</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-mono font-black text-white">R$ {assetData.price.toFixed(2)}</span>
                  <span className={`flex items-center gap-1 text-sm font-bold ${assetData.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {assetData.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {assetData.change.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Painel Central do Robô Quantitativo */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }}
            className="bg-surface-dark rounded-3xl border border-primary/20 shadow-lg relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-primary to-emerald-500" />
            
            <div className="p-6 md:p-8 space-y-8">
              
              {/* Sinal Principal */}
              <div className={`flex items-center gap-4 p-5 rounded-2xl border ${styles.border} ${styles.bg}`}>
                <div className={styles.text}>{styles.icon}</div>
                <div>
                  <h2 className={`text-2xl font-black uppercase tracking-widest ${styles.text}`}>{recommendation}</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase mt-1">Sinal do Robô Quantitativo</p>
                </div>
              </div>

              {/* Indicadores Técnicos (AGORA VISÍVEIS!) */}
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Métricas Técnicas
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-background-dark/50 p-3 rounded-xl border border-border-dark">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">RSI (14)</p>
                    <p className="text-lg font-mono font-black text-white">{data.indicators.rsi?.toFixed(1) || 'N/A'}</p>
                  </div>
                  <div className="bg-background-dark/50 p-3 rounded-xl border border-border-dark">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">MACD Hist</p>
                    <p className={`text-lg font-mono font-black ${data.indicators.macd && data.indicators.macd > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {data.indicators.macd?.toFixed(3) || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-background-dark/50 p-3 rounded-xl border border-border-dark">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">SMA (50)</p>
                    <p className="text-lg font-mono font-black text-white">{data.indicators.sma50 ? `R$ ${data.indicators.sma50.toFixed(2)}` : 'N/A'}</p>
                  </div>
                  <div className="bg-background-dark/50 p-3 rounded-xl border border-border-dark">
                    <p className="text-[10px] text-primary font-bold uppercase mb-1">ATR (Risco)</p>
                    <p className="text-lg font-mono font-black text-primary">{data.indicators.atr ? `R$ ${data.indicators.atr.toFixed(2)}` : 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Trade Setup */}
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" /> Sugestão de Setup
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-background-dark p-5 rounded-2xl border border-border-dark shadow-inner">
                    <DollarSign className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Entrada</p>
                    <p className="text-2xl font-black text-white mt-1">R$ {entry_price?.toFixed(2)}</p>
                  </div>
                  <div className="bg-rose-500/5 p-5 rounded-2xl border border-rose-500/10 shadow-inner">
                    <ShieldAlert className="w-5 h-5 text-rose-400 mx-auto mb-2" />
                    <p className="text-xs text-rose-400 font-bold uppercase tracking-widest">Stop Loss</p>
                    <p className="text-2xl font-black text-rose-400 mt-1">R$ {stop_loss?.toFixed(2)}</p>
                  </div>
                  <div className="bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/10 shadow-inner">
                    <Target className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">Take Profit</p>
                    <p className="text-2xl font-black text-emerald-400 mt-1">R$ {take_profit?.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Tese de Investimento */}
              <div className="p-5 bg-background-dark/50 border border-border-dark rounded-2xl relative">
                <div className="absolute -top-3 left-4 bg-surface-dark px-2 text-[10px] font-black uppercase tracking-widest text-primary">Tese de Investimento da IA</div>
                <p className="text-slate-300 text-sm leading-relaxed mt-2">{justification}</p>
              </div>

              <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-primary hover:bg-primary/90 text-background-dark font-black py-4 px-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group uppercase tracking-widest"
              >
                <BrainCircuit className="w-5 h-5" />
                <span>Iniciar Monitorização do Setup</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>

          {/* O Seu Modal Intacto (Apenas com Estilos Refinados) */}
          <AnimatePresence>
            {isModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-surface-dark border border-border-dark w-full max-w-md rounded-3xl p-6 shadow-2xl relative mx-4"
                >
                  <button onClick={() => setIsModalOpen(false)} className="absolute top-5 right-5 text-slate-500 hover:bg-white/5 p-1 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                  
                  <h3 className="text-xl font-black text-white mb-1">Confirmar Setup</h3>
                  <p className="text-xs text-slate-400 mb-6 font-bold uppercase tracking-widest">Ajuste os parâmetros se desejar</p>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Entrada (R$)</label>
                      <input 
                        type="number" step="0.01"
                        value={tradeValues.entry}
                        onChange={(e) => setTradeValues({...tradeValues, entry: e.target.value})}
                        className="w-full bg-background-dark border border-border-dark rounded-xl py-3 px-4 text-white font-mono focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1 block">Stop Loss (R$)</label>
                        <input 
                          type="number" step="0.01"
                          value={tradeValues.stop}
                          onChange={(e) => setTradeValues({...tradeValues, stop: e.target.value})}
                          className="w-full bg-rose-500/5 border border-rose-500/20 rounded-xl py-3 px-4 text-rose-200 font-mono focus:ring-2 focus:ring-rose-500/50 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 block">Alvo (R$)</label>
                        <input 
                          type="number" step="0.01"
                          value={tradeValues.target}
                          onChange={(e) => setTradeValues({...tradeValues, target: e.target.value})}
                          className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl py-3 px-4 text-emerald-200 font-mono focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleSaveTrade}
                    disabled={isSaving}
                    className="w-full mt-8 bg-primary hover:bg-primary/90 text-background-dark font-black py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-widest text-xs transition-all"
                  >
                    {isSaving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> A GUARDAR...</>
                    ) : (
                      <><Save className="w-4 h-4" /> Guardar na Watchlist</>
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