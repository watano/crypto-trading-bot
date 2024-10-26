import { ExchangeOrder } from '../../dict/exchange_order';
import { Order } from '../../dict/order';
import * as OrderUtil from '../../utils/order_util';

export class RiskRewardRatioCalculator {
   private logger: any;

   constructor(logger: any) {
      this.logger = logger;
   }

   calculateForOpenPosition(position: { entry: number; side: string }, options: { stop_percent: number; target_percent: number } = { stop_percent: 3, target_percent: 6 }): { stop?: number; target?: number } | undefined {
      let entryPrice = position.entry;
      if (!entryPrice) {
         this.logger.info(`Invalid position entryPrice for stop loss:${JSON.stringify(position)}`);
         return undefined;
      }

      const result: any = {
         stop: undefined,
         target: undefined,
      };

      entryPrice = Math.abs(entryPrice);

      if (position.side === 'long') {
         result.target = entryPrice * (1 + options.target_percent / 100);
         result.stop = entryPrice * (1 - options.stop_percent / 100);
      } else {
         result.target = entryPrice * (1 - options.target_percent / 100);
         result.stop = entryPrice * (1 + options.stop_percent / 100);
      }

      return result;
   }

   async syncRatioRewardOrders(position: { entry: number; side: string; amount: number; isLong: () => boolean }, orders: Order[], options: { stop_percent: number; target_percent: number }): Promise<{ stop?: Order; target?: Order }> {
      const newOrders: any = {};

      const riskRewardRatio = this.calculateForOpenPosition(position, options);

      const stopOrders = orders.filter((order) => order.type === ExchangeOrder.TYPE_STOP);
      if (stopOrders.length === 0) {
         newOrders.stop = {
            amount: Math.abs(position.amount),
            price: riskRewardRatio?.stop,
         };

         // inverse price for lose long position via sell
         if (position.side === 'long') {
            newOrders.stop.price = newOrders.stop.price * -1;
         }
      } else {
         // update order
         const stopOrder = stopOrders[0];

         // only +1% amount change is important for us
         if (OrderUtil.isPercentDifferentGreaterThen(position.amount, stopOrder.amount, 1)) {
            let amount = Math.abs(position.amount);
            if (position.isLong()) {
               amount *= -1;
            }

            newOrders.stop = {
               id: stopOrder.id,
               amount: amount,
            };
         }
      }

      const targetOrders = orders.filter((order) => order.type === ExchangeOrder.TYPE_LIMIT);
      if (targetOrders.length === 0) {
         newOrders.target = {
            amount: Math.abs(position.amount),
            price: riskRewardRatio?.target,
         };

         // inverse price for lose long position via sell
         if (position.side === 'long') {
            newOrders.target.price = newOrders.target.price * -1;
         }
      } else {
         // update order
         const targetOrder = targetOrders[0];

         // only +1% amount change is important for us
         if (OrderUtil.isPercentDifferentGreaterThen(position.amount, targetOrder.amount, 1)) {
            let amount = Math.abs(position.amount);
            if (position.isLong()) {
               amount *= -1;
            }

            newOrders.target = {
               id: targetOrder.id,
               amount: amount,
            };
         }
      }

      return newOrders;
   }

   async createRiskRewardOrdersOrders(position: { entry: number; side: string; amount: number; isLong: () => boolean }, orders: Order[], options: { stop_percent: number; target_percent: number }): Promise<Order[]> {
      const ratioOrders = await this.syncRatioRewardOrders(position, orders, options);

      const newOrders: Order[] = [];
      if (ratioOrders.target) {
         if (ratioOrders.target.id) {
            newOrders.push(<Order>{
               id: ratioOrders.target.id,
               price: ratioOrders.target.price,
               amount: ratioOrders.target.amount,
            });
         } else {
            newOrders.push(<Order>{
               price: ratioOrders.target.price || undefined,
               amount: ratioOrders.target.amount || undefined,
               type: 'target',
            });
         }
      }

      if (ratioOrders.stop) {
         if (ratioOrders.stop.id) {
            newOrders.push(<Order>{
               id: ratioOrders.stop.id,
               price: ratioOrders.stop.price,
               amount: ratioOrders.stop.amount,
            });
         } else {
            newOrders.push(<Order>{
               price: ratioOrders.stop.price,
               amount: ratioOrders.stop.amount,
               type: 'stop',
            });
         }
      }

      return newOrders;
   }
}
