import { Position } from '~/src/dict/position';
import { ExchangeOrder } from '../dict/exchange_order';

export const calculateOrderAmount = (price: number, capital: number): number => {
   return capital / price;
};

export const syncOrderByType = (position: Position, orders: ExchangeOrder[], type: string): ExchangeOrder[] => {
   const stopOrders = orders.filter((order) => order.getType() === type);
   if (stopOrders.length === 0) {
      return [<ExchangeOrder> (<unknown> { amount: Math.abs(position.amount) })];
   }

   const stopOrder = stopOrders[0];

   // only update if we 1 % out of range; to get not unit amount lot size issues
   if (isPercentDifferentGreaterThen(position.amount, stopOrder.amount, 1)) {
      return [<ExchangeOrder> (<unknown> { id: stopOrder.id.toString(), amount: position.amount })];
   }

   return [];
};

export const syncStopLossOrder = (position: Position, orders: ExchangeOrder[]): ExchangeOrder[] => {
   return syncOrderByType(position, orders, ExchangeOrder.TYPE_STOP);
};

export const syncTrailingStopLossOrder = (position: Position, orders: ExchangeOrder[]): ExchangeOrder[] => {
   return syncOrderByType(position, orders, ExchangeOrder.TYPE_TRAILING_STOP);
};

/**
 * LTC: "0.008195" => "0.00820"
 *
 * @param num 0.008195
 * @param tickSize 0.00001
 * @returns {string}
 */
export const calculateNearestSize = (num: number, tickSize: number): string => {
   const number = Math.trunc(num / tickSize) * tickSize;

   // fix float issues:
   // 0.0085696 => 0.00001 = 0.00857000...001
   const points = tickSize.toString().split('.');
   if (points.length < 2) {
      return number.toString();
   }

   return number.toFixed(points[1].length);
};

export const isPercentDifferentGreaterThen = (value1: number, value2: number, percentDiff: number): boolean => {
   // we dont care about negative values
   const value1Abs = Math.abs(value1);
   const value2Abs = Math.abs(value2);

   return Math.abs((value1Abs - value2Abs) / ((value1Abs + value2Abs) / 2)) * 100 > percentDiff;
};

/**
 * Percent different between two values, independent of smaller or bigger
 * @param orderPrice
 * @param currentPrice
 * @returns {number}
 */
export const getPercentDifferent = (orderPrice: number, currentPrice: number): number => {
   return orderPrice > currentPrice ? 100 - (currentPrice / orderPrice) * 100 : 100 - (orderPrice / currentPrice) * 100;
};
