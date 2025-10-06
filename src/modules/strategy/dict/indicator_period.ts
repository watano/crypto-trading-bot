import { StrategyContext } from "~/src/dict/strategy_context";

export class IndicatorPeriod {
   private strategyContext: StrategyContext;
   private indicators: { [key: string]: any[] };

   constructor(strategyContext: StrategyContext, indicators: { [key: string]: any[] }) {
      this.strategyContext = strategyContext;
      this.indicators = indicators;
   }

   getPrice(): number {
      return this.strategyContext.bid;
   }

   getLastSignal(): string | undefined {
      if (!this.strategyContext || !this.strategyContext.getLastSignal) {
         return undefined;
      }

      return this.strategyContext.getLastSignal();
   }

   getProfit(): number {
      return this.strategyContext.getProfit() ?? 0;
   }

   isShort(): boolean {
      return this.getLastSignal() === 'short';
   }

   isLong(): boolean {
      return this.getLastSignal() === 'long';
   }

   /**
    * Context return for the current strategy, usable to get the previous strategy signals and current positions.
    *
    * Usable in a strategy by calling indicatorPeriod.getStrategyContext() --> then you can use the result to grab the
    * current entry, last signal, etc..
    */
   getStrategyContext(): StrategyContext {
      return this.strategyContext;
   }

   getIndicator(key: string): any | undefined {
      return this.indicators[key];
   }

   /**
    * Generate to iterate over item, starting with latest one going to oldest.
    * You should "break" the iteration until you found what you needed
    *
    * @param limit
    * @returns {IterableIterator<object>}
    */
   *visitLatestIndicators(limit = 200) {
      for (let i = 1; i < limit; i++) {
         const result: { [key: string]: any } = {};

         for (const key in this.indicators) {
            if (!this.indicators[key][this.indicators[key].length - i]) {
               continue;
            }

            result[key] = this.indicators[key][this.indicators[key].length - i];
         }

         yield result;
      }

      return undefined;
   }

   /**
    * Get all indicator values from current candle
    */
   getLatestIndicators(): any {
      const result: { [key: string]: any } = {};

      for (const key in this.indicators) {
         result[key] = this.indicators[key][this.indicators[key].length - 1];
      }

      return result;
   }

   /**
    * Get all indicator values from current candle
    */
   getLatestIndicator(key: string): any | undefined {
      return this.indicators[key]?.[this.indicators[key].length - 1];
   }
}
