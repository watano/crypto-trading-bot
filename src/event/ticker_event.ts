export class TickerEvent {
   exchange: string;
   symbol: string;
   ticker: any;

   constructor(exchange: string, symbol: string, ticker: any) {
      this.exchange = exchange;
      this.symbol = symbol;
      this.ticker = ticker;
   }
}
