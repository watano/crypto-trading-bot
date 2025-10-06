import { Candlestick } from '../dict/candlestick';

/**
 * Resample eg 5m candle sticks into 15m or other minutes
 *
 * @param lookbackNewestFirst
 * @param minutes
 * @returns {Array}
 */
export const resampleMinutes = (lookbackNewestFirst: Candlestick[], minutes: number): {
   time: number; //
   open: number;
   high: number;
   low: number;
   close: number;
   volume: number;
   _time: Date;
   _candle_count: number;
   _candles: { time: number; open: number; high: number; low: number; close: number; volume: number }[];
}[] => {
   if (lookbackNewestFirst.length === 0) {
      return [];
   }

   if (lookbackNewestFirst.length > 1 && lookbackNewestFirst[0].time < lookbackNewestFirst[1].time) {
      throw new Error('Invalid candle stick order');
   }

   // group candles by its higher resample time
   const resampleCandleGroup: { [key: number]: Candlestick[] } = {};

   const secs = minutes * 60;
   lookbackNewestFirst.forEach((candle: Candlestick) => {
      const mod = candle.time % secs;

      const resampleCandleClose = mod === 0
         ? candle.time // we directly catch the window: eg full hour matched
         : candle.time - mod + secs; // we calculate the next full window in future where es candle is closing

      // store the candle inside the main candle close
      if (!resampleCandleGroup[resampleCandleClose]) {
         resampleCandleGroup[resampleCandleClose] = [];
      }

      resampleCandleGroup[resampleCandleClose].push(candle);
   });

   const merge: { time: number; open: number; high: number; low: number; close: number; volume: number; _time: Date; _candle_count: number; _candles: { time: number; open: number; high: number; low: number; close: number; volume: number }[] }[] = [];

   for (const candleCloseTime in resampleCandleGroup) {
      const candles = resampleCandleGroup[candleCloseTime];

      const x: any = { open: [], high: [], low: [], close: [], volume: [] };

      candles.forEach((candle: Candlestick) => {
         x.open.push(candle.open);
         x.high.push(candle.high);
         x.low.push(candle.low);
         x.close.push(candle.close);
         x.volume.push(candle.volume);
      });

      const sortHighToLow = candles.slice().sort((a, b) => b.time - a.time);

      merge.push({
         time: Number.parseInt(candleCloseTime),
         open: sortHighToLow[sortHighToLow.length - 1].open,
         high: Math.max(...x.high),
         low: Math.min(...x.low),
         close: sortHighToLow[0].close,
         volume: x.volume.reduce((sum: number, a: number) => sum + Number(a), 0),
         _time: new Date(Number.parseInt(candleCloseTime) * 1000),
         _candle_count: candles.length,
         _candles: sortHighToLow,
      });
   }

   // sort items and remove oldest item which can be incomplete
   return merge.sort((a, b) => b.time - a.time).splice(0, merge.length - 1);
};

/**
 * Resample eg 5m candle sticks into 15m or other minutes
 *
 * @returns number
 * @param period
 */
export const convertPeriodToMinute = (period: string): number => {
   const unit = period.slice(-1).toLowerCase();

   switch (unit) {
      case 'm':
         return Number.parseInt(period.substring(0, period.length - 1));
      case 'h':
         return Number.parseInt(period.substring(0, period.length - 1)) * 60;
      case 'd':
         return Number.parseInt(period.substring(0, period.length - 1)) * 60 * 24;
      case 'w':
         return Number.parseInt(period.substring(0, period.length - 1)) * 60 * 24 * 7;
      case 'y':
         return Number.parseInt(period.substring(0, period.length - 1)) * 60 * 24 * 7 * 365;
      default:
         throw new Error(`Unsupported period unit: ${period}`);
   }
};

export const convertMinuteToPeriod = (period: number): string => {
   if (period < 60) {
      return `${period}m`;
   }

   if (period >= 60) {
      return `${period / 60}h`;
   }

   throw new Error(`Unsupported period: ${period}`);
};
