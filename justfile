set shell := ["cmd.exe", "/c"]
set dotenv-load := true

cmd_ts :="bun"
cmd_cp :="coreutils cp"
cmd_rm :="coreutils rm -rf"
cmd_db :="daCmd db"
cmd_usql :="usql sq:./data/daTradingPlus.db -q"
duckdb_main:="./data/daTradingPlus.duckdb"
DBFile:="./data/daTradingPlus.db"

default: help

help:
   just -l
check:
  dprint fmt
  bunx tsc --noEmit --skipLibCheck
  biome lint --fix
  oxlint --fix
# build all codes
build:
  ::bun build --target=bun --minify --outfile=../ritmex/ritmex-bot.js ./index.ts
# run test
test case="test/exchange/utils/order_bag.test.ts":
   bun test --timeout 6000000 --watch {{case}}
# run debug
debug:
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
  bun test --timeout 6000000

