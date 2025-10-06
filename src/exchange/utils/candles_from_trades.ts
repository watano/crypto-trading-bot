import { CandlestickResample } from '~/src/modules/system/candlestick_resample';
import { ExchangeCandlestick } from '../../dict/exchange_candlestick';

export class CandlesFromTrades {
   private candlestickResample: CandlestickResample;
   private candleImporter: any;
   private candles: { [symbol: string]: { [timestamp: number]: any } };
   private lastCandleMap: { [symbol: string]: any };

   constructor(candlestickResample: any, candleImporter: any) {
      this.candlestickResample = candlestickResample;
      this.candleImporter = candleImporter;

      this.candles = {};
      this.lastCandleMap = {};
   }

   async onTrades(exchangeName: string, trades: any[], symbols: string[] = []): Promise<void> {
      for (const trade of trades) {
         await this.onTrade(exchangeName, trade, symbols);
      }
   }

   /**
    * Exchanges like coinbase do not deliver candles via websocket, so we fake them on the public order history (websocket)
    *
    * @param exchangeName string
    * @param trade Trade
    * @param symbols string[] for calculating the resamples
    */
   async onTrade(exchangeName: string, trade: any, symbols: string[] = []): Promise<void> {
      if (!trade.price || !trade.amount || !trade.symbol || !trade.timestamp) {
         return;
      }

      // Price and volume are sent as strings by the API
      trade.price = Number.parseFloat(trade.price);
      trade.amount = Number.parseFloat(trade.amount);

      const { symbol } = trade;

      // Round the time to the nearest minute, change as per your resolution
      const roundedTime = Math.floor(new Date(trade.timestamp).getTime() / 60000) * 60;

      // If the candles hashmap doesn't have this product id, create an empty object for that id
      if (!this.candles[symbol]) {
         this.candles[symbol] = {};
      }

      // Candle still open, just modify it
      if (this.candles[symbol][roundedTime]) {
         // If this timestamp exists in our map for the product id, we need to update an existing candle
         const candle = this.candles[symbol][roundedTime];

         candle.high = trade.price > candle.high ? trade.price : candle.high;
         candle.low = trade.price < candle.low ? trade.price : candle.low;
         candle.close = trade.price;
         candle.volume = Number.parseFloat((candle.volume + trade.amount).toFixed(8));

         // Set the last candle as the one we just updated
         this.lastCandleMap[symbol] = candle;

         return;
      }

      // Before creating a new candle, mark the old one as closed
      const lastCandle = this.lastCandleMap[symbol];

      if (lastCandle) {
         lastCandle.closed = true;
         delete this.candles[symbol][lastCandle.timestamp];
      }

      this.candles[symbol][roundedTime] = { timestamp: roundedTime, open: trade.price, high: trade.price, low: trade.price, close: trade.price, volume: trade.amount, closed: false };

      const ourCandles: ExchangeCandlestick[] = [];
      for (const timestamp in this.candles[symbol]) {
         const candle = this.candles[symbol][timestamp];

         ourCandles.push(new ExchangeCandlestick(exchangeName, symbol, '1m', candle.timestamp, candle.open, candle.high, candle.low, candle.close, candle.volume));
      }

      // Delete old candles
      Object.keys(this.candles[symbol]).sort((a: any, b: any) => b - a).slice(200).forEach((i: any) => {
         delete this.candles[symbol][i];
      });

      await this.candleImporter.insertThrottledCandles(ourCandles);

      let resamples: string[] = [];

      const symbolCfg: any = symbols.find((s) => s === symbol);
      if (symbolCfg) {
         resamples = symbolCfg.periods.filter((r: any) => r !== '1m');
      }

      // Wait for insert of previous database inserts
      await Promise.all(resamples.map(async (resamplePeriod) => {
         await this.candlestickResample.resample(exchangeName, symbol, '1m', resamplePeriod, true);
      }));
   }
}
