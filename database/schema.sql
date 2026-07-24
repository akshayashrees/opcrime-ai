-- OpCrime AI Database Schema
-- PostgreSQL

CREATE DATABASE opcrime_ai;

\c opcrime_ai;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('citizen', 'police', 'municipal', 'emergency', 'planner', 'ngo')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    city VARCHAR(50) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    area_type VARCHAR(20) NOT NULL CHECK (area_type IN ('residential', 'commercial', 'slum', 'industrial', 'mixed')),
    population_density INTEGER,
    lighting_score DOUBLE PRECISION,
    cctv_density DOUBLE PRECISION,
    patrol_frequency DOUBLE PRECISION,
    opcrime_score DOUBLE PRECISION,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crime records table
CREATE TABLE IF NOT EXISTS crime_records (
    id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
    crime_type VARCHAR(30) NOT NULL,
    crime_probability DOUBLE PRECISION,
    opcrime_score DOUBLE PRECISION,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('emergency', 'distress', 'auto')),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'responding', 'resolved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_locations_city ON locations(city);
CREATE INDEX idx_locations_coords ON locations(latitude, longitude);
CREATE INDEX idx_crime_records_location ON crime_records(location_id);
CREATE INDEX idx_crime_records_type ON crime_records(crime_type);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
