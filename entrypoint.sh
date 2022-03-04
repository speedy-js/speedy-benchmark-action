#!/bin/sh

export HOME=/root
set -eu # stop on error
cd /usr/src/app/

# Init Benchmark repositories
rm -rf benchmarks
git clone https://github.com/speedy-js/examples.git benchmarks

pnpm action-start