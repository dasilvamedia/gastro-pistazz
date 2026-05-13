-- Migration: Enable Supabase Realtime for instant postgres_changes events
-- Run ONCE in the Supabase SQL Editor (Database → SQL Editor).
-- This enables the postgres_changes subscription on the restaurants table
-- so all connected clients receive updates immediately when a restaurant is saved.

ALTER PUBLICATION supabase_realtime ADD TABLE restaurants;
ALTER PUBLICATION supabase_realtime ADD TABLE deals;
