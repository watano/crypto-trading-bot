import { Tickers } from '~/src/storage/tickers';
import { Order } from '../../dict/order';
import { ExchangeManager } from '../exchange/exchange_manager';
import { OrderExecutor } from '../order/order_executor';
import { PairConfig } from '../pairs/pair_config';

export class OrdersHttp {
   constructor(
      public backtest: any,
      public tickers: Tickers,
      public orderExecutor: OrderExecutor,
      public exchangeManager: ExchangeManager,
      public pairConfig: PairConfig,
   ) {}

   getPairs() {
      return this.pairConfig.getAllPairNames();
   }

   getOrders(pair: string) {
      const res = pair.split('.');
      return this.exchangeManager.getOrders(res[0], res[1]);
   }

   async cancel(pair: string, id: string) {
      const res = pair.split('.');
      return this.orderExecutor.cancelOrder(res[0], id);
   }

   async cancelAll(pair: string) {
      const res = pair.split('.');
      const orders = await this.exchangeManager.getOrders(res[0], res[1]);
      for (const order of orders) {
         await this.orderExecutor.cancelOrder(res[0], order.id);
      }
   }

   getTicker(pair: string) {
      const res = pair.split('.');
      return this.tickers.get(res[0], res[1]);
   }

   async createOrder(pair: string, order: any) {
      const res = pair.split('.');
      const exchangeInstance = this.exchangeManager.get(res[0]);
      let orderAmount = Number.parseFloat(order.amount);
      if (exchangeInstance.isInverseSymbol(res[1])) {
         orderAmount = Number.parseFloat(order.amount_currency);
      }
      const amount = exchangeInstance.calculateAmount(orderAmount, res[1]);
      if (amount) {
         orderAmount = Number.parseFloat(amount);
      }
      let orderPrice = Number.parseFloat(order.price);
      const price = exchangeInstance.calculatePrice(orderPrice, res[1]);
      if (price) {
         orderPrice = Number.parseFloat(price);
      }
      let ourOrder: any;
      if (order.type && order.type === 'stop') {
         ourOrder = Order.createStopOrder(res[1], order.side, orderPrice, orderAmount);
      } else {
         ourOrder = Order.createLimitPostOnlyOrder(res[1], order.side, orderPrice, orderAmount);
      }
      return this.orderExecutor.executeOrder(res[0], ourOrder);
   }
}
