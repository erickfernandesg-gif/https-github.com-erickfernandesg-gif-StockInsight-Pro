import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  calculateEMA, 
  calculateSMA, 
  calculateRSI, 
  calculateMACD, 
  calculateBollingerBands,
  type OHLC 
} from '@/lib/indicators';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });

export async function POST(req: Request) {
  try {
    const { ticker } = await req.json();

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    // 1. Fetch historical data (Simulated or Real Brapi)
    let historicalData: OHLC[] = [];
    const brapiToken = process.env.BRAPI_TOKEN;

    if (brapiToken) {
      try {
        const res = await fetch(`https://brapi.dev/api/quote/${ticker}?range=2mo&interval=1d&token=${brapiToken}`);
        const data = await res.json();
        const results = data.results[0];
        historicalData = results.historicalData.map((d: any) => ({
          date: d.date,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume
        }));
      } catch (e) {
        console.error('Brapi fetch failed, falling back to simulation', e);
        historicalData = generateSimulatedData(60);
      }
    } else {
      historicalData = generateSimulatedData(60);
    }

    const closes = historicalData.map(d => d.close);

    // 2. Calculate Indicators
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    const sma200 = calculateSMA(closes, 200); // Note: 60 days won't give 200 SMA, but we'll use what we have
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const bb = calculateBollingerBands(closes, 20, 2);

    const lastIdx = closes.length - 1;
    const indicators = {
      ticker,
      currentPrice: closes[lastIdx],
      ema9: ema9[lastIdx],
      ema21: ema21[lastIdx],
      sma200: sma200[lastIdx] || 'N/A (Need more data)',
      rsi: rsi[lastIdx],
      macd: {
        line: macd.macd[lastIdx],
        signal: macd.signal[lastIdx],
        histogram: macd.histogram[lastIdx]
      },
      bollinger: {
        upper: bb.upper[lastIdx],
        middle: bb.middle[lastIdx],
        lower: bb.lower[lastIdx]
      }
    };

    // 3. Gemini Analysis
    const prompt = `Analise os seguintes indicadores técnicos para o ativo ${ticker}:
    Preço Atual: ${indicators.currentPrice}
    EMA 9: ${indicators.ema9}
    EMA 21: ${indicators.ema21}
    SMA 200: ${indicators.sma200}
    RSI (14): ${indicators.rsi}
    MACD: Line ${indicators.macd.line}, Signal ${indicators.macd.signal}, Histogram ${indicators.macd.histogram}
    Bandas de Bollinger: Superior ${indicators.bollinger.upper}, Média ${indicators.bollinger.middle}, Inferior ${indicators.bollinger.lower}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: "Você é um analista CNPI de Swing Trade. Analise os indicadores técnicos fornecidos. Se o preço estiver acima da SMA 200 e a EMA 9 cruzar a EMA 21 para cima, busque compra. Considere RSI < 30 como exaustão de venda. Retorne um JSON com: decisão (Compra/Venda/Neutro), Preço de Entrada, Stop Loss (baseado em suporte), Take Profit (alvo 2:1) e uma justificativa técnica curta.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            decisao: { type: Type.STRING },
            precoEntrada: { type: Type.NUMBER },
            stopLoss: { type: Type.NUMBER },
            takeProfit: { type: Type.NUMBER },
            justificativa: { type: Type.STRING }
          },
          required: ["decisao", "precoEntrada", "stopLoss", "takeProfit", "justificativa"]
        }
      }
    });

    const analysis = JSON.parse(response.text || '{}');

    return NextResponse.json({
      ticker,
      indicators,
      analysis
    });

  } catch (error: any) {
    console.error('Analysis API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function generateSimulatedData(days: number): OHLC[] {
  const data: OHLC[] = [];
  let price = 30 + Math.random() * 20;
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (days - i));
    
    const change = (Math.random() - 0.5) * 2;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random();
    const low = Math.min(open, close) - Math.random();
    
    data.push({
      date: date.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume: 1000000 + Math.random() * 5000000
    });
    
    price = close;
  }
  return data;
}
