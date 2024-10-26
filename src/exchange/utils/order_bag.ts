import { ExchangeOrder } from '../../dict/exchange_order';

export class OrderBag {
   private orders: { [id: string]: ExchangeOrder };

   constructor() {
      this.orders = {};
   }

   /**
    * Force an order update only if order is "not closed" for any reason already by exchange
    *
    * @param order ExchangeOrder
    */
   triggerOrder(order: ExchangeOrder): void {
      if (!(order instanceof ExchangeOrder)) {
         throw new Error('Invalid order given');
      }

      // Don't overwrite state closed order
      for (const [key] of Object.entries(this.orders)) {
         if (String(order.id) !== String(key)) {
            continue;
         }

         if ([ExchangeOrder.STATUS_DONE, ExchangeOrder.STATUS_CANCELED, ExchangeOrder.STATUS_REJECTED].includes(order.status)) {
            delete this.orders[order.id];
         }
         break;
      }

      this.orders[String(order.id)] = order;
   }

   async getOrders(): Promise<ExchangeOrder[]> {
      const orders: ExchangeOrder[] = [];

      for (const key in this.orders) {
         if (this.orders[key].status === 'open') {
            orders.push(this.orders[key]);
         }
      }

      return orders;
   }

   async findOrderById(id: string): Promise<ExchangeOrder | undefined> {
      return (await this.getOrders()).filter((order: ExchangeOrder) => order.id.toString() === id || order.id.toString() === id)[0];
   }

   async getOrdersForSymbol(symbol: string): Promise<ExchangeOrder[]> {
      return (await this.getOrders()).filter((order: ExchangeOrder) => order.symbol === symbol);
   }

   delete(id: string): void {
      delete this.orders[String(id)];
   }

   set(orders: ExchangeOrder[]): void {
      const ourOrder: { [id: string]: ExchangeOrder } = {};

      orders.forEach((o) => {
         if (!(o instanceof ExchangeOrder)) {
            throw new Error('Invalid order given');
         }

         ourOrder[String(o.id)] = o;
      });

      this.orders = ourOrder;
   }

   get(id: string): ExchangeOrder | undefined {
      return this.orders[String(id)];
   }

   all(): ExchangeOrder[] {
      return Object.values(this.orders);
   }
}
