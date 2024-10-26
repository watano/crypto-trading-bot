import { describe, expect, it } from 'bun:test';
import { StrategyContext } from '~/src/dict/strategy_context';
import { Ticker } from '~/src/dict/ticker';
import { IndicatorBuilder } from '~/src/modules/strategy/dict/indicator_builder';
import { IndicatorPeriod } from '~/src/modules/strategy/dict/indicator_period';
import { AwesomeOscillatorCrossZero } from '~/src/modules/strategy/strategies/awesome_oscillator_cross_zero';

describe('#strategy AwesomeOscillatorCrossZero', () => {
   it('AwesomeOscillatorCrossZero indicator builder', async () => {
      const indicatorBuilder = new IndicatorBuilder();
      const aoCross = new AwesomeOscillatorCrossZero();

      aoCross.buildIndicator(indicatorBuilder, { period: '15m' });
      expect(indicatorBuilder.all().length).toBe(2);
   });

   it('AwesomeOscillatorCrossZero long', async () => {
      const aoCross = new AwesomeOscillatorCrossZero();

      expect(
         (
            await aoCross.period(
               new IndicatorPeriod(createStrategyContext(404), {
                  sma200: [500, 400, 388],
                  ao: [-1, 0.1, 0.3],
               }),
            )
         ).getSignal(),
      ).toBe('long');

      expect(
         (
            await aoCross.period(
               new IndicatorPeriod(createStrategyContext(404), {
                  sma200: [500, 400, 388],
                  ao: [-2, -1, -0.3],
               }),
            )
         ).getSignal(),
      ).toBeUndefined();

      expect(
         (
            await aoCross.period(
               new IndicatorPeriod(createStrategyContext(404), {
                  sma200: [500, 400, 388],
                  ao: [2, -1, -0.3],
               }),
            )
         ).getSignal(),
      ).toBeUndefined();
   });

   it('AwesomeOscillatorCrossZero long (close)', async () => {
      const aoCross = new AwesomeOscillatorCrossZero();

      let context = new StrategyContext({}, new Ticker('goo', 'goo', 0, 404, 0));
      context.lastSignal = 'long';

      expect(
         (
            await aoCross.period(
               new IndicatorPeriod(context, {
                  sma200: [500, 400, 388],
                  ao: [0.1, -1, 0.3],
               }),
            )
         ).getSignal(),
      ).toBe('close');

      context = new StrategyContext({}, new Ticker('goo', 'goo', 0, 404, 0));
      context.lastSignal = 'short';

      expect(
         (
            await aoCross.period(
               new IndicatorPeriod(context, {
                  sma200: [500, 400, 388],
                  ao: [0.1, -1, 0.3],
               }),
            )
         ).getSignal(),
      ).toBeUndefined();
   });

   it('AwesomeOscillatorCrossZero short', async () => {
      const aoCross = new AwesomeOscillatorCrossZero();

      expect(
         (
            await aoCross.period(
               new IndicatorPeriod(createStrategyContext(394), {
                  sma200: [500, 400, 399],
                  ao: [1, -0.1, -0.2],
               }),
            )
         ).getSignal(),
      ).toBe('short');

      expect(
         (
            await aoCross.period(
               new IndicatorPeriod(createStrategyContext(403), {
                  sma200: [500, 400, 399],
                  ao: [1, -0.1, -0.2],
               }),
            )
         ).getSignal(),
      ).toBeUndefined();
   });

   it('AwesomeOscillatorCrossZero short (close)', async () => {
      const aoCross = new AwesomeOscillatorCrossZero();

      const context = new StrategyContext({}, new Ticker('goo', 'goo', 0, 394, 0));
      context.lastSignal = 'short';

      expect(
         (
            await aoCross.period(
               new IndicatorPeriod(context, {
                  sma200: [500, 400, 399],
                  ao: [-0.1, 1, -0.2],
               }),
            )
         ).getSignal(),
      ).toBe('close');
   });

   const createStrategyContext = (price: number) => {
      return new StrategyContext({}, new Ticker('goo', 'goo', 0, price, 0));
   };
});
