import { Order } from './order';

export class ExchangeOrder extends Order {
   static STATUS_OPEN = 'open';
   static STATUS_DONE = 'done';
   static STATUS_CANCELED = 'canceled';
   static STATUS_REJECTED = 'rejected';

   static TYPE_LIMIT = 'limit';
   static TYPE_STOP = 'stop';
   static TYPE_STOP_LIMIT = 'stop_limit';
   static TYPE_MARKET = 'market';
   static TYPE_UNKNOWN = 'unknown';

   static SIDE_SHORT = 'short';
   static SIDE_LONG = 'long';

   static TYPE_TRAILING_STOP = 'trailing_stop';

   status: string;
   retry: boolean;
   ourId: string | undefined;
   createdAt: Date;
   updatedAt: Date;
   raw: any;
   options: { reduce_only?: boolean; post_only?: boolean };

   constructor(
      id: string,
      symbol: string,
      status: string,
      price: number,
      amount: number,
      retry: boolean,
      ourId: string | undefined,
      side: string,
      type: string,
      createdAt?: Date,
      updatedAt?: Date,
      raw: any = undefined,
      options: { reduce_only?: boolean; post_only?: boolean } = {},
   ) {
      if (side === 'buy') {
         side = ExchangeOrder.SIDE_LONG;
      }
      if (side === 'sell') {
         side = ExchangeOrder.SIDE_SHORT;
      }
      if (side !== ExchangeOrder.SIDE_LONG && side !== ExchangeOrder.SIDE_SHORT) {
         throw new Error(`Invalid order direction given: ${side}`);
      }

      if (![ExchangeOrder.TYPE_LIMIT, ExchangeOrder.TYPE_STOP_LIMIT, ExchangeOrder.TYPE_MARKET, ExchangeOrder.TYPE_UNKNOWN, ExchangeOrder.TYPE_STOP, ExchangeOrder.TYPE_TRAILING_STOP].includes(type)) {
         throw new Error(`Invalid order type: ${type}`);
      }
      super(id, symbol, side, price, amount, type);
      this.status = status;
      this.retry = retry;
      this.ourId = ourId;
      this.createdAt = createdAt ?? new Date();
      this.updatedAt = updatedAt ?? new Date();
      this.raw = raw;
      this.options = options;
   }

   getType(): string {
      return this.type;
   }

   getSymbol(): string {
      return this.symbol;
   }

   isReduceOnly(): boolean {
      return this.options.reduce_only === true;
   }

   isPostOnly(): boolean {
      return this.options.post_only === true;
   }

   isLong(): boolean {
      return this.getLongOrShortSide() === ExchangeOrder.SIDE_LONG;
   }

   isShort(): boolean {
      return this.getLongOrShortSide() === ExchangeOrder.SIDE_SHORT;
   }

   getStatus(): string {
      return this.status;
   }

   getLongOrShortSide(): string {
      switch (this.side) {
         case 'long':
            return ExchangeOrder.SIDE_LONG;
         case 'short':
            return ExchangeOrder.SIDE_SHORT;
         default:
            throw new Error(`Invalid side: ${this.side}`);
      }
   }

   shouldCancelOrderProcess(): boolean {
      return ['canceled', 'rejected'].includes(this.status) && this.retry === false;
   }

   static createBlankRetryOrder(side: string): ExchangeOrder {
      return new ExchangeOrder(
         Math.round(new Date().getTime() * Math.random()).toString(), //
         '',
         'canceled',
         0,
         0,
         true,
         undefined,
         side,
         ExchangeOrder.TYPE_LIMIT,
         new Date(),
         new Date(),
      );
   }

   static createCanceled(order: ExchangeOrder): ExchangeOrder {
      return new ExchangeOrder(
         order.id.toString(), //
         order.symbol,
         'canceled',
         order.price,
         order.amount,
         false,
         order.ourId,
         order.side,
         order.type,
         order.createdAt,
         order.updatedAt,
         order.raw,
      );
   }

   static createCanceledFromOrder(order: ExchangeOrder): ExchangeOrder {
      let side = order.side;
      if (order.side === ExchangeOrder.SIDE_LONG) {
         side = 'buy';
      } else if (order.side === ExchangeOrder.SIDE_SHORT) {
         side = 'sell';
      }

      return new ExchangeOrder(
         order.id.toString(), //
         order.symbol,
         'canceled',
         order.price,
         order.amount,
         false,
         order.ourId,
         side,
         order.type,
         new Date(),
         new Date(),
      );
   }

   static createRejectedFromOrder(order: ExchangeOrder, message?: string): ExchangeOrder {
      let side = order.side;
      if (order.side === ExchangeOrder.SIDE_LONG) {
         side = 'buy';
      } else if (order.side === ExchangeOrder.SIDE_SHORT) {
         side = 'sell';
      }

      const raw: any = {};
      if (message) {
         raw.message = message;
      }

      return new ExchangeOrder(order.id.toString(), order.symbol, 'rejected', order.price, order.amount, false, order.ourId, side, order.type, order.createdAt, order.updatedAt, raw);
   }
}
