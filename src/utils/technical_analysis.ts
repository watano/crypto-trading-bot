/* eslint-disable @typescript-eslint/no-explicit-any */

import { IndicatorBuilder } from '../modules/strategy/dict/indicator_builder';
import indicators from './indicators';

type Candle = { open: number; high: number; low: number; close: number; time?: number; volume?: number };

type MarketData = Record<string, number[]>;

type IndicatorDescriptor = { key: string; indicator: string | ((source: any, indicator: any) => Promise<Record<string, any>> | Record<string, any>); source?: string; options?: Record<string, any> };

/**
 * Bollinger Bands %B
 * https://www.tradingview.com/wiki/Bollinger_Bands_%25B_(%25B)
 */
export function getBollingerBandPercent(currentPrice: number, upper: number, lower: number): number {
   return (currentPrice - lower) / (upper - lower);
}

/**
 * Percent Trend Strength — 原代码存在未定义变量，保持接口但返回安全值
 */
export function getPercentTrendStrength(lookbackPrices: number[]): number | undefined {
   if (lookbackPrices.length < 9) {
      return undefined;
   }
   const slice = lookbackPrices.slice(-4);
   const b = slice[slice.length - 1] - slice[0];
   const angleDeg = (Math.atan2(3, b) * 180) / Math.PI;
   return angleDeg;
}

/**
 * 将 K 线数组转换为技术指标库所需的结构
 */
export function candles2MarketData(candles: Array<Record<string, number>>, length = 1000, keys: string[] = ['open', 'close', 'high', 'low', 'volume']): MarketData {
   const sliced = candles.slice(-length);
   return keys.reduce<MarketData>((acc, k) => {
      acc[k] = sliced.map(c => Number(c[k]));
      return acc;
   }, {});
}

/**
 * 获取一组预定义指标配置的计算结果
 */
export function getPredefinedIndicators(lookbacks: Candle[]): Promise<Record<string, any>> {
   return new Promise(resolve => {
      const builder = new IndicatorBuilder();
      builder.add('sma_200', 'sma', undefined, { length: 200 });
      builder.add('sma_50', 'sma', undefined, { length: 50 });
      builder.add('ema_55', 'ema', undefined, { length: 55 });
      builder.add('ema_200', 'ema', undefined, { length: 200 });
      builder.add('rsi', 'rsi', undefined, { length: 14 });
      builder.add('cci', 'cci', undefined, { length: 20 });
      builder.add('ao', 'ao');
      builder.add('macd', 'macd', undefined, { fast_length: 12, slow_length: 26, signal_length: 9 });
      builder.add('mfi', 'mfi', undefined, { length: 14 });
      builder.add('bollinger_bands', 'bb', undefined, { length: 20, stddev: 2 });
      builder.add('stoch_rsi', 'stoch_rsi', undefined, { rsi_length: 14, stoch_length: 14, k: 3, d: 3 });
      builder.add('wicked', 'wicked');

      const resultsPromise = createIndicatorsLookback(lookbacks, builder.all());
      resultsPromise.then(resolve);
   });
}

/**
 * 计算可用（已具备输入数据）的指标
 */
export function calculateReadyIndicators(indicatorList: IndicatorDescriptor[], results: Record<string, any>) {
   const sourceCandle: any = indicators.sourceCandle;

   return indicatorList.map(indicator => ({ ...indicator, source: indicator.source || (sourceCandle.includes(indicator.indicator) ? 'candles' : 'close') })).filter(({ key }) => !(key in results)).filter(({ source }) =>
      source in results.candles[0] || source in results
   ).map(indicator => {
      const { indicator: indicatorName, source } = indicator;
      const sourceData = source && source in results.candles[0] ? results.candles.map((v: any) => v[source]) : results[source as string];

      if (typeof indicatorName === 'function') {
         return (indicatorName as any)(sourceData, indicator);
      }
      const indicatorFn = (indicators as any)[indicatorName as string];
      if (typeof indicatorName === 'string' && typeof indicatorFn === 'function') {
         return indicatorFn(sourceData, indicator);
      }
      throw Error(`Call to undefined indicator: ${JSON.stringify(indicator)}`);
   });
}

/**
 * 根据指标配置批量计算，返回包含各指标的结构
 */
