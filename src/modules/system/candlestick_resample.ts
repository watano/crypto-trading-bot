import { ExchangeCandlestick } from '../../dict/exchange_candlestick';
import { convertPeriodToMinute, resampleMinutes } from '../../utils/resample';

export class CandlestickResample {
   private candlestickRepository: any;
   private candleImporter: any;

   constructor(candlestickRepository: any, candleImporter: any) {
      this.candlestickRepository = candlestickRepository;
      this.candleImporter = candleImporter;
   }

   /**
    * Resample a e.g., "15m" range to a "1h"
    *
    * @param exchange The exchange name to resample
    * @param symbol Pair for resample
    * @param periodFrom From "5m" must be lower than "periodTo"
    * @param periodTo To new candles e.g., "1h"
    * @param limitCandles For mass resample history provide a switch else calculate the candle window on resample periods
    * @returns {Promise<void>}
    */
   async resample(exchange: string, symbol: string, periodFrom: string, periodTo: string, limitCandles: boolean = false): Promise<void> {
      const toMinute = convertPeriodToMinute(periodTo);
      const fromMinute = convertPeriodToMinute(periodFrom);

      if (fromMinute > toMinute) {
         throw new Error('Invalid resample "from" must be greater than "to"');
      }

      // we need some
      let wantCandlesticks = 750;

      // we can limit the candles in the range we should resample
      // but for mass resample history provide a switch
      if (limitCandles === true) {
         wantCandlesticks = Math.round((toMinute / fromMinute) * 5.6);
      }

      const candlestick = await this.candlestickRepository.getLookbacksForPair(exchange, symbol, periodFrom, wantCandlesticks);

      if (candlestick.length === 0) {
         return;
      }

      const resampleCandlesticks = resampleMinutes(candlestick, toMinute);

      const candles = resampleCandlesticks.map((candle: any) => {
         return new ExchangeCandlestick(exchange, symbol, periodTo, candle.time, candle.open, candle.high, candle.low, candle.close, candle.volume);
      });

      await this.candleImporter.insertThrottledCandles(candles);
   }
}
