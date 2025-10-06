import { describe, expect, it } from 'bun:test';
import { ExchangePosition } from '~/src/dict/exchange_position';
import { Position } from '~/src/dict/position';
import { PositionStateChangeEvent } from '~/src/event/position_state_change_event';
import { ExchangePositionWatcher } from '~/src/modules/exchange/exchange_position_watcher';

describe('#exchange position watcher', () => {
   it('test that opened positions are triggered', async () => {
      const runs = [[], [new ExchangePosition('foobar', new Position('BTCUSD', 'long', 1, 0))]];

      let i = 0;
      const events: { [key: string]: PositionStateChangeEvent } = {};
      const exchangeManager = new ExchangePositionWatcher({
         getPositions: async () => {
            return runs[i++];
         },
      }, {
         emit: (eventName: string, event: PositionStateChangeEvent) => {
            events[eventName] = event;
         },
      }, { info: () => {} });

      await exchangeManager.onPositionStateChangeTick();
      await exchangeManager.onPositionStateChangeTick();

      expect(Object.keys(exchangeManager.positions).length).toBe(1);

      const event = events[PositionStateChangeEvent.EVENT_NAME];
      expect(event.getExchange()).toBe('foobar');
      expect(event.getSymbol()).toBe('BTCUSD');
      expect(event.isOpened()).toBe(true);
      expect(event.isClosed()).toBe(false);

      const position = event.getPosition();
      expect(position.symbol).toBe('BTCUSD');
   });

   it('test that closed positions are triggered', async () => {
      const runs = [[new ExchangePosition('foobar', new Position('BTCUSD', 'long', 1, 0))], []];

      let i = 0;
      const events: { [key: string]: PositionStateChangeEvent } = {};
      const exchangeManager = new ExchangePositionWatcher({
         getPositions: async () => {
            return runs[i++];
         },
      }, {
         emit: (eventName: string, event: PositionStateChangeEvent) => {
            events[eventName] = event;
         },
      }, { info: () => {} });

      await exchangeManager.onPositionStateChangeTick();
      await exchangeManager.onPositionStateChangeTick();

      expect(Object.keys(exchangeManager.positions).length).toBe(0);

      const event = events[PositionStateChangeEvent.EVENT_NAME];
      expect(event.getExchange()).toBe('foobar');
      expect(event.getSymbol()).toBe('BTCUSD');
      expect(event.isOpened()).toBe(false);
      expect(event.isClosed()).toBe(true);

      const position = event.getPosition();
      expect(position.symbol).toBe('BTCUSD');
   });

   it('test that no change should not trigger event', async () => {
      const runs = [[new ExchangePosition('foobar', new Position('BTCUSD', 'long', 1)), new ExchangePosition('foobar2', new Position('BTCUSD2', 'long', 1))], [
         new ExchangePosition('foobar', new Position('BTCUSD', 'long', 1)),
         new ExchangePosition('foobar2', new Position('BTCUSD2', 'long', 1)),
      ], [new ExchangePosition('foobar', new Position('BTCUSD', 'long', 1)), new ExchangePosition('foobar2', new Position('BTCUSD2', 'long', 1))]];

      let i = 0;
      const events: { [key: string]: PositionStateChangeEvent } = {};
      const exchangeManager = new ExchangePositionWatcher({
         getPositions: async () => {
            return runs[i++];
         },
      }, {
         emit: (eventName: string, event: PositionStateChangeEvent) => {
            events[eventName] = event;
         },
      }, { info: () => {} });

      await exchangeManager.onPositionStateChangeTick();
      await exchangeManager.onPositionStateChangeTick();
      await exchangeManager.onPositionStateChangeTick();

      expect(Object.keys(events).length).toBe(0);
   });

   it('test that opened, closed, reopen positions are triggered', async () => {
      const runs = [[new ExchangePosition('foobar', new Position('BTCUSD', 'long', 1))], [], [new ExchangePosition('foobar', new Position('BTCUSD', 'long', 1))]];

      let i = 0;
      const events: PositionStateChangeEvent[] = [];
      const exchangeManager = new ExchangePositionWatcher({
         getPositions: async () => {
            return runs[i++];
         },
      }, {
         emit: (eventName: string, event: PositionStateChangeEvent) => {
            events.push(event);
         },
      }, { info: () => {} });

      await exchangeManager.onPositionStateChangeTick();
      expect(Object.keys(exchangeManager.positions).length).toBe(1);

      await exchangeManager.onPositionStateChangeTick();
      expect(Object.keys(exchangeManager.positions).length).toBe(0);

      await exchangeManager.onPositionStateChangeTick();
      expect(Object.keys(exchangeManager.positions).length).toBe(1);

      const eventClosed = events[0];
      expect(eventClosed.getExchange()).toBe('foobar');
      expect(eventClosed.getSymbol()).toBe('BTCUSD');
      expect(eventClosed.isOpened()).toBe(false);
      expect(eventClosed.isClosed()).toBe(true);
      expect(eventClosed.getPosition().symbol).toBe('BTCUSD');

      const eventOpen = events[1];
      expect(eventOpen.getExchange()).toBe('foobar');
      expect(eventOpen.getSymbol()).toBe('BTCUSD');
      expect(eventOpen.isOpened()).toBe(true);
      expect(eventOpen.isClosed()).toBe(false);
      expect(eventOpen.getPosition().symbol).toBe('BTCUSD');
   });
});
