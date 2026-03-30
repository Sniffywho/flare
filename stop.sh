#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Stopping Flare Chat App..."

# Kill by saved PIDs first
for SERVICE in backend frontend; do
  PID_FILE="$PROJECT_DIR/$SERVICE.pid"
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      echo "Stopping $SERVICE (PID $PID)..."
      kill "$PID" 2>/dev/null
    fi
    rm -f "$PID_FILE"
  fi
done

# Kill by port as fallback
echo "Releasing ports 5000 and 5173..."
for PORT in 5000 5173; do
  PID=$(netstat -ano 2>/dev/null | grep ":$PORT " | grep LISTENING | awk '{print $5}' | head -1)
  if [ -n "$PID" ]; then
    echo "Killing process on port $PORT (PID $PID)..."
    taskkill //PID "$PID" //F 2>/dev/null
  fi
done

# Stop MongoDB
echo "Stopping MongoDB..."
MONGO_PID_FILE="$PROJECT_DIR/mongod.pid"
if [ -f "$MONGO_PID_FILE" ]; then
  PID=$(cat "$MONGO_PID_FILE")
  kill "$PID" 2>/dev/null
  rm -f "$MONGO_PID_FILE"
fi
# Also try via taskkill in case it was started separately
taskkill //IM mongod.exe //F 2>/dev/null

echo ""
echo "Flare stopped."
