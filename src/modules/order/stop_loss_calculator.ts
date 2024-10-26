import { ILogObj, Logger } from 'tslog';
import { Position } from '~/src/dict/position';
import { Tickers } from '../../storage/tickers';

export class StopLossCalculator {
   private tickers: Tickers;
   private logger: any;

   constructor(tickers: Tickers, logger: any) {
      this.tickers = tickers;
      this.logger = logger;
   }

   async calculateForOpenPosition(exchange: string, position: Position, options: any = { percent: 3 }): Promise<number | undefined> {
      const { tickers } = this;

      if (!position.entry) {
         this.logger.info(`Invalid position entry for stop loss:${JSON.stringify(position)}`);
         return undefined;
      }

      let price: number | undefined;
      if (position.side === 'long') {
         if (options.percent) {
            price = position.entry * (1 - options.percent / 100);
         }
      } else if (options.percent) {
         price = position.entry * (1 + options.percent / 100);
      }

      // invalid price no value
      if (!price) {
         this.logger.info(`Empty price for stop loss:${JSON.stringify(position)}`);
         return undefined;
      }

      const ticker = tickers.get(exchange, position.symbol);

      if (!ticker) {
         this.logger.info(`Ticker not found for stop loss:${JSON.stringify(position)}`);
         return undefined;
      }

      if (position.side === 'long') {
         if (price > ticker.ask) {
            this.logger.info(`Ticker out of range stop loss (long): ${JSON.stringify(position)}${JSON.stringify(ticker)}`);
            return undefined;
         }
      } else if (position.side === 'short') {
         if (price < ticker.bid) {
            this.logger.info(`Ticker out of range stop loss (short): ${JSON.stringify(position)}${JSON.stringify(ticker)}`);
            return undefined;
         }
      }

      // inverse price for lose long position via sell
      if (position.side === 'long') {
         price *= -1;
      }

      return price;
   }
}
