import _ from 'lodash';
import moment from 'moment';
import { Tickers } from '~/src/storage/tickers';
import { ExchangeOrder } from '../../dict/exchange_order';
import { Order } from '../../dict/order';
import { PairState } from '../../dict/pair_state';
import { ExchangeManager } from '../exchange/exchange_manager';
import { SystemUtil } from '../system/system_util';

export class OrderExecutor {
   public tickerPriceInterval = 200;
   public tickerPriceRetries = 40;
   constructor(
      public exchangeManager: ExchangeManager,
      public tickers: Tickers,
      public systemUtil?: SystemUtil,
      public logger?: any,
      public runningOrders: any = {},
   ) {
      this.tickerPriceInterval = 200;
      this.tickerPriceRetries = 40;
   }

   async adjustOpenOrdersPrice(...pairStates: PairState[]) {
      for (const orderId in this.runningOrders) {
         if (this.runningOrders[orderId] < moment().subtract(2, 'minutes')) {
            this.logger.debug(`OrderAdjust: adjustOpenOrdersPrice timeout cleanup: ${JSON.stringify([orderId, this.runningOrders[orderId]])}`);
            delete this.runningOrders[orderId];
         }
      }

      const visitExchangeOrder = async (pairState: PairState) => {
         if (!pairState.hasAdjustedPrice()) {
            return;
         }
         const exchangeName = pairState.getExchange();
         const exchange = this.exchangeManager.get(exchangeName);

         const exchangeOrder = pairState.getExchangeOrder();
         if (!exchangeOrder) {
            return;
         }

         if (exchangeOrder.id in this.runningOrders) {
            this.logger.info(`OrderAdjust: already running: ${JSON.stringify([exchangeOrder.id, exchangeName, pairState.getSymbol()])}`);
            return;
         }

         this.runningOrders[exchangeOrder.id] = new Date();

         const price = (await this.getCurrentPrice(exchangeName, pairState.getSymbol(), exchangeOrder.getLongOrShortSide())) as number;
         if (!price) {
            this.logger.info(`OrderAdjust: No up to date ticker price found: ${JSON.stringify([exchangeOrder.id, exchangeName, pairState.getSymbol(), exchangeOrder.getLongOrShortSide()])}`);
            delete this.runningOrders[exchangeOrder.id];
            return;
         }

         const lastExchangeOrder = await exchange.findOrderById(exchangeOrder.id);
         if (!lastExchangeOrder || lastExchangeOrder.status !== ExchangeOrder.STATUS_OPEN) {
            this.logger.debug(`OrderAdjust: managed order does not exists maybe filled; cleanup: ${JSON.stringify([exchangeOrder.id, exchangeName, pairState.getSymbol(), lastExchangeOrder])}`);
            delete this.runningOrders[exchangeOrder.id];
            return;
         }

         const orderUpdate = Order.createPriceUpdateOrder(exchangeOrder.id, price, exchangeOrder.getLongOrShortSide());

         if (Math.abs(lastExchangeOrder.price) === Math.abs(price)) {
            this.logger.info(`OrderAdjust: No price update needed:${JSON.stringify([lastExchangeOrder.id, Math.abs(lastExchangeOrder.price), Math.abs(price), exchangeName, pairState.getSymbol()])}`);
            delete this.runningOrders[exchangeOrder.id];
            return;
         }

         try {
            const updatedOrder = await exchange.updateOrder(orderUpdate.id, orderUpdate);

            if (updatedOrder && updatedOrder.status === ExchangeOrder.STATUS_OPEN) {
               this.logger.info(`OrderAdjust: Order adjusted with orderbook price: ${JSON.stringify([updatedOrder.id, Math.abs(lastExchangeOrder.price), Math.abs(price), exchangeName, pairState.getSymbol(), updatedOrder])}`);
               pairState.setExchangeOrder(updatedOrder);
            } else if (updatedOrder && updatedOrder.status === ExchangeOrder.STATUS_CANCELED && updatedOrder.retry === true) {
               this.logger.error(`OrderAdjust: Updated order canceled recreate: ${JSON.stringify(pairState, updatedOrder)}`);

               const amount = lastExchangeOrder.getLongOrShortSide() === ExchangeOrder.SIDE_LONG ? Math.abs(lastExchangeOrder.amount) : Math.abs(lastExchangeOrder.amount) * -1;

               const retryOrder = pairState.getState() === PairState.STATE_CLOSE ? Order.createCloseOrderWithPriceAdjustment(pairState.getSymbol(), amount) : Order.createLimitPostOnlyOrderAutoAdjustedPriceOrder(pairState.getSymbol(), amount);

               this.logger.error(`OrderAdjust: replacing canceled order: ${JSON.stringify(retryOrder)}`);

               const exchangeOrder = await this.executeOrder(exchangeName, pairState.getOrder() as Order);
               pairState.setExchangeOrder(exchangeOrder as unknown as ExchangeOrder);
            } else {
               this.logger.error(`OrderAdjust: Unknown order state: ${JSON.stringify([pairState, updatedOrder])}`);
            }
         } catch (err) {
            this.logger.error(`OrderAdjust: adjusted failed: ${JSON.stringify([String(err), pairState, orderUpdate])}`);
         }

         delete this.runningOrders[exchangeOrder.id];
      };

      return Promise.all(pairStates.map((pairState) => visitExchangeOrder(pairState)));
   }

