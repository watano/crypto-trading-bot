import { ExchangeOrder } from '../../dict/exchange_order';
import { Order } from '../../dict/order';
import { Position } from '../../dict/position';

export class CcxtUtil {
   static createExchangeOrders(orders: Order[]): ExchangeOrder[] {
      return orders.map(CcxtUtil.createExchangeOrder);
   }

   static createExchangeOrder(order: any): ExchangeOrder {
      let retry = false;

      let status: string = '';
      const orderStatus = order.status.toLowerCase();

      if (['new', 'open', 'partiallyfilled', 'pendingnew', 'doneforday', 'stopped'].includes(orderStatus)) {
         status = 'open';
      } else if (orderStatus === 'filled') {
         status = 'done';
      } else if (orderStatus === 'canceled') {
         status = 'canceled';
      } else if (orderStatus === 'rejected' || orderStatus === 'expired') {
         status = 'rejected';
         retry = true;
      }

      const ordType = order.type.toLowerCase().replace(/[\W_]+/g, '');

      // Secure the value
      let orderType: string;
      switch (ordType) {
         case 'limit':
            orderType = ExchangeOrder.TYPE_LIMIT;
            break;
         case 'stop':
         case 'stopmarket': // currently: binance_futures only
            orderType = ExchangeOrder.TYPE_STOP;
            break;
         case 'stoplimit':
            orderType = ExchangeOrder.TYPE_STOP_LIMIT;
            break;
         case 'market':
            orderType = ExchangeOrder.TYPE_MARKET;
            break;
         case 'trailingstop':
         case 'trailingstopmarket': // currently: binance_futures only
            orderType = ExchangeOrder.TYPE_TRAILING_STOP;
            break;
         default:
            orderType = ExchangeOrder.TYPE_UNKNOWN;
            break;
      }

      return new ExchangeOrder(
         order.id,
         order.symbol,
         status,
         order.price,
         order.amount,
         retry,
         '',
         order.side.toLowerCase() === 'sell' ? 'sell' : 'buy', // Secure the value
         orderType,
         new Date(), // No date?
         new Date(),
         JSON.parse(JSON.stringify(order)),
      );
   }

   static createPositions(positions: any[]): Position[] {
      return positions.map((position) => {
         let { unrealisedRoePcnt } = position;

         if (position.leverage && position.leverage > 1) {
            unrealisedRoePcnt /= position.leverage;
         }

         return new Position(position.symbol, position.currentQty < 0 ? 'short' : 'long', position.currentQty, Number.parseFloat((unrealisedRoePcnt * 100).toFixed(2)), new Date(), position.avgEntryPrice, new Date(position.openingTimestamp));
      });
   }
}
