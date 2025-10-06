import { describe, expect, it } from 'bun:test';
import { Candlestick } from '~/src/dict/candlestick';
import { ExchangeCandleCombine } from '~/src/modules/exchange/exchange_candle_combine';

describe('#exchange candle combine', () => {
   it('test that times are combined for exchanges', async () => {
      const calls: any[][] = [];

      const exchangeCandleCombine = new ExchangeCandleCombine({
         getLookbacksForPair: async () => {
            return createCandles();
         },
         getLookbacksSince: async (exchange: string, symbol: string, period: string, start: number) => {
            calls.push([exchange, symbol, period, start]);

            switch (exchange) {
               case 'binance':
                  return createCandles();
               case 'gap':
                  return createCandlesWithGap();
               default:
                  return [];
            }
         },
      });

      const result = await exchangeCandleCombine.fetchCombinedCandles('bitmex', 'XTBUSD', '15m', [{ name: 'binance', symbol: 'BTCUSD' }, { name: 'gap', symbol: 'FOOUSD' }, { name: 'foobar', symbol: 'FOOUSD' }]);

      expect(result.bitmex.length).toBe(22);
      expect(result['binanceBTCUSD'].length).toBe(22);

      expect(result.bitmex[0].open).toBe(2);
      expect(result['binanceBTCUSD'][0].open).toBe(2);

      expect(result.bitmex[0].close).toBe(2.1);
      expect(result['binanceBTCUSD'][0].close).toBe(2.1);

      expect(result.bitmex[0].time > result.bitmex[1].time).toBe(true);
      expect(result['binanceBTCUSD'][0].time > result['binanceBTCUSD'][1].time).toBe(true);
      expect(result['gapFOOUSD'][0].time > result['gapFOOUSD'][1].time).toBe(true);

      expect(result.bitmex[result.bitmex.length - 1].close).toBe(46.2);
      expect(result['binanceBTCUSD'][result['binanceBTCUSD'].length - 1].close).toBe(46.2);

      expect(result['gapFOOUSD'].length).toBe(22);
      expect(calls.filter((c) => c[3] === 1393473600).length).toBe(3);

      expect('foobar' in result['gapFOOUSD']).toBe(false);
   });

   it('test that only main exchange is given', async () => {
      const exchangeCandleCombine = new ExchangeCandleCombine({
         getLookbacksForPair: async () => {
            return createCandles();
         },
         getLookbacksSince: async () => {
            return createCandles();
         },
      });

      const result = await exchangeCandleCombine.fetchCombinedCandles('bitmex', 'XTBUSD', '15m');

      expect(result.bitmex.length).toBe(22);
      expect(result.bitmex[0].close).toBe(2.1);

      expect(result.bitmex[0].time > result.bitmex[1].time).toBe(true);

      expect(result.bitmex[result.bitmex.length - 1].close).toBe(46.2);
   });

   function createCandles(): Candlestick[] {
      const candles: Candlestick[] = [];

      // 2014-02-27T09:30:00.000Z
      const start = 1393493400;

      for (let i = 1; i < 23; i++) {
         candles.push(new Candlestick(start - 15 * i * 60, i * 2, i * 1.1, i * 0.9, i * 2.1, i * 100));
      }

      return candles;
   }

   function createCandlesWithGap(): Candlestick[] {
      const candles: Candlestick[] = [];

      // 2014-02-27T09:30:00.000Z
      const start = 1393493400;

      for (let i = 1; i < 23; i++) {
         if (i % 2) {
            continue;
         }

         candles.push(new Candlestick(start - 15 * i * 60, i * 2, i * 1.1, i * 0.9, i * 2.1, i * 100));
      }

      return candles;
   }
});
