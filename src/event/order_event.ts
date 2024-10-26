import { ExchangeOrder } from '../dict/exchange_order';

export class OrderEvent {
   exchange: string;
   order: ExchangeOrder;

   constructor(exchange: string, order: ExchangeOrder) {
      this.exchange = exchange;
      this.order = order;
   }
}
