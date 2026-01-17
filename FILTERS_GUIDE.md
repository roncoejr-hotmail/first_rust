# Dashboard Filters & Search Guide

## Overview
Advanced filtering and search capabilities have been added to the automotive sales analytics platform.

## Features Implemented

### 1. **Date Range Filtering**
- **Component**: `DateRangePicker.tsx`
- **Features**:
  - Custom start/end date selection
  - Quick presets: Last 7 Days, Last 30 Days, Last Quarter, Last Year, All Time
  - Apply button for manual date entry
- **Used in**: Executive Dashboard, Sales Performance, Inventory Dashboard

### 2. **Advanced Filter Panel**
- **Component**: `FilterPanel.tsx`
- **Features**:
  - Collapsible filter panel
  - Active filter count badge
  - Multiple filter types:
    - Text search (VIN, make, model)
    - Vehicle type multi-select
    - Status multi-select
    - Employee dropdown
  - Chip display for selected filters

### 3. **Backend API Filters**

#### Executive Dashboard (`/api/dashboard/executive`)
**Query Parameters**:
- `start_date` (YYYY-MM-DD): Filter sales from this date
- `end_date` (YYYY-MM-DD): Filter sales until this date

**Example**:
```
GET /api/dashboard/executive?start_date=2023-01-01&end_date=2023-12-31
```

#### Sales Performance Dashboard (`/api/dashboard/sales-performance`)
**Query Parameters**:
- `start_date` (YYYY-MM-DD): Filter sales from this date
- `end_date` (YYYY-MM-DD): Filter sales until this date
- `vehicle_type` (string): Filter by vehicle type (Sedan, SUV, Truck, etc.)
- `employee_id` (number): Filter by specific salesperson

**Example**:
```
GET /api/dashboard/sales-performance?start_date=2023-01-01&end_date=2023-12-31&vehicle_type=SUV&employee_id=5
```

#### Inventory Dashboard (`/api/dashboard/inventory`)
**Query Parameters**:
- `start_date` (YYYY-MM-DD): Filter vehicles acquired from this date
- `end_date` (YYYY-MM-DD): Filter vehicles acquired until this date
- `vehicle_type` (string): Filter by vehicle type
- `status` (string): Filter by status (available, sold)
- `search` (string): Search by VIN, make, or model (case-insensitive)

**Example**:
```
GET /api/dashboard/inventory?start_date=2023-01-01&status=available&search=toyota
```

## Usage Examples

### Executive Dashboard
```typescript
// Default: Last 30 days
const data = await fetchExecutiveOverview({
  start_date: '2023-11-01',
  end_date: '2023-11-30'
});
```

### Sales Performance Dashboard
```typescript
// Filter SUV sales by specific employee
const data = await fetchSalesPerformance({
  start_date: '2023-01-01',
  end_date: '2023-12-31',
  vehicle_type: 'SUV',
  employee_id: 5
});
```

### Inventory Dashboard
```typescript
// Search for available Toyotas
const data = await fetchInventoryOverview({
  status: 'available',
  search: 'toyota'
});
```

## Implementation Details

### Backend (Rust)
- Filter structs defined in `src/api.rs`:
  - `DateRangeFilter`
  - `SalesFilters`
  - `InventoryFilters`
- Dynamic SQL query building with WHERE clauses
- SQL injection protection through parameterized queries

### Frontend (React/TypeScript)
- Filter state management with `useState`
- Automatic data reload on filter change with `useEffect`
- URL query parameter construction
- Type-safe filter interfaces

## How to Extend

### Adding Filters to Other Dashboards

1. **Backend** (`src/api.rs`):
```rust
#[derive(Debug, Deserialize)]
pub struct YourFilters {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    // Add more fields
}

async fn your_handler(
    State(state): State<Arc<AppState>>,
    Query(filters): Query<YourFilters>,
) -> Result<Json<YourData>, (StatusCode, String)> {
    // Build filter SQL
    let mut conditions = Vec::new();
    if let Some(start) = &filters.start_date {
        conditions.push(format!("date_field >= '{}'", start));
    }
    let filter_sql = if !conditions.is_empty() {
        format!("WHERE {}", conditions.join(" AND "))
    } else {
        String::new()
    };
    
    // Use in queries
    let query = format!("SELECT * FROM table {}", filter_sql);
    // ...
}
```

2. **Frontend API** (`frontend/src/api/yourapi.ts`):
```typescript
export interface YourFilterParams {
  start_date?: string;
  end_date?: string;
}

export async function fetchYourData(params?: YourFilterParams): Promise<YourData> {
  let url = `${API_BASE_URL}/api/dashboard/your-endpoint`;
  
  if (params) {
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
  }
  
  const response = await fetch(url);
  return response.json();
}
```

3. **Frontend Component** (`frontend/src/pages/YourDashboard.tsx`):
```typescript
import DateRangePicker from '../components/DateRangePicker';
import FilterPanel from '../components/FilterPanel';

export default function YourDashboard() {
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());
  
  const loadData = async () => {
    const result = await fetchYourData({ start_date: startDate, end_date: endDate });
    setData(result);
  };
  
  useEffect(() => {
    loadData();
  }, [startDate, endDate]);
  
  return (
    <Box>
      <DateRangePicker 
        startDate={startDate} 
        endDate={endDate} 
        onDateChange={(start, end) => { setStartDate(start); setEndDate(end); }} 
      />
      {/* Your dashboard content */}
    </Box>
  );
}
```

## Testing

### Backend
```bash
# Test with curl
curl "http://localhost:3000/api/dashboard/executive?start_date=2023-01-01&end_date=2023-12-31"
curl "http://localhost:3000/api/dashboard/inventory?status=available&search=toyota"
```

### Frontend
1. Open dashboard in browser
2. Use date range presets (Last 7D, Last 30D, etc.)
3. Enter custom date ranges
4. Use search box for inventory
5. Select filters from dropdowns
6. Verify data updates automatically

## Performance Considerations
- Filters are applied at the database level (SQL WHERE clauses)
- Indexes on date columns recommended for large datasets
- Search uses ILIKE for case-insensitive matching (PostgreSQL)
- Frontend debouncing can be added for search input if needed

## Future Enhancements
- [ ] Export filtered data to CSV/PDF
- [ ] Save filter presets
- [ ] URL state persistence (filters in URL params)
- [ ] Date range validation
- [ ] Loading states during filter changes
- [ ] Filter reset button
- [ ] Advanced search operators (AND/OR)
