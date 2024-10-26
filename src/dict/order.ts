import { defu } from 'defu';

/**
 * The order that should place from our side and sending to remote
 */
export class Order {
   static get SIDE_LONG() {
      return 'long';
   }

   static get SIDE_SHORT() {
      return 'short';
   }

   static get TYPE_LIMIT() {
      return 'limit';
   }

   static get TYPE_STOP() {
      return 'stop';
   }

   static get TYPE_MARKET() {
      return 'market';
   }

   static get TYPE_TRAILING_STOP() {
      return 'trailing_stop';
   }

   static get OPTION_POST_ONLY() {
      return 'post_only';
   }

   constructor(
      public id: string,
      public symbol: string,
      public side: string,
      public price: number,
      public amount: number,
      public type: string,
      public options: Record<string, any> = {},
   ) {
      if (![Order.SIDE_LONG, Order.SIDE_SHORT].includes(side)) {
         throw new Error(`Invalid order side given: ${side}`);
      }
   }

   hasAdjustedPrice() {
      return this.options.adjust_price === true;
   }

   getId() {
      return this.id;
   }

   getSymbol() {
      return this.symbol;
   }

   isShort() {
      return this.side === Order.SIDE_SHORT;
   }

   isLong() {
      return this.side === Order.SIDE_LONG;
   }

   getPrice() {
      return this.price ? Math.abs(this.price) : undefined;
   }

   getAmount() {
      return this.amount ? Math.abs(this.amount) : undefined;
   }

   getType() {
      return this.type;
   }

   isPostOnly() {
      return this.options && this.options.post_only === true;
   }

   isReduceOnly() {
      return this.options && this.options.close === true;
   }

   static createMarketOrder(symbol: string, amount: number) {
      return new Order(
         Math.round(new Date().getTime() * Math.random()).toString(),
         symbol,
         amount > 0 ? Order.SIDE_LONG : Order.SIDE_SHORT,
         amount > 0 ? 0.000001 : -0.000001, // fake prices
         amount,
         Order.TYPE_MARKET,
      );
   }

   static createLimitPostOnlyOrder(symbol: string, side: string, price: number, amount: number, options?: Record<string, any>) {
      if (![Order.SIDE_SHORT, Order.SIDE_LONG].includes(side)) {
         throw new Error(`Invalid order side:${side} - ${JSON.stringify([symbol, side, price, amount, options])}`);
      }

      return new Order(
         Math.round(new Date().getTime() * Math.random()).toString(), //
         symbol,
         side,
         price,
         amount,
         Order.TYPE_LIMIT,
         defu(options, {
            post_only: true,
         }),
      );
   }

   static createStopOrder(symbol: string, side: string, price: number, amount: number, options?: Record<string, any>) {
      if (![Order.SIDE_SHORT, Order.SIDE_LONG].includes(side)) {
         throw new Error(`Invalid order side:${side} - ${JSON.stringify([symbol, side, price, amount, options])}`);
      }

      return new Order(
         Math.round(new Date().getTime() * Math.random()).toString(), //
         symbol,
         side,
         price,
         amount,
         Order.TYPE_STOP,
         options,
      );
   }

   static createLimitPostOnlyOrderAutoSide(symbol: string, price: number, amount: number, options?: Record<string, any>) {
      return new Order(
         Math.round(new Date().getTime() * Math.random()).toString(),
         symbol,
         price < 0 ? Order.SIDE_SHORT : Order.SIDE_LONG,
         price,
         amount,
         Order.TYPE_LIMIT,
         defu(options, {
            post_only: true,
         }),
      );
   }

   static createCloseLimitPostOnlyReduceOrder(symbol: string, price: number, amount: number) {
      return new Order(
         Math.round(new Date().getTime() * Math.random()).toString(), //
         symbol,
         price < 0 ? Order.SIDE_SHORT : Order.SIDE_LONG,
         price,
         amount,
         Order.TYPE_LIMIT,
         {
            post_only: true,
            close: true,
         },
      );
   }

   static createLimitPostOnlyOrderAutoAdjustedPriceOrder(symbol: string, amount: number, options: Record<string, any> = {}) {
      return Order.createLimitPostOnlyOrder(
         symbol,
         amount < 0 ? Order.SIDE_SHORT : Order.SIDE_LONG,
         0,
         amount,
         defu(options, {
            adjust_price: true,
         }),
      );
   }

   static createRetryOrder(order: Order, amount?: number) {
      if (!(order instanceof Order)) {
         throw new Error('TypeError: no Order');
      }

      if (![Order.SIDE_SHORT, Order.SIDE_LONG].includes(order.side)) {
         throw new Error(`Invalid order side:${order.side} - ${JSON.stringify(order)}`);
      }

      let orderAmount = order.amount;
      if (typeof amount !== 'undefined') {
         orderAmount = Math.abs(amount);

         if (order.side === Order.SIDE_SHORT) {
            orderAmount *= -1;
         }
      }

      return new Order(
         Math.round(new Date().getTime() * Math.random()).toString(), //
         order.symbol,
         order.side,
         order.price,
         orderAmount,
         order.type,
         order.options,
      );
   }

   static createRetryOrderWithPriceAdjustment(order: Order, price: number) {
      if (!(order instanceof Order)) {
         throw new Error('TypeError: no Order');
      }

      if (![Order.SIDE_SHORT, Order.SIDE_LONG].includes(order.side)) {
         throw new Error(`Invalid order side:${order.side} - ${JSON.stringify(order)}`);
      }

      return new Order(
         Math.round(new Date().getTime() * Math.random()).toString(), //
         order.symbol,
         order.side,
         price,
         order.amount,
         order.type,
         order.options,
      );
   }

   static createPriceUpdateOrder(id: string, price: number, side: string) {
      return new Order(id, '', side, price, 0, Order.TYPE_LIMIT, {});
   }

   static createStopLossOrder(symbol: string, price: number, amount: number) {
      return new Order(
         Math.round(new Date().getTime() * Math.random()).toString(), //
         symbol,
         price < 0 || amount < 0 ? Order.SIDE_SHORT : Order.SIDE_LONG,
         price,
         amount,
         'stop',
         { close: true },
      );
   }

   static createUpdateOrder(id: string, price: number, amount: number) {
      return new Order(
         id, //
         '',
         price < 0 || amount < 0 ? Order.SIDE_SHORT : Order.SIDE_LONG,
         price,
         amount,
         Order.TYPE_LIMIT,
      );
   }

   static createCloseOrderWithPriceAdjustment(symbol: string, amount: number) {
      return Order.createLimitPostOnlyOrderAutoAdjustedPriceOrder(symbol, amount, { close: true });
   }

   static createUpdateOrderOnCurrent(exchangeOrder: Order, price?: number, amount?: number) {
      return new Order(
         Math.round(new Date().getTime() * Math.random()).toString(), //
         exchangeOrder.symbol,
         exchangeOrder.side,
         typeof price === 'undefined' ? exchangeOrder.price : price,
         typeof amount === 'undefined' ? exchangeOrder.amount : amount,
         exchangeOrder.type,
         exchangeOrder.options,
      );
   }

   static createTrailingStopLossOrder(symbol: string, distance: number, amount: number) {
      return new Order(
         Math.round(new Date().getTime() * Math.random()).toString(), //
         symbol,
         distance < 0 ? Order.SIDE_SHORT : Order.SIDE_LONG,
         distance,
         amount,
         Order.TYPE_TRAILING_STOP,
         { close: true },
      );
   }
}
