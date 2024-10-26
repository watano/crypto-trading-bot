import _ from 'lodash';

export class TickerDatabaseListener {
   private throttle: { [key: string]: any };
   private tickerRepository: any;

   constructor(tickerRepository: any) {
      this.tickerRepository = tickerRepository;
      this.throttle = {};

      setInterval(async () => {
         const tickers = Object.values(this.throttle);
         this.throttle = {};

         if (tickers.length > 0) {
            for (const chunk of _.chunk(tickers, 100)) {
               await this.tickerRepository.insertTickers(chunk);
            }
         }
      }, 1000 * 15);
   }

   onTicker(tickerEvent: { ticker: any }): void {
      const { ticker } = tickerEvent;
      this.throttle[ticker.symbol + ticker.exchange] = ticker;
   }
}