export async function createIndicatorsLookback(lookbacks: Candle[], indicatorList: IndicatorDescriptor[]): Promise<Record<string, any>> {
   if (lookbacks.length > 1 && lookbacks[0].time! > lookbacks[1].time!) {
      throw Error(`'Invalid candlestick order`);
   }

   let calculations: Record<string, any> = { candles: lookbacks.slice(-1000) };
   for (let depth = 0; depth < 5; depth += 1) {
      const values = await Promise.all(calculateReadyIndicators(indicatorList, calculations));
      calculations.indicators = calculations.indicators ?? {};
      Object.assign(calculations.indicators, ...values);
   }
   return calculations;
}

/**
 * 获取趋势方向（基于最近 4 个数值）
 */
export function getTrendingDirection(lookbacks: number[]): 'up' | 'down' {
   const currentValue = lookbacks.slice(-1)[0];

   return (lookbacks[lookbacks.length - 2] + lookbacks[lookbacks.length - 3] + lookbacks[lookbacks.length - 4]) / 3 > currentValue ? 'down' : 'up';
}

/**
 * 获取最近一次的趋势方向（比较最后两个）
 */
export function getTrendingDirectionLastItem(lookbacks: number[]): 'up' | 'down' {
   return lookbacks[lookbacks.length - 2] > lookbacks[lookbacks.length - 1] ? 'down' : 'up';
}

/**
 * 从最后一个值开始，寻找与零交叉发生的时间（索引）
 */
export function getCrossedSince(lookbacks: number[]): number | undefined {
   const values = lookbacks.slice().reverse();
   const currentValue = values[0];

   for (let i = 1; i < values.length - 1; i++) {
      if ((currentValue < 0 && values[i] > 0) || (currentValue >= 0 && values[i] < 0)) {
         return i;
      }
   }

   return undefined;
}

/**
 * 价格数组的高低点枢轴（不含烛心），返回高/低的值
 * https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/pivot-points-high-low
 */
export function getPivotPoints(prices: number[], left: number, right: number): Record<string, number> {
   if (left + right + 1 > prices.length || left <= 1 || right < 0) {
      return {};
   }

   const range = prices.slice(-(left + right + 1));
   const middleValue = range[left];

   const result: Record<string, number> = {};

   const leftRange = range.slice(0, left);
   const rightRange = range.slice(-right);

   if (typeof leftRange.find(c => c > middleValue) === 'undefined' && typeof rightRange.find(c => c > middleValue) === 'undefined') {
      result.high = middleValue;
   }

   if (typeof leftRange.find(c => c < middleValue) === 'undefined' && typeof rightRange.find(c => c < middleValue) === 'undefined') {
      result.low = middleValue;
   }

   return result;
}

/**
 * 带影线的枢轴点，返回包含 high/low 的 close/high/low 值
 * https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/pivot-points-high-low
 */
export function getPivotPointsWithWicks(candles: Array<{ close: number; high: number; low: number }>, left: number, right: number): Record<string, any> {
   if (left + right + 1 > candles.length || left <= 1 || right < 0) {
      return {};
   }

   const range = candles.slice(-(left + right + 1));

   const result: Record<string, any> = {};
   for (const source of ['close', 'high', 'low'] as const) {
      const middleValue = (range[left] as any)[source];

      const leftRange = range.slice(0, left);
      const rightRange = range.slice(-right);

      if (['close', 'high'].includes(source) && typeof leftRange.find(c => (c as any)[source] > middleValue) === 'undefined' && typeof rightRange.find(c => (c as any)[source] >= middleValue) === 'undefined') {
         if (!result.high) {
            result.high = {};
         }
         result.high[source] = middleValue;
      }

      if (['close', 'low'].includes(source) && typeof leftRange.find(c => (c as any)[source] < middleValue) === 'undefined' && typeof rightRange.find(c => (c as any)[source] <= middleValue) === 'undefined') {
         if (!result.low) {
            result.low = {};
         }
         result.low[source] = middleValue;
      }
   }

   return result;
}

export const TechnicalAnalysis = {
   getBollingerBandPercent,
   getPercentTrendStrength,
   candles2MarketData,
   getPredefinedIndicators,
   calculateReadyIndicators,
   createIndicatorsLookback,
   getTrendingDirection,
   getTrendingDirectionLastItem,
   getCrossedSince,
   getPivotPoints,
   getPivotPointsWithWicks,
};
