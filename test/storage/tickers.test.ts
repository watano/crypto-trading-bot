import { describe, expect, it } from 'bun:test';
import moment from 'moment';
import assert from 'node:assert';
import { Ticker } from '~/src/dict/ticker';
import { Tickers } from '~/src/storage/tickers';

describe('#tickers', () => {
   it('test getting update tickers', () => {
      const tickers = new Tickers();
      const ticker = new Ticker('foobar', 'BTCUSD', 1234, 1337, 1338);

      tickers.set(ticker);
      ticker.createdAt = moment().subtract(5000, 'ms').toDate();

      assert.strictEqual(tickers.get('foobar', 'BTCUSD')?.ask, 1338);
      assert.strictEqual(tickers.getIfUpToDate('foobar', 'BTCUSD', 1000), undefined);

      assert.strictEqual(tickers.getIfUpToDate('foobar', 'BTCUSD', 7000)?.ask, 1338);
   });
});
