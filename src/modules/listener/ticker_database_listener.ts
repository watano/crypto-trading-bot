import _ from 'lodash';
import { TickerEvent } from '~/src/event/ticker_event';

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

   onTicker(tickerEvent: TickerEvent): void {
      const { ticker } = tickerEvent;
      this.throttle[ticker.symbol + ticker.exchange] = ticker;
   }
}
