import { ExchangeOrder } from './exchange_order';
import { Order } from './order';
import { OrderCapital } from './order_capital';

export class PairState {
   static STATE_LONG = 'long';
   static STATE_SHORT = 'short';
   static STATE_CLOSE = 'close';
   static STATE_CANCEL = 'cancel';

   time: Date;
   exchange: string;
   symbol: string;
   state: string;
   options: any;
   order: Order | undefined;
   exchangeOrder: ExchangeOrder | undefined;
   retries: number;
   adjustedPrice: boolean;
   clearCallback: () => void;
   cleared: boolean;
   capital?: OrderCapital;
   /**
    * @param exchange String
    * @param symbol String
    * @param capital {OrderCapital}
    * @param options
    * @param adjustedPrice bool
    * @param clearCallback
    * @returns {PairState}
    */
   static createLong(exchange: string, symbol: string, capital: OrderCapital, options: any, adjustedPrice: boolean, clearCallback: () => void): PairState {
      if (!(capital instanceof OrderCapital)) {
         throw new Error('TypeError: invalid OrderCapital');
      }

      const state = new PairState(exchange, symbol, PairState.STATE_LONG, options, adjustedPrice, clearCallback);
      state.capital = capital;
      return state;
   }

   /**
    * @param exchange String
    * @param symbol String
    * @param capital {OrderCapital}
    * @param options
    * @param adjustedPrice bool
    * @param clearCallback
    * @returns {PairState}
    */
   static createShort(exchange: string, symbol: string, capital: OrderCapital, options: any, adjustedPrice: boolean, clearCallback: () => void): PairState {
      if (!(capital instanceof OrderCapital)) {
         throw new Error('TypeError: invalid OrderCapital');
      }

      const state = new PairState(exchange, symbol, PairState.STATE_SHORT, options, adjustedPrice, clearCallback);
      state.capital = capital;
      return state;
   }

   constructor(exchange: string, symbol: string, state: string, options: any, adjustedPrice: boolean, clearCallback: () => void) {
      if (![PairState.STATE_LONG, PairState.STATE_SHORT, PairState.STATE_CLOSE, PairState.STATE_CANCEL].includes(state)) {
         throw new Error(`Invalid state: ${state}`);
      }

      if (typeof clearCallback !== 'function') {
         throw new Error('clearCallback not given');
      }

      this.time = new Date();
      this.exchange = exchange;
      this.symbol = symbol;
      this.state = state;
      this.options = options;
      this.order = undefined;
      this.exchangeOrder = undefined;
      this.retries = 0;
      this.adjustedPrice = adjustedPrice;
      this.clearCallback = clearCallback;
      this.cleared = false;
   }

   /**
    * @returns {string}
    */
   getExchange(): string {
      return this.exchange;
   }

   /**
    * @returns {boolean}
    */
   hasAdjustedPrice(): boolean {
      return this.adjustedPrice;
   }

   /**
    * @returns {string}
    */
   getSymbol(): string {
      return this.symbol;
   }

   /**
    * @returns {string}
    */
   getState(): string {
      return this.state;
   }

   clear(): void {
      this.cleared = true;
      this.clearCallback();
   }

   getOptions(): any {
      return this.options;
   }

   getTime(): Date {
      return this.time;
   }

   /**
    * @returns {boolean}
    */
   isCleared(): boolean {
      return this.cleared;
   }

   /**
    *
    * @returns {Order|undefined}
    */
   getOrder(): Order | undefined {
      return this.order;
   }

   getRetries(): number {
      return this.retries;
   }

   getCapital(): OrderCapital {
      if (this.capital) {
         return this.capital;
      }
      throw new Error('Capital not set');
   }

   triggerRetry(): void {
      this.retries += 1;
   }

   /**
    * @param order {Order|undefined}
    */
   setOrder(order: Order | undefined): void {
      if (order && !(order instanceof Order)) {
         throw new Error('TypeError: no Order');
      }

      this.order = order;
   }

   /**
    *
    * @returns {ExchangeOrder|undefined}
    */
   getExchangeOrder(): ExchangeOrder | undefined {
      return this.exchangeOrder;
   }

   /**
    * @param exchangeOrder {ExchangeOrder|undefined}
    */
   setExchangeOrder(exchangeOrder: ExchangeOrder | undefined): void {
      if (exchangeOrder && !(exchangeOrder instanceof ExchangeOrder)) {
         throw new Error('TypeError: no exchangeOrder');
      }

      this.exchangeOrder = exchangeOrder;
   }
}
