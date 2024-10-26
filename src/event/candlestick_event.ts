import { Candlestick } from '../dict/candlestick';

export class CandlestickEvent {
   exchange: string;
   symbol: string;
   period: string;
   candles: Candlestick[];

   constructor(exchange: string, symbol: string, period: string, candles: Candlestick[]) {
      this.exchange = exchange;
      this.symbol = symbol;
      this.period = period;
      this.candles = candles;
   }
}
