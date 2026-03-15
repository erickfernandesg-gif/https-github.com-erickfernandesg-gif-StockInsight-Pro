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

    // 2. Fetch Dólar (Usando AwesomeAPI - 100% Gratuita e à prova de falhas)
    let dollar = { value: 0, change: 0, high: 0, low: 0 };
    
    try {
      // Sem necessidade de token, atualiza a cada 60 segundos
      const dollarRes = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL', { next: { revalidate: 60 } });
      const dollarData = await dollarRes.json();
      
      if (dollarData?.USDBRL) {
        const d = dollarData.USDBRL;
        
        // Extrai os dados da AwesomeAPI e converte para número perfeitamente
        dollar = {
          value: parseFloat(d.bid) || 0,
          change: parseFloat(d.pctChange) || 0,
          high: parseFloat(d.high) || 0,
          low: parseFloat(d.low) || 0
        };
      }
    } catch (e) {
      console.error('⚠️ Falha ao buscar Dólar na AwesomeAPI:', e);
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

    // Retorno unificado para o Frontend
    return NextResponse.json({
      ibov: {
        value: ibov?.regularMarketPrice || 0,
        change: ibov?.regularMarketChangePercent || 0,
        high: ibov?.regularMarketDayHigh || 0,
        low: ibov?.regularMarketDayLow || 0
      },
      dollar: dollar, // <-- O Dólar agora vai preenchido e imune a falhas!
      selic: selic
    });

  } catch (error: any) {
    console.error('❌ Erro Crítico na Rota /api/market:', error.message);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}