set shell := ["cmd.exe", "/c"]
set dotenv-load := true

cmd_ts :="bun"
cmd_cp :="coreutils cp"
cmd_rm :="coreutils rm -rf"
cmd_db :="daCmd db"
#cmd_esbuild := "bun build --target=node"
cmd_esbuild := "npx esbuild --bundle --platform=node"
cmd_usql :="usql sq:./data/daTradingPlus.db -q"
duckdb_main:="./data/daTradingPlus.duckdb"
DBFile:="./data/daTradingPlus.db"

default: help

help:
   just -l
# run test
test case="exchange/utils/order_bag":
   bun test --timeout 6000000 --watch ./test/{{case}}.test.ts

# check codes
check:
   bunx tsc --noEmit --skipLibCheck
   biome check src --write
   biome check test --write
   ::just --fmt --unstable

# run debug
debug:
  node --version

# run dev
build:
  node --version

# create new address PK
newkey start="111":
  cast wallet vanity --starts-with {{start}}

sqldef_pull id="daTradingPlus":
  @echo sqlite3def /export %DBFile%
  sqlite3def --export {{DBFile}} > ./data/{{id}}.sql
sqldef_push id="daTradingPlus":
  sqlite3def --dry-run -f ./data/{{id}}.sql {{DBFile}}
db_sql file="newAccounts8" day="0530":
  cp {{DBFile}} ./data/daTradingPlus_{{day}}.db
  cd data && usql -f {{file}}.sql ./daTradingPlus.db
db_bk table="action_log" ext="order by id":
  #!/bin/bash
  usql -c "select * from {{table}} {{ext}}" -C -o ./data/csv/{{table}}.csv {{DBFile}}
db_fix:
  ::sqlite3 ./data/daTradingPlus1020.db ".dump" > daTradingPlus1020.sql
  rm -rf {{DBFile}}
  sqlite3 {{DBFile}} < daTradingPlus1020.sql
test_all:
  cls
  bun test --timeout 6000000 ./test/dict/order.test.ts
  bun test --timeout 6000000 ./test/exchange/utils/order_bag.test.ts
  bun test --timeout 6000000 ./test\storage\tickers.test.ts
  bun test --timeout 6000000 ./test\system\system_util.test.ts
  bun test --timeout 6000000 ./test\utils\order_util.test.ts
  bun test --timeout 6000000 ./test\utils\resample.test.ts
  bun test --timeout 6000000 ./test\utils\technical_analysis_validator.test.ts
  bun test --timeout 6000000 ./test\exchange\binance_futures.test.ts
  bun test --timeout 6000000 ./test\exchange\binance_margin.test.ts
  bun test --timeout 6000000 ./test\exchange\binance.test.ts
  bun test --timeout 6000000 ./test\modules\exchange\exchange_candle_combine.test.ts
  bun test --timeout 6000000 ./test\modules\exchange\exchange_manager.test.ts
  bun test --timeout 6000000 ./test\modules\exchange\exchange_position_watcher.test.ts
  bun test --timeout 6000000 ./test\modules\listener\exchange_order_watchdog_listener.test.ts
  bun test --timeout 6000000 ./test\modules\listener\tick_listener.test.ts
  bun test --timeout 6000000 ./test\modules\order\order_calculator.test.ts
  bun test --timeout 6000000 ./test\modules\order\order_executor.test.ts
  bun test --timeout 6000000 ./test\modules\order\risk_reward_ratio_calculator.test.ts
  bun test --timeout 6000000 ./test\modules\order\stop_loss_calculator.test.ts
  bun test --timeout 6000000 ./test\modules\pairs\pair_state_execution.test.ts
  bun test --timeout 6000000 ./test\modules\pairs\pair_state_manager.test.ts
  bun test --timeout 6000000 ./test\modules\strategy\dict\indicator_period.test.ts
  bun test --timeout 6000000 ./test\modules\strategy\dict\signal_result.test.ts
  bun test --timeout 6000000 ./test\modules\strategy\strategies\awesome_oscillator_cross_zero.test.ts
  bun test --timeout 6000000 ./test\modules\strategy\strategies\cci.test.ts
  bun test --timeout 6000000 ./test\modules\strategy\strategies\obv_pump_dump.test.ts
  bun test --timeout 6000000 ./test\modules\strategy\strategies\strategy_manager.test.ts

