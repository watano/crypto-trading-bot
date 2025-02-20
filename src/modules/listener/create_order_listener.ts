import { Candlestick } from '../../dict/candlestick';
import { ExchangeOrder } from '../../dict/exchange_order';

export class CreateOrderListener {
   private exchangeManager: any;
   private logger: any;

   constructor(exchangeManager: any, logger: any) {
      this.exchangeManager = exchangeManager;
      this.logger = logger;
   }

   async onCreateOrder(orderEvent: any): Promise<void> {
      this.logger.debug(`Create Order: ${JSON.stringify(orderEvent)}`);

      const exchange = this.exchangeManager.get(orderEvent.exchange);
      if (!exchange) {
         console.log(`order: unknown exchange: ${orderEvent.exchange}`);
         return;
      }

      // Filter same direction
      const ordersForSymbol = (await exchange.getOrdersForSymbol(orderEvent.order.symbol)).filter((order: ExchangeOrder) => {
         return order.side === orderEvent.order.side;
      });

      if (ordersForSymbol.length === 0) {
         this.triggerOrder(exchange, orderEvent.order);
         return;
      }

      this.logger.debug(`Info Order update: ${JSON.stringify(orderEvent)}`);

      const currentOrder = ordersForSymbol[0];

      if (currentOrder.side !== orderEvent.order.side) {
         console.log('order side change');
         return;
      }

      exchange
         .updateOrder(currentOrder.id, orderEvent.order)
         .then((order: ExchangeOrder) => {
            console.log(`OrderUpdate: ${JSON.stringify(order)}`);
         })
         .catch(() => {
            console.log('order update error');
         });
   }

   triggerOrder(exchange: any, order: any, retry: number = 0): void {
      if (retry > 3) {
         console.log(`Retry limit stop creating order: ${JSON.stringify(order)}`);
         return;
      }

      if (retry > 0) {
         console.log(`Retry (${retry}) creating order: ${JSON.stringify(order)}`);
      }

      exchange
         .order(order)
         .then((order: ExchangeOrder) => {
            if (order.status === 'rejected') {
               setTimeout(() => {
                  console.log(`Order rejected: ${JSON.stringify(order)}`);
                  this.triggerOrder(exchange, order, retry + 1);
               }, 1500);

               return;
            }

            console.log(`Order created: ${JSON.stringify(order)}`);
         })
         .catch((e: any) => {
            console.log(e);
            console.log(`Order create error: ${JSON.stringify(e)} - ${JSON.stringify(order)}`);
         });
   }
}
