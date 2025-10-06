export class ExchangeCandlestick {
   exchange: string;
   period: string;
   symbol: string;
   time: number;
   open: number;
   high: number;
   low: number;
   close: number;
   volume: number;

   constructor(exchange: string, symbol: string, period: string, time: number, open: number, high: number, low: number, close: number, volume: number) {
      if (!['m', 'h', 'd', 'y'].includes(period.slice(-1))) {
         throw new Error(`Invalid candlestick period: ${period} - `); // ${JSON.stringify(Object.values(arguments))}`);
      }

      // simple time validation
      time = Number.parseInt(time.toString());
      if (time <= 631148400) {
         throw new Error(`Invalid candlestick time given: ${time} - `); // ${JSON.stringify(Object.values(arguments))}`);
      }

      this.exchange = exchange;
      this.period = period;
      this.symbol = symbol;
      this.time = time;
      this.open = open;
      this.high = high;
      this.low = low;
      this.close = close;
      this.volume = volume;
   }

   static createFromCandle(exchange: string, symbol: string, period: string, candle: { time: number; open: number; high: number; low: number; close: number; volume: number }): ExchangeCandlestick {
      return new ExchangeCandlestick(exchange, symbol, period, candle.time, candle.open, candle.high, candle.low, candle.close, candle.volume);
   }
}
