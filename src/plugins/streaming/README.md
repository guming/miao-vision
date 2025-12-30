# Streaming Data Plugin

Real-time data streaming plugin for miaoshou-vision using DuckDB-WASM and Observable Plot.

## Features

- **High-Performance Streaming**: Efficient batched data ingestion with DuckDB-WASM
- **Sliding Window**: Automatic management of data retention (keep only latest N rows)
- **Auto-Flush**: Smart buffering with automatic and manual flush options
- **Reactive Updates**: Subscribe to data changes and automatically update visualizations
- **Memory Efficient**: Columnar storage with DuckDB for minimal memory footprint

## Architecture

### StreamingTable

Core class that manages real-time data streaming to DuckDB.

```typescript
import { StreamingTable } from '@plugins/streaming'

// Create a streaming table
const metricsTable = new StreamingTable(
  'realtime_metrics',          // Table name
  {                             // Schema definition
    timestamp: 'TIMESTAMP',
    cpu: 'DOUBLE',
    memory: 'DOUBLE'
  },
  {                             // Options
    maxRows: 1000,              // Keep only latest 1000 rows
    autoFlush: true,            // Auto-flush when buffer reaches threshold
    updateInterval: 100         // Batch flush every 100ms (0 = manual flush)
  }
)

// Add data
metricsTable.update({
  timestamp: new Date(),
  cpu: 45.2,
  memory: 8.5
})

// Subscribe to updates
const unsubscribe = metricsTable.subscribe(() => {
  console.log('Data updated!')
})

// Manual flush
await metricsTable.flush()

// Query data
const data = await metricsTable.query(`
  SELECT * FROM realtime_metrics
  WHERE timestamp > NOW() - INTERVAL 1 MINUTE
`)

// Cleanup
metricsTable.destroy()
```

### StreamingLineChart

Svelte component for real-time line chart visualization.

```svelte
<script>
  import { StreamingTable } from '@plugins/streaming'
  import StreamingLineChart from '@plugins/streaming/StreamingLineChart.svelte'

  const table = new StreamingTable('metrics', {
    timestamp: 'TIMESTAMP',
    value: 'DOUBLE'
  })

  // Simulate streaming data
  setInterval(() => {
    table.update({
      timestamp: new Date(),
      value: Math.random() * 100
    })
  }, 100)
</script>

<StreamingLineChart
  {table}
  xField="timestamp"
  yField="value"
  title="Real-time Metrics"
  color="#4285F4"
  windowSize={100}
  height={300}
/>
```

## Configuration Options

### StreamingTableOptions

```typescript
interface StreamingTableOptions {
  maxRows?: number        // Sliding window size (default: unlimited)
  updateInterval?: number // Batch flush interval in ms (default: 0 = manual)
  autoFlush?: boolean     // Auto-flush when buffer threshold reached (default: true)
  primaryKey?: string     // Primary key for upsert behavior (default: append)
}
```

### StreamingLineChart Props

```typescript
interface Props {
  table: StreamingTable   // StreamingTable instance
  xField: string          // X-axis field name
  yField: string          // Y-axis field name
  title?: string          // Chart title
  windowSize?: number     // Show last N points (default: 100)
  color?: string          // Line color (default: '#4285F4')
  height?: number         // Chart height in pixels (default: 300)
}
```

## Performance Tips

1. **Batching**: Use `updateInterval` to batch updates instead of flushing on every data point
2. **Buffer Threshold**: The default auto-flush threshold is 100 rows - tune based on your data rate
3. **Sliding Window**: Use `maxRows` to limit memory usage for long-running streams
4. **Query Optimization**: Use WHERE clauses and LIMIT when querying large tables

## Example: Multiple Metrics Dashboard

```svelte
<script>
  import { StreamingTable } from '@plugins/streaming'
  import StreamingLineChart from '@plugins/streaming/StreamingLineChart.svelte'

  // Create tables for different metrics
  const cpuTable = new StreamingTable('cpu_metrics', {
    timestamp: 'TIMESTAMP',
    value: 'DOUBLE'
  }, { maxRows: 100 })

  const memoryTable = new StreamingTable('memory_metrics', {
    timestamp: 'TIMESTAMP',
    value: 'DOUBLE'
  }, { maxRows: 100 })

  // Simulate real-time data
  setInterval(() => {
    const now = new Date()
    cpuTable.update({ timestamp: now, value: Math.random() * 100 })
    memoryTable.update({ timestamp: now, value: Math.random() * 16 })
  }, 100)
</script>

<div class="dashboard">
  <StreamingLineChart
    table={cpuTable}
    xField="timestamp"
    yField="value"
    title="CPU Usage (%)"
    color="#4285F4"
  />

  <StreamingLineChart
    table={memoryTable}
    xField="timestamp"
    yField="value"
    title="Memory Usage (GB)"
    color="#34A853"
  />
</div>
```

## Demo

See `/src/components/StreamingDemo.svelte` for a complete working example with:
- Multiple streaming tables
- Real-time visualization
- Start/stop controls
- Frequency adjustment
- Data statistics

Access the demo at: **http://localhost:5173** → Click **🔴 Streaming** tab

## Implementation Details

### Data Flow

```
Data Source → StreamingTable.update()
  ↓
Buffer (array)
  ↓
Auto-flush or Manual flush
  ↓
DuckDB INSERT via SQL
  ↓
Apply sliding window (DELETE old rows)
  ↓
Notify subscribers
  ↓
StreamingLineChart.loadData()
  ↓
Query DuckDB
  ↓
Render with Observable Plot
```

### Comparison with Perspective

| Feature | Perspective | miaoshou-vision Streaming |
|---------|-------------|---------------------------|
| Core Engine | C++ → WASM | DuckDB-WASM |
| Data Format | Apache Arrow | SQL + Arrow (via DuckDB) |
| Update Mechanism | Table.update() + Views | StreamingTable + Subscribers |
| Visualization | Custom WebGL | Observable Plot |
| Memory Management | Native + GC | DuckDB columnar + sliding window |
| Deployment | Standalone or Server | Browser-only |

### Advantages

1. **Integrated with DuckDB**: Leverage existing DuckDB setup, no additional runtime
2. **SQL Queries**: Full SQL support for data transformation
3. **Simpler**: No need for WebWorkers or complex View system
4. **Observable Plot**: Declarative visualization with extensive customization

### Limitations

1. **No WebWorker**: Heavy computations run on main thread (could be added)
2. **No Built-in Pivoting**: Would need to implement via SQL GROUP BY
3. **Manual Visualization**: Need to create charts explicitly (Perspective has built-in UI)

## Future Enhancements

- [ ] WebWorker support for background processing
- [ ] Apache Arrow IPC Stream format for better performance
- [ ] More chart types (bar, scatter, heatmap)
- [ ] Data aggregation helpers (windowed aggregates, rollups)
- [ ] WebSocket integration for server-side streaming
- [ ] Time-series specific optimizations

## License

Same as parent project
