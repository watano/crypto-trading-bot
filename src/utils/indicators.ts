import * as ts from 'trading-signals';

type NumericSeries = number[];
type Candle = { open: number | string; high: number | string; low: number | string; close: number | string; time?: number | string; volume?: number | string };

type IndicatorOptions = Record<string, any>;

type IndicatorDescriptor = { key: string; indicator: string; options?: IndicatorOptions };

type TulindExecOptions = {
   sources?: string[]; // candle field names, e.g., ['close', 'volume']
   options?: Record<string, any>; // tulind expects array of parameters in fixed order
   results?: string[]; // result keys mapping
};

type ZigZagPoint = { timePeriod: number; value: number; deviation: number; turningPoint: boolean };

function zigzag(ticks: Candle[], deviation = 5, arraySize = -1): ZigZagPoint[] {
   const turningPoints: { timePeriod: number; value: number; deviation: number }[] = [];
   let basePrice = -1;
   let lastDeviation = 0;
   deviation /= 100;

   const startingTick = arraySize === -1 ? 0 : Math.max(0, ticks.length - arraySize);

   for (let i = startingTick; i < ticks.length; ++i) {
      const close = Number.parseFloat(String(ticks[i].close));
      const high = Number.parseFloat(String(ticks[i].high));
      const low = Number.parseFloat(String(ticks[i].low));
      let positiveDeviation = basePrice > 0 ? high / basePrice - 1 : 0;
      let negativeDeviation = basePrice > 0 ? low / basePrice - 1 : 0;

      if (basePrice === -1) {
         basePrice = close;
         lastDeviation = 0;
         turningPoints.push({ timePeriod: i, value: close, deviation: lastDeviation });
         continue;
      }

      if (positiveDeviation >= deviation || (positiveDeviation > 0 && lastDeviation > 0)) {
         if (lastDeviation > 0) {
            positiveDeviation += lastDeviation;
            turningPoints.pop();
         }
         turningPoints.push({ timePeriod: i, value: high, deviation: positiveDeviation });
         lastDeviation = positiveDeviation;
         basePrice = high;
      } else if (negativeDeviation <= -deviation || (negativeDeviation < 0 && lastDeviation < 0)) {
         if (lastDeviation < 0) {
            negativeDeviation += lastDeviation;
            turningPoints.pop();
         }
         turningPoints.push({ timePeriod: i, value: low, deviation: negativeDeviation });
         lastDeviation = negativeDeviation;
         basePrice = low;
      } else if (i === ticks.length - 1) {
         if (positiveDeviation > 0) { turningPoints.push({ timePeriod: i, value: high, deviation: positiveDeviation }); }
         else { turningPoints.push({ timePeriod: i, value: low, deviation: negativeDeviation }); }
      }
   }

   const result: ZigZagPoint[] = [];
   for (let i = 0; i < turningPoints.length; ++i) {
      const tp = turningPoints[i];
      result.push({ timePeriod: tp.timePeriod, value: tp.value, deviation: Number.parseFloat((tp.deviation * 100).toFixed(2)), turningPoint: tp.deviation > deviation || tp.deviation < -deviation });

      if (tp.timePeriod >= ticks.length - 1) { continue; }

      const nextTP = turningPoints[i + 1];
      if (!nextTP) { continue; }
      for (let j = tp.timePeriod + 1; j < nextTP.timePeriod; ++j) {
         const distanceToTP = j - tp.timePeriod;
         const distanceTPs = nextTP.timePeriod - tp.timePeriod;
         const value = tp.value + ((nextTP.value - tp.value) / distanceTPs) * distanceToTP;
         const currentDeviation = value / tp.value;
         result.push({ timePeriod: j, value, deviation: Number.parseFloat((currentDeviation * 100).toFixed(2)), turningPoint: false });
      }
   }

   return result;
}

