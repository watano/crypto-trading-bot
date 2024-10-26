import ccxt from 'ccxt';
import _ from 'lodash';
import { ExchangeOrder } from '../../dict/exchange_order';
import { Order } from '../../dict/order';
import { CcxtUtil } from '../utils/ccxt_util';
import { OrderBag } from '../utils/order_bag';

export class CcxtExchangeOrder {
   private orderbag: OrderBag;
   private symbols: string[];
   private logger: any;
   private ccxtClient: any;
   private callbacks: any;

   constructor(ccxtClient: any, symbols: string[], logger: any, callbacks: any) {
      this.orderbag = new OrderBag();
      this.symbols = symbols;
      this.logger = logger;
      this.ccxtClient = ccxtClient;
      this.callbacks = callbacks;
   }

   async createOrder(order: Order): Promise<ExchangeOrder | undefined> {
      const side = order.isShort() ? 'sell' : 'buy';

      let parameters: any = {};

      if (this.callbacks && 'createOrder' in this.callbacks) {
         const custom = this.callbacks.createOrder(order);

         if (custom) {
            parameters = _.merge(parameters, custom);
         }
      }

      let promise: Promise<any>;
      switch (order.getType()) {
         case Order.TYPE_STOP:
         case Order.TYPE_LIMIT:
            promise = this.ccxtClient.createOrder(order.getSymbol(), order.getType(), side, order.getAmount(), order.getPrice(), parameters.args || undefined);
            break;
         case Order.TYPE_MARKET:
            promise = this.ccxtClient.createOrder(order.getSymbol(), order.getType(), side, order.getAmount());
            break;
         default:
            throw `Ccxt order converter unsupported order type:${order.getType()}`;
      }

      let placedOrder: any;
      try {
         placedOrder = await promise;
      } catch (e) {
         if (e instanceof ccxt.NetworkError) {
            return undefined;
         }

         throw e;
      }

      const exchangeOrder = this.convertOrder(placedOrder);
      this.triggerOrder(exchangeOrder);
      return exchangeOrder;
   }

   async syncOrders(): Promise<ExchangeOrder[] | undefined> {
      let orders: any[];
      try {
         orders = await this.ccxtClient.fetchOpenOrders();
      } catch (e) {
         this.logger.error(`SyncOrder timeout: ${String(e)}`);
         return undefined;
      }

      if (this.callbacks && 'convertOrder' in this.callbacks) {
         orders.forEach((o: any) => {
            this.callbacks.convertOrder(this.ccxtClient, o);
         });
      }

      const result = CcxtUtil.createExchangeOrders(orders);

      if (this.callbacks && 'syncOrders' in this.callbacks) {
         let custom: any;
         try {
            custom = await this.callbacks.syncOrders(this.ccxtClient);
         } catch (e) {
            this.logger.error(`SyncOrder callback error: ${String(e)}`);
            return undefined;
         }

         if (custom) {
            result.push(...custom);
         }
      }

      this.orderbag.set(result);
      return result;
   }

   triggerOrder(order: ExchangeOrder): void {
      this.orderbag.triggerOrder(order);
   }

   async getOrders(): Promise<ExchangeOrder[]> {
      return await this.orderbag.getOrders();
   }

   async findOrderById(id: string): Promise<ExchangeOrder | undefined> {
      return await this.orderbag.findOrderById(id);
   }

   async getOrdersForSymbol(symbol: string): Promise<ExchangeOrder[]> {
      return await this.orderbag.getOrdersForSymbol(symbol);
   }

   async updateOrder(id: string, order: Order): Promise<ExchangeOrder | undefined> {
      if (!order.amount && !order.price) {
         throw new Error('Invalid amount / price for update');
      }

      const currentOrder = (await this.findOrderById(id)) as Order | undefined;
      if (!currentOrder) {
         return undefined;
      }

      // cancel order; mostly it can already be canceled
      const cancelOrder = await this.cancelOrder(id);
      if (!cancelOrder) {
         this.logger.error(`${this.ccxtClient.name}: updateOrder order abort existing order not canceled: ${id}`);
         return undefined;
      }

      return this.createOrder(Order.createUpdateOrderOnCurrent(currentOrder, order.price, order.amount));
   }

   async cancelOrder(id: string): Promise<ExchangeOrder | undefined> {
      const order = await this.findOrderById(id);
      if (!order) {
         return undefined;
      }

      let args = {
         id: id,
         symbol: order.symbol,
         order: order,
      };

      if (this.callbacks && 'cancelOrder' in this.callbacks) {
         const custom = this.callbacks.cancelOrder(this.ccxtClient, args);

         if (custom) {
            args = _.merge(args, custom);
         }
      }

      try {
         await this.ccxtClient.cancelOrder(args.id, args.symbol);
      } catch (e) {
         if (String(e).includes('OrderNotFound')) {
            this.logger.info(`${this.ccxtClient.name}: order to cancel not found: ${args.id} - ${e}`);
            this.orderbag.delete(id);
         } else {
            this.logger.error(`${this.ccxtClient.name}: cancel order error: ${args.id} - ${e}`);
         }

         return undefined;
      }

      this.orderbag.delete(id);

      return ExchangeOrder.createCanceled(order);
   }

   async cancelAll(symbol: string): Promise<ExchangeOrder[]> {
      const orders: ExchangeOrder[] = [];

      for (const order of await this.getOrdersForSymbol(symbol)) {
         const order1 = await this.cancelOrder(order.id.toString());
         if (order1) orders.push(order1);
      }

      return orders;
   }

   triggerPlainOrder(plainOrder: any): void {
      const ccxtOrder = this.ccxtClient.parseOrder(plainOrder);
      const exchangeOrder = this.convertOrder(ccxtOrder);

      this.triggerOrder(exchangeOrder);
   }

   convertOrder(ccxtOrder: any): ExchangeOrder {
      if (this.callbacks && 'convertOrder' in this.callbacks) {
         this.callbacks.convertOrder(this.ccxtClient, ccxtOrder);
      }

      return CcxtUtil.createExchangeOrder(ccxtOrder);
   }

   static createEmpty(logger: any): CcxtExchangeOrder {
      class Empty extends CcxtExchangeOrder {
         constructor(myLogger: any) {
            super(undefined, [], myLogger, undefined);
         }

         async createOrder(order: Order): Promise<undefined> {
            logger.info('Empty CCXT state: createOrder stopped');
            return undefined;
         }

         async syncOrders(): Promise<ExchangeOrder[]> {
            logger.info('Empty CCXT state: syncOrders stopped');
            return [];
         }

         async updateOrder(id: string, order: Order): Promise<ExchangeOrder | undefined> {
            logger.info('Empty CCXT state: updateOrder stopped');
            return undefined;
         }

         async cancelOrder(id: string): Promise<ExchangeOrder | undefined> {
            logger.info('Empty CCXT state: cancelOrder stopped');
            return undefined;
         }
      }

      return new Empty(logger);
   }
}
