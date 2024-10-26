import { ExchangePosition } from '../dict/exchange_position';

export class PositionStateChangeEvent {
   static EVENT_NAME = 'position_state_changed';

   private _state: string;
   private _exchangePosition: ExchangePosition;

   constructor(state: string, exchangePosition: ExchangePosition) {
      if (!(exchangePosition instanceof ExchangePosition)) {
         throw new TypeError('invalid exchangePosition');
      }

      if (!['opened', 'closed'].includes(state)) {
         throw new TypeError(`invalid state: ${state}`);
      }

      this._state = state;
      this._exchangePosition = exchangePosition;
   }

   isOpened(): boolean {
      return this._state === 'opened';
   }

   isClosed(): boolean {
      return this._state === 'closed';
   }

   getExchange(): string {
      return this._exchangePosition.getExchange();
   }

   getPosition(): any {
      return this._exchangePosition.getPosition();
   }

   getSymbol(): string {
      return this._exchangePosition.getSymbol();
   }

   static createOpened(exchangePosition: ExchangePosition): PositionStateChangeEvent {
      return new PositionStateChangeEvent('opened', exchangePosition);
   }

   static createClosed(exchangePosition: ExchangePosition): PositionStateChangeEvent {
      return new PositionStateChangeEvent('closed', exchangePosition);
   }
}