function executeTulindIndicator(source: NumericSeries | Candle[], indicator: IndicatorDescriptor, tulindOptions: TulindExecOptions): Promise<Record<string, any>> {
   return new Promise(resolve => {
      const indicatorName = indicator.indicator === 'bb' ? 'bbands' : indicator.indicator;
      let { sources, options = {} } = tulindOptions;

      const mappedSources: any[] = sources && sources.length > 0 ? sources.map(s => (source as Candle[]).map(ss => Number((ss as any)[s]))) : [source];

      const indicatorOptions = indicator.options || {};
      const execOptions: any[] = Object.keys(options).map(o => indicatorOptions[o] ?? options[o]);

      const prices: number[] = Array.isArray(source) ? (source as number[]) : [];
      const length = (indicatorOptions.length ?? tulindOptions.options?.length ?? 20) as number;
      const stddev = (indicatorOptions.stddev ?? tulindOptions.options?.stddev ?? 2) as number;
      let ta: any = {};
      // FIXME
      // bb, obv, ao, wma, dema, tema, trima, kama, roc, atr, mfi, sma, ema, rsi, hma, cci, vwma, stoch, macd, adx, stoch_rsi,
      if (indicatorName === 'bbands') {
         ta = new ts.BollingerBands(Number(length), Number(stddev));
      } else if (indicatorName === 'obv') {
         ta = new ts.OBV();
      } else if (indicatorName === 'ao') {
         ta = new ts.AO(Number(length), Number(stddev));
      } else if (indicatorName === 'wma') {
         ta = new ts.WMA(Number(length));
      } else if (indicatorName === 'dema') {
         ta = new ts.DEMA(Number(length));
         // } else if (indicatorName === 'tema') {
         //   ta = new ts.WMA(Number(length));
         // } else if (indicatorName === 'trima') {
         //   ta = new ts.WMA(Number(length));
         // } else if (indicatorName === 'kama') {
         //   ta = new ts.WMA(Number(length));
      } else if (indicatorName === 'roc') {
         ta = new ts.ROC(Number(length));
      } else if (indicatorName === 'atr') {
         ta = new ts.ATR(Number(length));
      } else if (indicatorName === 'mfi') {
         ta = new ts.WMA(Number(length));
      } else if (indicatorName === 'sma') {
         ta = new ts.SMA(Number(length));
      } else if (indicatorName === 'ema') {
         ta = new ts.EMA(Number(length));
      } else if (indicatorName === 'rsi') {
         ta = new ts.RSI(Number(length));
         // } else if (indicatorName === 'hma') {
         //   ta = new ts.HMA(Number(length));
      } else if (indicatorName === 'cci') {
         ta = new ts.CCI(Number(length));
         // } else if (indicatorName === 'vwma') {
         //   ta = new ts.WMA(Number(length));
      } else if (indicatorName === 'vwap') {
         ta = new ts.VWAP();
         // } else if (indicatorName === 'stoch') {
         //   ta = new ts.StochasticOscillator(Number(length), Number(stddev));
      } else if (indicatorName === 'macd') {
         ta = new ts.MACD(new ts.DEMA(Number(indicatorOptions.fast_length)), new ts.DEMA(Number(indicatorOptions.slow_length)), new ts.DEMA(Number(indicatorOptions.signal_length)));
      } else if (indicatorName === 'adx') {
         ta = new ts.ADX(Number(length));
      } else if (indicatorName === 'stoch_rsi') {
         ta = new ts.StochasticRSI(Number(length));
      } else {
         throw new Error(`Unsupported indicator ${indicatorName}`);
      }
      const bands = ta.updates(prices, false);

      const result = bands.filter((b: any): b is { lower: number; middle: number; upper: number } => b !== null).map((b: any) => {
         const record: any = { lower: b.lower, middle: b.middle, upper: b.upper };
         Object.assign(record, { width: (record.upper - record.lower) / record.middle });
         return record;
      });

      resolve({ [indicator.key]: result });
      return;
   });
}

