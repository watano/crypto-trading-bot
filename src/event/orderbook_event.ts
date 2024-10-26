export class OrderbookEvent {
   exchange: string;
   symbol: string;
   orderbook: any;

   constructor(exchange: string, symbol: string, orderbook: any) {
      this.exchange = exchange;
      this.symbol = symbol;
      this.orderbook = orderbook;
   }
}
