import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.BRAPI_TOKEN;
  
  if (!token) {
    console.error('❌ ERRO: BRAPI_TOKEN não encontrado no .env.local');
    return NextResponse.json({ error: 'Brapi token not configured' }, { status: 500 });
  }

  try {
    // 1. Fetch Ibovespa
    const ibovRes = await fetch(`https://brapi.dev/api/quote/^BVSP?token=${token}`, { next: { revalidate: 60 } });
    const ibovData = await ibovRes.json();
    const ibov = ibovData.results?.[0];

    if (!ibov) console.warn('⚠️ Ibovespa não retornado pela Brapi');

    // 2. Fetch Dólar (Mais resiliente e com conversão forçada para Número)
    let dollar = { bidPrice: 0, pctChange: 0, high: 0, low: 0 };
    try {
      const dollarRes = await fetch(`https://brapi.dev/api/v2/currency?currency=USD-BRL&token=${token}`, { next: { revalidate: 60 } });
      const dollarData = await dollarRes.json();
      
      if (dollarData.currency && dollarData.currency.length > 0) {
        const d = dollarData.currency[0];
        // Força a conversão para Float, pois a Brapi pode retornar String
        dollar = {
          bidPrice: parseFloat(d.bidPrice) || 0,
          pctChange: parseFloat(d.pctChange || d.variationPercentage) || 0,
          high: parseFloat(d.high || d.highPrice) || 0,
          low: parseFloat(d.low || d.lowPrice) || 0
        };
      }
    } catch (e) {
      console.error('⚠️ Falha ao buscar Dólar:', e);
    }

    // 3. Fetch SELIC
    let selic = { value: 10.75, nextCopom: '20 Mar 2024' };
    try {
      const selicRes = await fetch(`https://brapi.dev/api/v2/prime-rate?country=brazil&token=${token}`, { next: { revalidate: 3600 } });
      const selicData = await selicRes.json();
      if (selicData['prime-rate'] && selicData['prime-rate'].length > 0) {
        const latest = selicData['prime-rate'][selicData['prime-rate'].length - 1];
        selic = { value: parseFloat(latest.value) || 10.75, nextCopom: 'Maio 2024' };
      }
    } catch (e) {
      console.error('⚠️ Falha ao buscar SELIC:', e);
    }

    return NextResponse.json({
      ibov: {
        value: ibov?.regularMarketPrice || 0,
        change: ibov?.regularMarketChangePercent || 0,
        high: ibov?.regularMarketDayHigh || 0,
        low: ibov?.regularMarketDayLow || 0
      },
      dollar: {
        value: dollar.bidPrice,
        change: dollar.pctChange,
        high: dollar.high,
        low: dollar.low
      },
      selic
    });

  } catch (error: any) {
    console.error('❌ Erro Crítico na Rota /api/market:', error.message);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}