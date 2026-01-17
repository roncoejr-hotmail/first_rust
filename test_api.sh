#!/bin/bash

# Simple script to test the API server

echo "Building project..."
cargo build --release

echo ""
echo "Starting server in background..."
cargo run --release -- --serve --db-name automotive_sales --port 3000 &
SERVER_PID=$!

echo "Server PID: $SERVER_PID"
echo "Waiting 3 seconds for server to start..."
sleep 3

echo ""
echo "Testing health endpoint..."
curl -s http://localhost:3000/health
echo ""

echo ""
echo "Testing executive dashboard endpoint..."
curl -s http://localhost:3000/api/dashboard/executive | jq '.' || curl -s http://localhost:3000/api/dashboard/executive
echo ""

echo ""
echo "Stopping server..."
kill $SERVER_PID

echo "Done!"
