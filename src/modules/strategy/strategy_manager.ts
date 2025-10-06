import _ from 'lodash';
import { Position } from '../../dict/position';
import { StrategyContext } from '../../dict/strategy_context';
import { Ticker } from '../../dict/ticker';
import * as CommonUtil from '../../utils/common_util';
import * as Resample from '../../utils/resample';
import * as ta from '../../utils/technical_analysis';
import { IndicatorBuilder } from './dict/indicator_builder';
import { IndicatorPeriod } from './dict/indicator_period';
import { SignalResult } from './dict/signal_result';
import { CCI } from './strategies/cci';
import { Macd } from './strategies/macd';


export class StrategyManager {
   public strategies: any[] = [new CCI(), new Macd()];
   constructor(public technicalAnalysisValidator: any, public exchangeCandleCombine: any, public logger?: any, public projectDir?: string) {
   }

   getStrategies() {
      return this.strategies;
   }

   findStrategy(strategyName: string) {
      return this.getStrategies().find((strategy: any) => strategy.getName() === strategyName);
   }

   async executeStrategy(strategyName: string, context: StrategyContext, exchange: any, symbol: string, options: any = {}) {
      const results: any = await this.getTaResult(strategyName, exchange, symbol, options, true);
      if (!results || Object.keys(results).length === 0) {
         return undefined;
      }
      // remove candle pipe
      results._candle = undefined;
      const indicatorPeriod = new IndicatorPeriod(context, results.indicators);

      const strategy = this.findStrategy(strategyName);
      const strategyResult = await strategy.period(indicatorPeriod, options);
      if (typeof strategyResult !== 'undefined' && !(strategyResult instanceof SignalResult)) {
         throw new Error(`Invalid strategy return:${strategyName}`);
      }

      return strategyResult;
   }

   async executeStrategyBacktest(strategyName: string, exchange: any, symbol: string, options: any, lastSignal: string, lastSignalEntry: number) {
      const results: any = await this.getTaResult(strategyName, exchange, symbol, options);
      if (!results || Object.keys(results).length === 0) {
         return {};
      }

      const price = results._candle ? results._candle.close : undefined;

      let context: any;
      if (lastSignal && lastSignalEntry && price) {
         // provide a suitable value; its just backtesting
         const amount: number = lastSignal === 'short' ? -1 : 1;

         context = StrategyContext.createFromPosition(
            options, //
            new Ticker(exchange, symbol, 0, price, price),
            new Position(
               symbol, //
               lastSignal,
               amount,
               CommonUtil.getProfitAsPercent(lastSignal, price, lastSignalEntry) as number,
               new Date(),
               lastSignalEntry,
            ),
            true,
         );
      } else {
         context = StrategyContext.create(
            options, //
            new Ticker(exchange, symbol, 0, price, price),
            true,
         );
      }

      context.lastSignal = lastSignal;
      const indicatorPeriod = new IndicatorPeriod(context, results.indicators);

      const strategy = this.getStrategies().find((strategy) => strategy.getName() === strategyName);
      const strategyResult = await strategy.period(indicatorPeriod, options);

      if (typeof strategyResult !== 'undefined' && !(strategyResult instanceof SignalResult)) {
         throw `Invalid strategy return:${strategyName}`;
      }

      const result: any = { price: price, columns: this.getCustomTableColumnsForRow(strategyName, strategyResult ? strategyResult.getDebug() : {}) };

      if (strategyResult) {
         result.result = strategyResult;
      }

      return result;
   }

