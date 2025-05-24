#!/bin/sh
set -e

# Build flags for ponder
PONDER_FLAGS=""

if [ -n "$LOG_LEVEL" ]; then
    PONDER_FLAGS="$PONDER_FLAGS --log-level $LOG_LEVEL"
fi

if [ -n "$LOG_FORMAT" ]; then
    PONDER_FLAGS="$PONDER_FLAGS --log-format $LOG_FORMAT"
fi

# Execute with proper npm flag passing
if [ -n "$PONDER_FLAGS" ]; then
    exec npm run start -- $PONDER_FLAGS
else
    exec npm run start
fi
