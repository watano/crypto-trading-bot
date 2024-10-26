import { describe, expect, it } from 'bun:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { convertPeriodToMinute, resampleMinutes } from '~/src/utils/resample';

describe('#resample of candles', () => {
   it('should resample 1 hour candles', () => {
      const candles = resampleMinutes(createCandleFixtures(), 60);

      const firstFullCandle = candles[1];

      assert.strictEqual(firstFullCandle._candle_count, 12);

      assert.strictEqual(firstFullCandle.time, 1533142800);
      assert.strictEqual(firstFullCandle.open, 7600);
      assert.strictEqual(firstFullCandle.high, 7609.5);
      assert.strictEqual(firstFullCandle.low, 7530);
      assert.strictEqual(firstFullCandle.close, 7561.5);
      assert.strictEqual(firstFullCandle.volume, 174464214);

      assert.strictEqual(candles[2].time, 1533139200);
   });

   it('should resample 15m candles', () => {
      const candles = resampleMinutes(createCandleFixtures(), 15);

      const firstFullCandle = candles[1];

      assert.strictEqual(firstFullCandle._candle_count, 3);

      assert.strictEqual(firstFullCandle.time, 1533142800);
      assert.strictEqual(firstFullCandle.open, 7547.5);
      assert.strictEqual(firstFullCandle.high, 7562);
      assert.strictEqual(firstFullCandle.low, 7530);
      assert.strictEqual(firstFullCandle.close, 7561.5);
      assert.strictEqual(firstFullCandle.volume, 45596804);

      assert.strictEqual(candles[2].time, 1533141900);
   });

   it('should format period based on unit', () => {
      assert.strictEqual(convertPeriodToMinute('15m'), 15);
      assert.strictEqual(convertPeriodToMinute('30M'), 30);
      assert.strictEqual(convertPeriodToMinute('1H'), 60);
      assert.strictEqual(convertPeriodToMinute('2h'), 120);
      assert.strictEqual(convertPeriodToMinute('1w'), 10080);
      assert.strictEqual(convertPeriodToMinute('2w'), 20160);
      assert.strictEqual(convertPeriodToMinute('1y'), 3679200);
   });

   it('test that resample starting time is matching given candle lookback', () => {
      const candles: any[] = [];

      // 2014-02-27T09:30:00.000Z
      const start = 1393493400;

      for (let i = 1; i < 23; i++) {
         candles.push({
            time: start - 15 * i * 60,
            volume: i * 100,
            open: i * 2,
            close: i * 2.1,
            high: i * 1.1,
            low: i * 0.9,
         });
      }

      const resampleCandles = resampleMinutes(candles, 60);

      assert.strictEqual(new Date(resampleCandles[0].time * 1000).getUTCHours(), 10);

      const firstFullCandle = resampleCandles[1];
      assert.strictEqual(firstFullCandle._candle_count, 4);
      assert.strictEqual(firstFullCandle.time, 1393491600);

      assert.strictEqual(resampleCandles.length, 6);

      assert.strictEqual(resampleCandles[0].time, 1393495200);
      assert.strictEqual(resampleCandles[4].time, 1393480800);
      assert.strictEqual(resampleCandles[4]._candle_count, 4);
   });

   function createCandleFixtures() {
      return JSON.parse(fs.readFileSync(`${__dirname}/fixtures/xbt-usd-5m.json`, 'utf8'));
   }
});
