import { describe, expect, it } from 'bun:test';
import assert from 'node:assert';
import { Logger } from 'tslog';
import { Position } from '~/src/dict/position';
import { Ticker } from '~/src/dict/ticker';
import { StopLossCalculator } from '~/src/modules/order/stop_loss_calculator';
import { Tickers } from '~/src/storage/tickers';

describe('#stop loss order calculation', () => {
   const fakeLogger = <Logger<any>>{ info: () => {} };

   it('calculate stop lose for long', async () => {
      const tickers = new Tickers();
      tickers.set(new Ticker('noop', 'BTCUSD', 0, 6500.66, 6502.99));
      const calculator = new StopLossCalculator(tickers, fakeLogger);

      const result = await calculator.calculateForOpenPosition(
         'noop', //
         new Position('BTCUSD', 'long', 0.15, 6500.66, new Date(), 6501.76),
      );

      assert.equal(result?.toFixed(1), '-6306.7');

      const result2 = await calculator.calculateForOpenPosition(
         'noop', //
         new Position('BTCUSD', 'long', 0.15, 6500.66, new Date(), 6501.76),
         { percent: 5 },
      );

      assert.equal(result2?.toFixed(1), '-6176.7');
   });

   it('calculate stop lose for short', async () => {
      const tickers = new Tickers();
      tickers.set(new Ticker('noop', 'BTCUSD', 0, 6500.66, 6502.99));

      const calculator = new StopLossCalculator(tickers, fakeLogger);

      const result = await calculator.calculateForOpenPosition(
         'noop', //
         new Position('BTCUSD', 'short', -0.15, 6500.66, new Date(), 6501.76),
      );

      assert.equal(result?.toFixed(1), '6696.8');
   });

   it('calculate stop lose invalid option', async () => {
      const tickers = new Tickers();
      tickers.set(new Ticker('noop', 'BTCUSD', 0, 6500.66, 6502.99));

      const calculator = new StopLossCalculator(tickers, fakeLogger);

      const result = await calculator.calculateForOpenPosition(
         'noop', //
         new Position('BTCUSD', 'short', -0.15, 6500.66, new Date(), 6501.76),
         {},
      );
      assert.equal(result, undefined);
   });

   it('calculate stop lose with higher ticker (long)', async () => {
      const tickers = new Tickers();
      tickers.set(new Ticker('noop', 'BTCUSD', 0, 6500.66, 6301));

      const calculator = new StopLossCalculator(tickers, fakeLogger);

      const result = await calculator.calculateForOpenPosition(
         'noop', //
         new Position('BTCUSD', 'long', 0.15, 6500.66, new Date(), 6501.76),
      );

      assert.equal(result, undefined);
   });

   it('calculate stop lose with higher ticker (short)', async () => {
      const tickers = new Tickers();
      tickers.set(new Ticker('noop', 'BTCUSD', 0, 6796, 6502.99));

      const calculator = new StopLossCalculator(tickers, fakeLogger);

      const result = await calculator.calculateForOpenPosition(
         'noop', //
         new Position('BTCUSD', 'short', -0.15, 6500.66, new Date(), 6501.76),
      );

      assert.equal(result, undefined);
   });
});