const indicators = {
   sourceCandle: ['sma', 'ema', 'cci', 'pivot_points_high_low', 'obv', 'ao', 'mfi', 'stoch', 'vwma', 'atr', 'adx', 'volume_profile', 'volume_by_price', 'ichimoku_cloud', 'zigzag', 'wicked', 'heikin_ashi', 'psar', 'hma', 'candles'] as string[],

   bb: (source: Candle[], indicator: IndicatorDescriptor) => {
      const { options = {} } = indicator;

      return executeTulindIndicator(source, indicator, { options: { length: options.length || 20, stddev: options.stddev || 2 }, results: ['lower', 'middle', 'upper'] });
   },
   obv: (source: Candle[], indicator: IndicatorDescriptor) => executeTulindIndicator(source, indicator, { sources: ['close', 'volume'] }),
   ao: (source: Candle[], indicator: IndicatorDescriptor) => executeTulindIndicator(source, indicator, { sources: ['high', 'low'] }),
   wma: (source: NumericSeries, indicator: IndicatorDescriptor) => executeTulindIndicator(source, indicator, { options: { length: 9 } }),
   dema: (source: NumericSeries, indicator: IndicatorDescriptor) => executeTulindIndicator(source, indicator, { options: { length: 9 } }),
   tema: (source: NumericSeries, indicator: IndicatorDescriptor) => executeTulindIndicator(source, indicator, { options: { length: 9 } }),
   trima: (source: NumericSeries, indicator: IndicatorDescriptor) => executeTulindIndicator(source, indicator, { options: { length: 9 } }),
   kama: (source: NumericSeries, indicator: IndicatorDescriptor) => executeTulindIndicator(source, indicator, { options: { length: 9 } }),

   roc: (source: NumericSeries, indicator: IndicatorDescriptor) => executeTulindIndicator(source, indicator, { options: { length: indicator?.options?.length ?? 14 } }),

   atr: (source: Candle[], indicator: IndicatorDescriptor) => executeTulindIndicator(source, indicator, { sources: ['high', 'low', 'close'], options: { length: indicator?.options?.length ?? 14 } }),

   mfi: (source: Candle[], indicator: IndicatorDescriptor) => executeTulindIndicator(source, indicator, { sources: ['high', 'low', 'close', 'volume'], options: { length: indicator?.options?.length ?? 14 } }),

   sma: (source: NumericSeries, indicator: IndicatorDescriptor) => executeTulindIndicator(source, indicator, { options: { length: indicator?.options?.length ?? 14 } }),

   ema: (source: NumericSeries, indicator: IndicatorDescriptor) => executeTulindIndicator(source, indicator, { options: { length: indicator?.options?.length ?? 14 } }),

   rsi: (source: NumericSeries, indicator: IndicatorDescriptor) => executeTulindIndicator(source, indicator, { options: { length: indicator?.options?.length ?? 14 } }),

   hma: (source: Candle[], indicator: IndicatorDescriptor) => {
      const candleSource = (indicator.options && (indicator.options as any).source) || 'close';
      return executeTulindIndicator(source, indicator, { sources: [candleSource], options: { length: indicator?.options?.length ?? 9 } });
   },

   cci: (source: Candle[], indicator: IndicatorDescriptor) => executeTulindIndicator(source, indicator, { sources: ['high', 'low', 'close'], options: { length: indicator?.options?.length ?? 20 } }),

   vwma: (source: Candle[], indicator: IndicatorDescriptor) => executeTulindIndicator(source, indicator, { sources: ['close', 'volume'], options: { length: indicator?.options?.length ?? 20 } }),

   stoch: (source: Candle[], indicator: IndicatorDescriptor) => executeTulindIndicator(source, indicator, { sources: ['high', 'low', 'close'], options: { length: 14, k: 3, d: 3 }, results: ['stoch_k', 'stoch_d'] }),

   macd: (source: NumericSeries, indicator: IndicatorDescriptor) =>
      executeTulindIndicator(source, indicator, {
         results: ['macd', 'signal', 'histogram'],
         options: { fast_length: indicator?.options?.fast_length ?? 12, slow_length: indicator?.options?.slow_length ?? 26, signal_length: indicator?.options?.signal_length ?? 9 },
      }),

   adx: (source: Candle[], indicator: IndicatorDescriptor) => executeTulindIndicator(source, indicator, { sources: ['high', 'low', 'close'], options: { length: 14 } }),

   stoch_rsi: (source: NumericSeries, indicator: IndicatorDescriptor): Promise<Record<string, any>> => new Promise(resolve => {
         const { options = {} } = indicator as { options: any };
         const { rsi_length = 14, stoch_length = 14, k = 3, d = 3 } = options;

         const { StochasticRSI } = require('technicalindicators');
         const f = new StochasticRSI({ values: source, rsiPeriod: rsi_length, stochasticPeriod: stoch_length, kPeriod: k, dPeriod: d });

         const result: { stoch_k: number; stoch_d: number }[] = [];
         const results = f.getResult();

         for (let i = 0; i < results.length; i++) {
            result.push({ stoch_k: results[i].k, stoch_d: results[i].d });
         }

         resolve({ [indicator.key]: result });
      }),

   psar: (source: Candle[], indicator: IndicatorDescriptor): Promise<Record<string, any>> => new Promise(resolve => {
         const { options = {} } = indicator as { options: any };
         const { step = 0.02, max = 0.2 } = options;

         const input = { high: [] as number[], low: [] as number[], step, max };

         source.forEach(candle => {
            input.high.push(Number(candle.high));
            input.low.push(Number(candle.low));
         });

         const { PSAR } = require('technicalindicators');
         resolve({ [indicator.key]: new PSAR(input).getResult() });
      }),

   heikin_ashi: (source: Candle[], indicator: IndicatorDescriptor): Promise<Record<string, any>> => new Promise(resolve => {
         const { HeikinAshi } = require('technicalindicators');

         const input = { close: [] as number[], high: [] as number[], low: [] as number[], open: [] as number[], timestamp: [] as (number | string)[], volume: [] as (number | string)[] };

         source.forEach(candle => {
            input.close.push(Number(candle.close));
            input.high.push(Number(candle.high));
            input.low.push(Number(candle.low));
            input.open.push(Number(candle.open));
            input.timestamp.push(candle.time ?? 0);
            input.volume.push(candle.volume ?? 0);
         });

         const f = new HeikinAshi(input);
         const results = f.getResult();

         const candles: Candle[] = [];
         const length = (results.open || []).length;
         for (let i = 0; i < length; i++) {
            candles.push({ close: results.close[i], high: results.high[i], low: results.low[i], open: results.open[i], time: results.timestamp[i], volume: results.volume[i] });
         }

         resolve({ [indicator.key]: candles });
      }),

   volume_profile: (source: Candle[], indicator: IndicatorDescriptor): Promise<Record<string, any>> => new Promise(resolve => {
         const { options = {} } = indicator as { options: any };
         const { length = 200, ranges = 14 } = options;

         const { candles2MarketData } = require('./technical_analysis');
         const { VolumeProfile } = require('technicalindicators');
         const f = new VolumeProfile({ ...candles2MarketData(source, length), noOfBars: ranges });

         resolve({ [indicator.key]: f.getResult() });
      }),

   volume_by_price: (source: Candle[], indicator: IndicatorDescriptor): Promise<Record<string, any>> => new Promise(resolve => {
         const { options = {} } = indicator as { options: any };
         const { length = 200, ranges = 12 } = options;

         const lookbackRange = source.slice(-length);

         const minMax = lookbackRange.reduce<[number, number]>((accumulator, currentValue) => [Math.min(Number(currentValue.close), accumulator[0]), Math.max(Number(currentValue.close), accumulator[1])], [Number.MAX_VALUE, Number.MIN_VALUE]);

         const rangeSize = (minMax[1] - minMax[0]) / ranges;
         const rangeBlocks: { low: number; high: number; volume: number }[] = [];

         let current = minMax[0];
         for (let i = 0; i < ranges; i++) {
            const map = lookbackRange.filter(c => Number(c.close) >= current && Number(c.close) < current + rangeSize).map(c => Number(c.volume));

            rangeBlocks.push({ low: i === 0 ? current * 0.9999 : current, high: i === ranges - 1 ? minMax[1] * 1.0001 : current + rangeSize, volume: map.length > 0 ? map.reduce((x, y) => x + y, 0) : 0 });

            current += rangeSize;
         }

         resolve({ [indicator.key]: [rangeBlocks.reverse()] });
      }),

   zigzag: (source: Candle[], indicator: IndicatorDescriptor): Promise<Record<string, any>> => new Promise(resolve => {
         const { options = {} } = indicator as { options: any };
         const { length = 1000, deviation = 5 } = options;

         const result = zigzag(source.slice(-length), deviation);
         const turningPoints = result.map(r => (r && r.turningPoint === true ? r : {}));
         resolve({ [indicator.key]: turningPoints });
      }),

   ichimoku_cloud: (source: Candle[], indicator: IndicatorDescriptor): Promise<Record<string, any>> => new Promise(resolve => {
         const { options = {} } = indicator as { options: any };
         const { conversionPeriod = 9, basePeriod = 26, spanPeriod = 52, displacement = 26 } = options;

         const { candles2MarketData } = require('./technical_analysis');
         const { IchimokuCloud } = require('technicalindicators');
         const f = new IchimokuCloud({ ...candles2MarketData(source, undefined, ['high', 'low']), conversionPeriod, basePeriod, spanPeriod, displacement });

         resolve({ [indicator.key]: f.getResult() });
      }),

   pivot_points_high_low: (source: Candle[], indicator: IndicatorDescriptor): Promise<Record<string, any>> => {
      const { key, options = {} } = indicator as { key: string; options: any };
      const { left = 5, right = 5 } = options;
      return new Promise(resolve => {
         const result: any[] = [];

         for (let i = 0; i < source.length; i += 1) {
            const start = i - left - right;
            if (start < 0) {
               result.push({});
               continue;
            }
            const { getPivotPointsWithWicks } = require('./technical_analysis');
            result.push(getPivotPointsWithWicks(source.slice(start, i + 1), left, right));
         }
         resolve({ [key]: result });
      });
   },

   wicked: (source: Candle[], indicator: IndicatorDescriptor): Promise<Record<string, any>> => {
      const { key } = indicator;
      return new Promise(resolve => {
         const results: { top: number; body: number; bottom: number }[] = [];
         const { candles2MarketData } = require('./technical_analysis');
         const marketData = candles2MarketData(source, undefined, ['high', 'close', 'open', 'low']);
         for (let i = 0; i < marketData.close.length; i++) {
            const top = marketData.high[i] - Math.max(marketData.close[i], marketData.open[i]);
            const bottom = marketData.low[i] - Math.min(marketData.close[i], marketData.open[i]);

            results.push({
               top: Number(percent_calc(top, marketData.high[i] - marketData.low[i], 2)),
               body: Number(percent_calc(marketData.close[i] - marketData.open[i], marketData.high[i] - marketData.low[i], 2)),
               bottom: Number(percent_calc(bottom, marketData.high[i] - marketData.low[i], 2)),
            });
         }
         resolve({ [key]: results.reverse() });
      });
   },

   candles: async (source: Candle[], indicator: IndicatorDescriptor) => ({ [indicator.key]: source.slice() }),
};

const percent_calc = (value: any, total: any, decimal: any, sign = false): number | string | null => {
   const badNumbers = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
   // Don't divide by zero
   if (total === 0) {
      return 0;
   }
   // Avoid argument type problems
   if (typeof value !== 'number' || typeof total !== 'number' || typeof decimal !== 'number') {
      return null;
   }

   // Avoid wrong numbers
   badNumbers.forEach((number) => {
      if ([value, total, decimal].indexOf(number) > -1) {
         return number;
      }
   });

   // Calculate the value
   let val = ((value / total) * 100).toFixed(decimal);

   // Add the sign
   if (sign === true) {
      val += '%';
   }

   if (typeof sign === 'string') {
      val += sign;
   }

   return val;
};
export default indicators;
