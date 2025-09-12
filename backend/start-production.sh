#!/bin/bash

echo "🚀 Starting CCMIS Production Server..."

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    echo "   On macOS: brew services start postgresql"
    echo "   On Ubuntu: sudo systemctl start postgresql"
    exit 1
fi

# Check if database exists
if ! psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo "📊 Creating database..."
    createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
fi

# Seed database if needed
echo "🌱 Seeding database..."
node src/database/seed-production.js

# Start production server
echo "🚀 Starting production server..."
node src/server-production.js
