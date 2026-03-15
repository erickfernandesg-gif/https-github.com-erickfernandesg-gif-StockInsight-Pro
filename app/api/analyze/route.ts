import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  calculateSMA, 
  calculateEMA, 
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR
} from '@/lib/indicators';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { ticker } = await req.json();
    const brapiToken = process.env.BRAPI_TOKEN;

    if (!ticker) return NextResponse.json({ error: 'Ticker required' }, { status: 400 });
    if (!brapiToken) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

    // 1. Fetch Historical Data (3 meses)
    const formattedTicker = ticker.trim().toUpperCase();
    const cleanToken = brapiToken.trim();
    
    const url = new URL(`https://brapi.dev/api/quote/${formattedTicker}`);
    url.searchParams.append('range', '3mo'); 
    url.searchParams.append('interval', '1d');
    url.searchParams.append('token', cleanToken);
    
    const res = await fetch(url.toString());
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ Erro da Brapi [Status ${res.status}]:`, errorText);
      throw new Error(`Failed to fetch Brapi data: ${res.status}`);
    }
    
    const data = await res.json();
    const results = data.results[0];
    const historicalData = results?.historicalDataPrice || results?.historicalData;
    
    if (!historicalData || historicalData.length === 0) {
      throw new Error('No historical data found for this ticker');
    }

    // Mapeamento OHLCV
    const ohlcData = historicalData.map((d: any) => ({
      date: new Date(d.date * 1000).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }), // Converte Timestamp para Data Legível
      open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume
    }));
    const closes = ohlcData.map((d: any) => d.close);
    const volumes = ohlcData.map((d: any) => d.volume);
    
    // 2. Cálculos Institucionais
    const lastIdx = closes.length - 1;
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    const sma50 = calculateSMA(closes, 50);
    const rsi = calculateRSI(closes, 14);
    const macdData = calculateMACD(closes);
    const bbData = calculateBollingerBands(closes);
    const atrData = calculateATR(ohlcData, 14);
    const volSma20 = calculateSMA(volumes, 20);

    const indicators = {
      currentPrice: closes[lastIdx],
      ema9: ema9[lastIdx],
      ema21: ema21[lastIdx],
      sma50: sma50[lastIdx] || null, 
      rsi: rsi[lastIdx],
      macdHist: macdData.histogram[lastIdx] || 0,
      bbUpper: bbData.upper[lastIdx] || null,
      bbLower: bbData.lower[lastIdx] || null,
      atr: atrData[lastIdx] || 0,
      volToday: volumes[lastIdx] || 0,
      volAvg: volSma20[lastIdx] || 1 
    };

    const volRatio = (indicators.volToday / indicators.volAvg).toFixed(2);

    // 3. Preparação do Gráfico (Chart Data) para o Frontend
    // Vamos enviar os últimos 60 dias úteis
    const chartData = ohlcData.slice(-60).map((day: any, index: number) => {
      // Pega o índice real baseado no array original cortado
      const realIndex = (ohlcData.length - 60) + index;
      return {
        date: day.date,
        price: day.close,
        sma50: sma50[realIndex] ? Number(sma50[realIndex].toFixed(2)) : null
      };
    });

    // 4. Prompt Cérebro
    const prompt = `Analise o ativo ${formattedTicker} para Swing Trade.
    Dados Técnicos de Hoje:
    - Preço Atual: R$ ${indicators.currentPrice?.toFixed(2)}
    - SMA 50 (Tendência Primária): R$ ${indicators.sma50 ? indicators.sma50.toFixed(2) : 'N/A'}
    - EMA 9 / EMA 21: R$ ${indicators.ema9?.toFixed(2)} / R$ ${indicators.ema21?.toFixed(2)}
    - RSI (14): ${indicators.rsi?.toFixed(2)}
    - MACD Histograma: ${indicators.macdHist?.toFixed(4)}
    - Bandas de Bollinger (Upper/Lower): R$ ${indicators.bbUpper?.toFixed(2)} / R$ ${indicators.bbLower?.toFixed(2)}
    - ATR (14 dias): R$ ${indicators.atr?.toFixed(2)}
    - Força do Volume (Hoje vs Média 20d): ${volRatio}x`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `Você é um Robô Quantitativo Institucional de Swing Trade. Seu objetivo é máxima assertividade e proteção de capital. Responda APENAS com um JSON válido.
            REGRAS DE OURO (Siga rigorosamente):
            1. TENDÊNCIA E VOLUME: Só recomende "Compra" ou "Compra Forte" se o Preço Atual for MAIOR que a SMA 50 E o 'Força do Volume' for >= 0.8x.
            2. MOMENTUM (Gatilho): O MACD Histograma deve estar positivo (ou subindo). O RSI deve estar entre 40 e 70 (nunca compre acima de 70).
            3. LIMITES (Bollinger): REJEITE a compra (recomendação "Neutro" ou "Venda") se o Preço Atual estiver muito perto ou acima da Banda Superior (bbUpper).
            4. RISCO MILIMÉTRICO (ATR): O stop_loss DEVE ser posicionado em EXATAMENTE (Preço Atual - (2 * ATR)). Arredonde para 2 casas decimais.
            5. ALVO (Take Profit): Risco/Retorno mínimo de 2:1. O take_profit DEVE ser posicionado em (Preço Atual + (4 * ATR)).
            6. JUSTIFICATIVA: Escreva um parágrafo técnico, em Português (PT-BR), justificando a operação com base no cruzamento das médias, na força do MACD/Volume, e explicando onde o Stop foi posicionado com base no ATR.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendation: { type: Type.STRING, enum: ["Compra Forte", "Compra", "Neutro", "Venda"] },
            entry_price: { type: Type.NUMBER },
            stop_loss: { type: Type.NUMBER },
            take_profit: { type: Type.NUMBER },
            justification: { type: Type.STRING }
          },
          required: ["recommendation", "entry_price", "stop_loss", "take_profit", "justification"]
        }
      }
    });

    const responseText = result.text;
    
    if (!responseText) {
      throw new Error("Failed to generate analysis: AI response was empty.");
    }
    
    const startIndex = responseText.indexOf('{');
    const endIndex = responseText.lastIndexOf('}');
    
    if (startIndex === -1 || endIndex === -1) {
      throw new Error("Failed to parse AI response: No JSON object found in the text.");
    }
    
    const cleanJson = responseText.substring(startIndex, endIndex + 1);
    const analysis = JSON.parse(cleanJson);

    // NOVO: Retornando também o chartData
    return NextResponse.json({
      ticker: formattedTicker,
      chartData: chartData,
      indicators: {
        rsi: indicators.rsi,
        sma50: indicators.sma50,
        macd: indicators.macdHist,
        atr: indicators.atr
      },
      analysis
    });

  } catch (error: any) {
    console.error("Analyze Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}