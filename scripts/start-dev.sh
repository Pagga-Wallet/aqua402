#!/bin/bash

set -e

echo "Starting development environment..."

# Start infrastructure services
echo "Starting infrastructure (ClickHouse, RabbitMQ)..."
docker-compose up -d zookeeper clickhouse-1 haproxy rabbitmq

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Start backend
echo "Starting backend..."
cd backend
go run cmd/api/main.go &
BACKEND_PID=$!
cd ..

# Start frontend
echo "Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Development environment started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "To stop:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "  docker-compose down"

