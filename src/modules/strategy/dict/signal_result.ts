import _ from 'lodash';
import { Order } from '../../../dict/order';

export class SignalResult {
   private _debug: { [key: string]: any } = {};
   private _signal: 'long' | 'short' | 'close' | undefined = undefined;
   private placeOrders: { side: string; amount_currency: number; price: number }[] = [];

   mergeDebug(debug: { [key: string]: any }): void {
      this._debug = _.merge(this._debug, debug);
   }

   setSignal(signal: 'long' | 'short' | 'close'): void {
      if (!['long', 'short', 'close'].includes(signal)) {
         throw new Error(`Invalid signal: ${signal}`);
      }

      this._signal = signal;
   }

   addDebug(key: string, value: any): void {
      if (typeof key !== 'string') {
         throw new Error('Invalid key');
      }

      this._debug[key] = value;
   }

   getDebug(): { [key: string]: any } {
      return this._debug;
   }

   getSignal(): 'long' | 'short' | 'close' | undefined {
      return this._signal;
   }

   placeBuyOrder(amountCurrency: number, price: number): void {
      this.placeOrders.push({ side: Order.SIDE_LONG, amount_currency: amountCurrency, price: price });
   }

   /**
    * @returns {[Order]}
    */
   getPlaceOrder(): { side: string; amount_currency: number; price: number }[] {
      return this.placeOrders;
   }

   static createSignal(signal: 'long' | 'short' | 'close', debug: { [key: string]: any } = {}): SignalResult {
      const result = new SignalResult();

      result.setSignal(signal);
      result.mergeDebug(debug);

      return result;
   }

   static createEmptySignal(debug: { [key: string]: any } = {}): SignalResult {
      const result = new SignalResult();

      result.mergeDebug(debug);

      return result;
   }
}
