#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
MONGO_DBPATH="C:/data/db"

echo "Starting Flare Chat App..."

# Start MongoDB
echo "[1/3] Starting MongoDB..."
mongod --dbpath "$MONGO_DBPATH" --logpath "$PROJECT_DIR/mongod.log" --fork 2>/dev/null
if [ $? -ne 0 ]; then
  # --fork not supported on Windows, start in background another way
  start "" mongod --dbpath "$MONGO_DBPATH" 2>/dev/null &
  MONGO_PID=$!
  echo "MongoDB PID: $MONGO_PID"
  echo $MONGO_PID > "$PROJECT_DIR/mongod.pid"
fi
sleep 2

# Start Backend
echo "[2/3] Starting Backend (port 5000)..."
cd "$BACKEND_DIR"
node server.js > "$PROJECT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
echo $BACKEND_PID > "$PROJECT_DIR/backend.pid"
sleep 2

# Start Frontend
echo "[3/3] Starting Frontend (port 5173)..."
cd "$FRONTEND_DIR"
npm run dev > "$PROJECT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
echo $FRONTEND_PID > "$PROJECT_DIR/frontend.pid"

echo ""
echo "Flare is running!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:5000"
echo ""
echo "Run ./stop.sh to shut everything down."
