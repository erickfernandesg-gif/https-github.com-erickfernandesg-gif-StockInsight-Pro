'use client';

import React from 'react';
import { Target, AlertTriangle } from 'lucide-react';

interface TradeRulerProps {
  ticker: string;
  entry: number;
  stop: number;
  target: number;
  current: number;
}

export default function TradeRulerCard({ ticker, entry, stop, target, current }: TradeRulerProps) {
  // Cálculo da porcentagem da régua
  const range = target - stop;
  const progress = ((current - stop) / range) * 100;
  
  // Lógica de Alerta
  const isStopHit = current <= stop;
  const isTargetHit = current >= target;

  return (
    <div className={`p-5 rounded-2xl border transition-all duration-500 ${
      isStopHit ? 'bg-red-950/30 border-red-500 animate-pulse' : 
      isTargetHit ? 'bg-green-950/30 border-green-500' : 
      'bg-slate-900 border-slate-800'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-lg font-black text-white">{ticker}</h4>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Entrada: R$ {entry.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-white">R$ {current.toFixed(2)}</p>
          <p className={`text-[10px] font-bold ${current >= entry ? 'text-green-400' : 'text-red-400'}`}>
            {(((current / entry) - 1) * 100).toFixed(2)}%
          </p>
        </div>
      </div>

      {/* A RÉGUA VISUAL */}
      <div className="relative h-2 w-full bg-slate-800 rounded-full mb-6 mt-8">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 via-blue-500 to-green-500 opacity-20" />
        
        {/* Marcador do Preço Atual */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 size-4 bg-white rounded-full border-4 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10 transition-all duration-1000"
          style={{ left: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />

        {/* Labels de Stop e Alvo */}
        <div className="absolute -top-6 left-0 text-[9px] font-black text-red-500 uppercase">STOP: {stop.toFixed(2)}</div>
        <div className="absolute -top-6 right-0 text-[9px] font-black text-green-500 uppercase">ALVO: {target.toFixed(2)}</div>
      </div>

      {/* Mensagem de Ação */}
      <div className="min-h-[20px]">
        {isStopHit && (
          <div className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase">
            <AlertTriangle size={12} /> Sair da Operação - Stop Atingido
          </div>
        )}
        {isTargetHit && (
          <div className="flex items-center gap-2 text-green-500 text-[10px] font-black uppercase">
            <Target size={12} /> Realizar Lucro - Alvo Atingido
          </div>
        )}
      </div>
    </div>
  );
}