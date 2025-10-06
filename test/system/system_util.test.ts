import { describe, expect, it } from 'bun:test';
import assert from 'node:assert';
import { SystemUtil } from '~/src/modules/system/system_util';

describe('#system util test', () => {
   it('test configuration extraction', () => {
      const systemUtil = new SystemUtil({ root: 'test123', root2: undefined, webserver: { test: 8080 } });

      assert.equal(systemUtil.getConfig('webserver.test'), 8080);
      assert.equal(systemUtil.getConfig('root'), 'test123');
      assert.equal(systemUtil.getConfig('UNKONWN', 'test'), 'test');
      assert.equal(systemUtil.getConfig('UNKONWN'), undefined);
      assert.equal(systemUtil.getConfig('root2', 'test'), 'test');
   });
});