   async executeOrderWithAmountAndPrice(exchangeName: string, order: Order) {
      const exchangeInstance = this.exchangeManager.get(exchangeName);
      if (!exchangeInstance) {
         this.logger.error(`executeOrderWithAmountAndPrice: Invalid exchange: ${exchangeName}`);
         return undefined;
      }

      const amount = exchangeInstance.calculateAmount(order.getAmount(), order.getSymbol());
      if (amount) {
         order.amount = Number.parseFloat(amount);
      }

      const price = exchangeInstance.calculatePrice(order.getPrice(), order.getSymbol());
      if (price) {
         order.price = Number.parseFloat(price);
      }

      return this.executeOrder(exchangeName, order);
   }

   async executeOrder(exchangeName: string, order: Order) {
      return await this.triggerOrder(exchangeName, order);
   }

   async cancelOrder(exchangeName: string, orderId: string) {
      const exchange = this.exchangeManager.get(exchangeName);
      if (!exchange) {
         console.error(`CancelOrder: Invalid exchange: ${exchangeName}`);
         return undefined;
      }

      try {
         const order = await exchange.cancelOrder(orderId);
         this.logger.info(`Order canceled: ${orderId}`);
         return order;
      } catch (err) {
         this.logger.error(`Order cancel error: ${orderId} ${err}`);
      }

      return undefined;
   }

   async cancelAll(exchangeName: string, symbol: string) {
      const exchange = this.exchangeManager.get(exchangeName);

      try {
         return await exchange.cancelAll(symbol);
      } catch (err) {
         this.logger.error(`Order cancel all error: ${JSON.stringify([symbol, err])}`);
      }

      return undefined;
   }

   async triggerOrder(exchangeName: string, order: Order, retry = 0): Promise<Order | undefined> {
      if (retry > this.systemUtil?.getConfig('order.retry', 4)) {
         this.logger.error(`Retry (${retry}) creating order reached: ${JSON.stringify(order)}`);
         return;
      }

      if (retry > 0) {
         this.logger.info(`Retry (${retry}) creating order: ${JSON.stringify(order)}`);
      }

      const exchange = this.exchangeManager.get(exchangeName);
      if (!exchange) {
         console.error(`triggerOrder: Invalid exchange: ${exchangeName}`);
         return;
      }

      if (order.hasAdjustedPrice() === true) {
         order = (await this.createAdjustmentOrder(exchangeName, order)) as Order;

         if (!order) {
            this.logger.error(`Order price adjust failed:${JSON.stringify([exchangeName, order])}`);
            return;
         }
      }

      let exchangeOrder: any;
      try {
         exchangeOrder = await exchange.order(order);
      } catch (err) {
         this.logger.error(`Order create canceled:${JSON.stringify(order)} - ${JSON.stringify(String(err))}`);
         return;
      }

      if (!exchangeOrder) {
         this.logger.error('Order create canceled no exchange return');
         return;
      }

      if (exchangeOrder.status === 'canceled' && exchangeOrder.retry === false) {
         this.logger.error(`Order create canceled:${JSON.stringify(order)} - ${JSON.stringify(exchangeOrder)}`);
         return;
      }

      if (exchangeOrder.retry === true) {
         this.logger.info(`Order not placed force retry: ${JSON.stringify(exchangeOrder)}`);

         setTimeout(
            async () => {
               const retryOrder = Order.createRetryOrder(order);
               await this.triggerOrder(exchangeName, retryOrder, ++retry);
            },
            this.systemUtil?.getConfig('order.retry_ms', 1500),
         );

         return;
      }

      this.logger.info(`Order created: ${JSON.stringify([exchangeOrder.id, exchangeName, exchangeOrder.symbol, order, exchangeOrder])}`);
      console.log(`Order created: ${JSON.stringify([exchangeOrder.id, exchangeName, exchangeOrder.symbol])}`);
   }

   async createAdjustmentOrder(exchangeName: string, order: Order) {
      const price = (await this.getCurrentPrice(exchangeName, order.symbol, order.side)) as number;
      if (!price) {
         this.logger.error(`Stop creating order; can not find up to date ticker price: ${JSON.stringify([exchangeName, order.symbol, order.side])}`);
         return undefined;
      }

      return Order.createRetryOrderWithPriceAdjustment(order, price);
   }

   async getCurrentPrice(exchangeName: string, symbol: string, side: string) {
      if (!['long', 'short'].includes(side)) {
         throw new Error(`Invalid side: ${side}`);
      }

      const wait = (time: number) => new Promise<void>((resolve) => setTimeout(resolve, time));

      for (let retry = 0; retry < this.tickerPriceRetries; retry++) {
         const ticker = this.tickers.getIfUpToDate(exchangeName, symbol, 10000);
         if (ticker) {
            return side === 'short' ? ticker.ask * -1 : ticker.bid;
         }
         await wait(this.tickerPriceInterval);
      }

      const fallbackTicker = this.tickers.get(exchangeName, symbol);
      if (!fallbackTicker) {
         this.logger.error(`OrderExecutor: ticker price not found: ${JSON.stringify([exchangeName, symbol, side])}`);
         return undefined;
      }

      return side === 'short' ? fallbackTicker.ask * -1 : fallbackTicker.bid;
   }
}
