import moment from 'moment';

export const findPositionEntryFromTrades = (trades: any, balance: any, side: string) => {
   if (trades.length === 0) {
      return undefined;
   }

   if (!['short', 'long'].includes(side)) {
      throw new Error(`Invalid entry side: ${side}`);
   }

   const result: any = { size: 0, costs: 0 };

   const sideBlocker = side === 'short' ? 'sell' : 'buy';
   for (const trade of trades) {
      // stop if last trade is a sell
      if (trade.side !== sideBlocker) {
         // stop if order is really old
         if (trade.time < moment().subtract(2, 'days')) {
            break;
         }

         continue;
      }

      // stop if price out of range window
      const number = result.size + Number.parseFloat(trade.size);
      if (number > balance * 1.15) {
         break;
      }

      // stop on old fills
      if (result.time) {
         const secDiff = Math.abs(new Date(trade.time).getTime() - new Date(result.time).getTime());

         // out of 7 day range
         if (secDiff > 60 * 60 * 24 * 7 * 1000) {
            break;
         }
      }

      result.size += Number.parseFloat(trade.size);
      const costs = Number.parseFloat(trade.size) * Number.parseFloat(trade.price) + Number.parseFloat(trade.fee || 0);

      result.costs += costs;

      // first trade wins for open
      if (trade.time && !result.time) {
         result.time = trade.time;
      }
   }

   result.average_price = result.costs / result.size;

   if (result.size === 0 || result.costs === 0) {
      return undefined;
   }

   return result;
};