   async getTaResult(strategyName: string, exchange: any, symbol: string, options: any, validateLookbacks = false) {
      options = options || {};
      const strategy = this.getStrategies().find((strategy) => {
         return strategy.getName() === strategyName;
      });

      if (!strategy) {
         throw `invalid strategy: ${strategy}`;
      }

      const indicatorBuilder = new IndicatorBuilder();
      strategy.buildIndicator(indicatorBuilder, options);

      const periodGroups: any = {};
      indicatorBuilder.all().forEach((indicator) => {
         if (!periodGroups[indicator.period]) {
            periodGroups[indicator.period] = [];
         }

         periodGroups[indicator.period].push(indicator);
      });

      const results: any = {};
      for (const period in periodGroups) {
         const periodGroup = periodGroups[period];

         const foreignExchanges = [
            ...new Set(
               periodGroup.filter((group: any) => group.options.exchange && group.options.symbol).map((group: any) => {
                  return `${group.options.exchange}#${group.options.symbol}`;
               }),
            ),
         ].map((exchange: any) => {
            const e = exchange.split('#');

            return { name: e[0], symbol: e[1] };
         });

         // filter candles in the futures: eg current non closed candle
         const periodAsMinute = Resample.convertPeriodToMinute(period) * 60;
         const unixtime = Math.floor(Date.now() / 1000);
         const olderThenCurrentPeriod = unixtime - (unixtime % periodAsMinute) - periodAsMinute * 0.1;

         const lookbacks = await this.exchangeCandleCombine.fetchCombinedCandles(exchange, symbol, period, foreignExchanges, olderThenCurrentPeriod);

         if (lookbacks[exchange].length > 0) {
            // check if candle to close time is outside our allow time window
            if (validateLookbacks && !this.technicalAnalysisValidator.isValidCandleStickLookback(lookbacks[exchange].slice(), period)) {
               this.logger.info(`Strategy skipped: outdated candle sticks: ${JSON.stringify([period, strategyName, exchange, symbol])}`);

               // stop current run
               return {};
            }

            const indicators = periodGroup.filter((group: any) => !group.options.exchange && !group.options.symbol);
            const result: any = await ta.createIndicatorsLookback(lookbacks[exchange].slice().reverse(), indicators);

            // array merge
            for (const x in result) {
               results[x] = result[x];
            }

            results._candle = lookbacks[exchange][0];
         }

         for (const foreignExchange of foreignExchanges) {
            if (!lookbacks[foreignExchange.name + foreignExchange.symbol] || lookbacks[foreignExchange.name + foreignExchange.symbol].length === 0) {
               continue;
            }

            const indicators = periodGroup.filter((group: any) => group.options.exchange === foreignExchange.name);
            if (indicators.length === 0) {
               continue;
            }
            const result = await ta.createIndicatorsLookback(lookbacks[foreignExchange.name + foreignExchange.symbol].slice().reverse(), indicators);

            // array merge
            for (const x in result) {
               results[x] = result[x];
            }
         }
      }
      return results;
   }

   getCustomTableColumnsForRow(strategyName: string, row: any) {
      return this.getBacktestColumns(strategyName).map((cfg: any) => {
         // direct value of array or callback
         const value = typeof cfg.value === 'function' ? cfg.value(row) : _.get(row, cfg.value);

         let valueOutput = value;

         if (typeof value !== 'undefined') {
            switch (typeof value) {
               case 'object':
                  valueOutput = Object.keys(value).length === 0 ? '' : JSON.stringify(value);

                  break;
               case 'string':
                  valueOutput = value;

                  break;
               default:
                  valueOutput = new Intl.NumberFormat('en-US', { minimumSignificantDigits: 3, maximumSignificantDigits: 4 }).format(value);
                  break;
            }
         }

         const result: any = { value: valueOutput, type: cfg.type || 'default' };

         switch (cfg.type || 'default') {
            case 'cross':
               result.state = value > _.get(row, cfg.cross) ? 'over' : 'below';
               break;
            case 'histogram':
               result.state = value > 0 ? 'over' : 'below';
               break;
            case 'oscillator':
               if (value > (cfg.range && cfg.range.length > 0 ? cfg.range[0] : 80)) {
                  result.state = 'over';
               } else if (value < (cfg.range && cfg.range.length > 1 ? cfg.range[1] : 20)) {
                  result.state = 'below';
               }
               break;
         }

         return result;
      });
   }

   getStrategyNames() {
      return this.getStrategies().map((strategy) => strategy.getName());
   }

   getBacktestColumns(strategyName: string) {
      const strategy = this.getStrategies().find((strategy) => {
         return strategy.getName() === strategyName;
      });

      if (!strategy) {
         return [];
      }

      return typeof strategy.getBacktestColumns !== 'undefined' ? strategy.getBacktestColumns() : [];
   }
}
