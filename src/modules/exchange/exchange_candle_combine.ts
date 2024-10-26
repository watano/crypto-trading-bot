import { Candlestick } from '../../dict/candlestick';

export class ExchangeCandleCombine {
   private candlestickRepository: any;

   constructor(candlestickRepository: any) {
      this.candlestickRepository = candlestickRepository;
   }

   async fetchCombinedCandles(mainExchange: string, symbol: string, period: string, exchanges: any[] = [], olderThen?: number): Promise<any> {
      return this.combinedCandles(this.candlestickRepository.getLookbacksForPair(mainExchange, symbol, period, 750, olderThen), mainExchange, symbol, period, exchanges);
   }

   async fetchCombinedCandlesSince(mainExchange: string, symbol: string, period: string, exchanges: any[] = [], start: number = 0): Promise<any> {
      return this.combinedCandles(this.candlestickRepository.getLookbacksSince(mainExchange, symbol, period, start), mainExchange, symbol, period, exchanges);
   }

   async fetchCandlePeriods(mainExchange: string, symbol: string): Promise<string[]> {
      return this.candlestickRepository.getCandlePeriods(mainExchange, symbol);
   }

   async combinedCandles(candlesAwait: Promise<Candlestick[]>, mainExchange: string, symbol: string, period: string, exchanges: any[] = []): Promise<any> {
      const currentTime = Math.round(new Date().getTime() / 1000);

      // We filter the current candle, be to able to use it later
      const candles = (await candlesAwait).filter((c) => c.time <= currentTime);

      const result: any = {
         [mainExchange]: candles,
      };

      // No need for overhead
      if (exchanges.length === 0 || candles.length === 0) {
         return result;
      }

      const c: { [exchange: string]: { [time: number]: Candlestick } } = {
         [mainExchange]: {},
      };

      candles.forEach((candle) => {
         c[mainExchange][candle.time] = candle;
      });

      const start = candles[candles.length - 1].time;

      await Promise.all(
         exchanges.map(async (exchange: any) => {
            const candles: { [time: number]: Candlestick } = {};

            const databaseCandles = await this.candlestickRepository.getLookbacksSince(exchange.name, exchange.symbol, period, start);

            databaseCandles.forEach((c: any) => {
               candles[c.time] = c;
            });

            const myCandles: Candlestick[] = [];

            let timeMatchedOnce = false;
            for (const time of Object.keys(c[mainExchange])) {
               // Time was matched
               if (candles[Number.parseInt(time)]) {
                  myCandles.push(candles[Number.parseInt(time)]);
                  timeMatchedOnce = true;
                  continue;
               }

               // Pipe the close prices from last known candle
               const previousCandle = myCandles[myCandles.length - 1];

               const candle = previousCandle ? new Candlestick(Number.parseInt(time), previousCandle.close, previousCandle.close, previousCandle.close, previousCandle.close, 0) : new Candlestick(Number.parseInt(time), 0, 0, 0, 0, 0);

               myCandles.push(candle);
            }

            if (timeMatchedOnce) {
               result[exchange.name + exchange.symbol] = myCandles.reverse();
            }
         }),
      );

      return result;
   }
}
