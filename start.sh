#!/usr/bin/env bash
# Startup wrapper for gastro-pistazz
# Kills any leftover process on port 3003 before starting next start.
# PM2 should use this as the script.

cd /home/marcio/gastro-pistazz

# Kill any process already holding port 3003
fuser -k 3003/tcp 2>/dev/null || true
sleep 1

export NODE_ENV=production
export PORT=3003

exec ./node_modules/.bin/next start -p 3003
