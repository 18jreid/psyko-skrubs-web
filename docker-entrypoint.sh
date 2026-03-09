#!/bin/sh
set -e

echo "Running DB migrations..."
node /app/migrate.js

echo "Starting Next.js server..."
exec node server.js
