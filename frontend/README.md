# Executive Dashboard - Automotive Sales & Financing

This is an interactive dashboard built with React, TypeScript, Material-UI, and D3.js for visualizing automotive sales and financing data.

## Backend API (Rust)

### Start the API Server

```bash
# From the root directory
cargo run -- --serve --db-name your_database_name 3000
```

The API will be available at `http://localhost:3000`

### API Endpoints

- `GET /health` - Health check
- `GET /api/dashboard/executive` - Executive overview data

## Frontend (React + Vite)

### Install Dependencies

```bash
cd frontend
npm install
```

### Run Development Server

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## Features

- **KPI Cards**: Total revenue, average sale price, inventory, active loans
- **Revenue Trend Chart**: Monthly revenue visualization with D3.js
- **Payment Method Distribution**: Pie chart showing sales by payment method
- **Top Selling Vehicle Types**: Grid showing best-performing vehicle categories
- **Real-time Updates**: Data refreshes every 30 seconds

## Tech Stack

- **Backend**: Rust + Axum + PostgreSQL
- **Frontend**: React + TypeScript + Vite
- **UI Framework**: Material-UI
- **Data Visualization**: D3.js
- **State Management**: React Hooks

## Environment Variables

Create a `.env` file in the `frontend` directory:

```
VITE_API_URL=http://localhost:3000
```

## Development

The frontend runs on port 5173 by default and proxies API requests to the backend on port 3000.

CORS is enabled for local development.
