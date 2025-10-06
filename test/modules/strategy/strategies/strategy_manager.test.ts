import { describe, expect, it } from 'bun:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { StrategyContext } from '~/src/dict/strategy_context';
import { Ticker } from '~/src/dict/ticker';
import { StrategyManager } from '~/src/modules/strategy/strategy_manager';
import { TechnicalAnalysisValidator } from '~/src/utils/technical_analysis_validator';

// FIXME
describe('#strategy manager', () => {
   it('strategy cci', async () => {
      const strategyManager = new StrategyManager(createTechnicalAnalysisValidator(), createCandlestickRepository());
      const result: any = await strategyManager.executeStrategy('cci', createStrategyContext(), 'foobar', 'BTCUSD', { period: '15m' });
      assert.equal(undefined, result.signal);
   });

   it.skip('strategy macd', async () => {
      const strategyManager = new StrategyManager(createTechnicalAnalysisValidator(), createCandlestickRepository());
      const result: any = await strategyManager.executeStrategy('macd', createStrategyContext(), 'foobar', 'BTCUSD', { period: '15m' });
      assert.equal(undefined, result.signal);
   });

   let createCandlestickRepository = () => {
      return {
         async fetchCombinedCandles(exchange: any) {
            return { [exchange]: createCandleFixtures() };
         },
      };
   };

   let createCandleFixtures = () => {
      return JSON.parse(fs.readFileSync(`${__dirname}/../../../utils/fixtures/xbt-usd-5m.json`, 'utf8'));
   };

   let createStrategyContext = () => {
      return new StrategyContext({}, new Ticker('goo', 'goo', 0, 6000, 6000));
   };

   let createTechnicalAnalysisValidator = () => {
      const technicalAnalysisValidator = new TechnicalAnalysisValidator();

      technicalAnalysisValidator.isValidCandleStickLookback = () => true;

      return technicalAnalysisValidator;
   };
});
