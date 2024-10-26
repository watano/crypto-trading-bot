import { OrderCapital } from '../../dict/order_capital';
import { PairState } from '../../dict/pair_state';
import { SystemUtil } from '../system/system_util';
import { PairConfig } from './pair_config';
import { PairInterval } from './pair_interval';
import { PairStateExecution } from './pair_state_execution';

export class PairStateManager {
   private stats: { [key: string]: PairState };

   constructor(
      public logger: any,
      public pairConfig: PairConfig,
      public systemUtil: SystemUtil,
      public pairStateExecution: PairStateExecution,
      public orderExecutor: any,
      public pairInterval: PairInterval = new PairInterval(),
   ) {
      this.stats = {};
   }

   update(exchange: string, symbol: string, state: string, options: any = {}): void {
      if (!['long', 'close', 'short', 'cancel'].includes(state)) {
         this.logger.error(`Invalidate state: ${state}`);
         throw new Error(`Invalidate state: ${state}`);
      }

      const clearCallback = () => {
         this.logger.info(`State cleared: ${exchange} - ${symbol} - ${state}`);
         this.clear(exchange, symbol);
      };

      let pairState: PairState;
      if (state === 'long') {
         const capital = this.pairConfig.getSymbolCapital(exchange, symbol);
         if (!(capital instanceof OrderCapital)) {
            this.logger.error(`Invalidate OrderCapital: ${exchange} - ${symbol} - ${state}`);
            return;
         }

         pairState = PairState.createLong(exchange, symbol, capital, options || {}, true, clearCallback);
      } else if (state === 'short') {
         const capital = this.pairConfig.getSymbolCapital(exchange, symbol);
         if (!(capital instanceof OrderCapital)) {
            this.logger.error(`Invalidate OrderCapital: ${exchange} - ${symbol} - ${state}`);
            return;
         }

         pairState = PairState.createShort(exchange, symbol, capital, options || {}, true, clearCallback);
      } else {
         pairState = new PairState(exchange, symbol, state, options || {}, true, clearCallback);
      }

      const stateKey = exchange + symbol;
      this.logger.info(
         `Pair state changed: ${JSON.stringify({
            new: JSON.stringify(pairState),
            old: JSON.stringify(this.stats[stateKey] || {}),
         })}`,
      );

      this.stats[stateKey] = pairState;

      this.pairInterval.addInterval(
         stateKey, //
         this.systemUtil.getConfig('tick.ordering', 10800),
         async () => {
            // prevent race conditions
            if (!pairState.isCleared() && stateKey in this.stats) {
               await this.pairStateExecution.onPairStateExecutionTick(pairState);
            }

            // state: can be cleared only onPairStateExecutionTick
            if (!pairState.isCleared() && pairState.hasAdjustedPrice() && stateKey in this.stats) {
               await this.orderExecutor.adjustOpenOrdersPrice(pairState);
            }
         },
      );
   }

   /**
    *
    * @param exchange
    * @param symbol
    * @returns {undefined|PairState}
    */
   get(exchange: string, symbol: string): PairState | undefined {
      const stateKey = exchange + symbol;
      if (stateKey in this.stats) {
         return this.stats[stateKey];
      }

      return undefined;
   }

   all(): PairState[] {
      const stats: PairState[] = [];

      for (const key in this.stats) {
         stats.push(this.stats[key]);
      }

      return stats;
   }

   clear(exchange: string, symbol: string): void {
      const stateKey = exchange + symbol;
      if (stateKey in this.stats) {
         this.logger.debug(`Pair state cleared: ${JSON.stringify(this.stats[stateKey])}`);
         delete this.stats[stateKey];
      }

      this.pairInterval.clearInterval(stateKey);
   }

   getSellingPairs(): PairState[] {
      const pairs: PairState[] = [];

      for (const key in this.stats) {
         if (this.stats[key].state === 'short') {
            pairs.push(this.stats[key]);
         }
      }

      return pairs;
   }

   getBuyingPairs(): PairState[] {
      const pairs: PairState[] = [];

      for (const key in this.stats) {
         if (this.stats[key].state === 'long') {
            pairs.push(this.stats[key]);
         }
      }

      return pairs;
   }

   getClosingPairs(): PairState[] {
      const pairs: PairState[] = [];

      for (const key in this.stats) {
         if (this.stats[key].state === 'close') {
            pairs.push(this.stats[key]);
         }
      }

      return pairs;
   }

   getCancelPairs(): PairState[] {
      const pairs: PairState[] = [];

      for (const key in this.stats) {
         if (this.stats[key].state === 'cancel') {
            pairs.push(this.stats[key]);
         }
      }

      return pairs;
   }

   isNeutral(exchange: string, symbol: string): boolean {
      return !(exchange + symbol in this.stats);
   }

   async onTerminate(): Promise<void> {
      const running = this.all();

      for (const key in running) {
         const pair = running[key];

         this.logger.info(`Terminate: Force managed orders cancel: ${JSON.stringify(pair)}`);
         console.log(`Terminate: Force managed orders cancel: ${JSON.stringify(pair)}`);

         await this.pairStateExecution.onCancelPair(pair);
      }
   }
}
