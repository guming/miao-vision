---
title: New Map & Image Components Demo
author: Miaoshou Vision Team
date: 2025-12-23
---

# New Map & Image Components Demo

This demo showcases the newly implemented Leaflet-based map components and the Image display component.

## Image Component

Display images with various styling options.

### Basic Image

```image
src: https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800
alt: Business Analytics Dashboard
width: 600
align: center
rounded: true
shadow: true
caption: Modern business analytics visualization
```

### Linked Image

```image
src: https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500
alt: Data Visualization
width: 400
link: https://unsplash.com
align: center
rounded: true
caption: Click to visit Unsplash
```

---

## Map Components

### Sample Data Setup

Let's create some sample geographic data for demonstration:

```sql city_locations
SELECT * FROM (VALUES
  ('San Francisco', 37.7749, -122.4194, 1000000, 'West Coast'),
  ('New York', 40.7128, -74.0060, 1500000, 'East Coast'),
  ('Los Angeles', 34.0522, -118.2437, 800000, 'West Coast'),
  ('Chicago', 41.8781, -87.6298, 600000, 'Midwest'),
  ('Miami', 25.7617, -80.1918, 400000, 'Southeast'),
  ('Seattle', 47.6062, -122.3321, 550000, 'West Coast'),
  ('Boston', 42.3601, -71.0589, 450000, 'East Coast'),
  ('Denver', 39.7392, -104.9903, 350000, 'Mountain'),
  ('Austin', 30.2672, -97.7431, 500000, 'South'),
  ('Portland', 45.5152, -122.6784, 380000, 'West Coast')
) AS t(city_name, latitude, longitude, population, region)
```

```sql us_states_data
SELECT * FROM (VALUES
  ('CA', 'California', 39500000, 'https://example.com/ca.geojson'),
  ('TX', 'Texas', 29000000, 'https://example.com/tx.geojson'),
  ('FL', 'Florida', 21500000, 'https://example.com/fl.geojson'),
  ('NY', 'New York', 19500000, 'https://example.com/ny.geojson'),
  ('PA', 'Pennsylvania', 12800000, 'https://example.com/pa.geojson'),
  ('IL', 'Illinois', 12700000, 'https://example.com/il.geojson'),
  ('OH', 'Ohio', 11700000, 'https://example.com/oh.geojson'),
  ('GA', 'Georgia', 10600000, 'https://example.com/ga.geojson'),
  ('NC', 'North Carolina', 10400000, 'https://example.com/nc.geojson'),
  ('MI', 'Michigan', 10000000, 'https://example.com/mi.geojson')
) AS t(state_code, state_name, population, geojson_url)
```

---

## 1. PointMap Component

Display individual markers on a map using latitude/longitude coordinates.

### Basic Point Map

```pointmap
query: city_locations
latitude: latitude
longitude: longitude
name: city_name
value: population
title: Major US Cities
height: 500
zoom: 4
showTooltip: true
tooltipTemplate: {name}<br>Population: {value}
```

### Point Map with Custom Zoom

```pointmap
query: city_locations
latitude: latitude
longitude: longitude
name: city_name
value: population
title: City Locations with Auto-Center
height: 400
zoom: 5
```

---

## 2. BubbleMap Component

Display proportional bubble markers where size represents a value.

### Population Bubble Map

```bubblemap
query: city_locations
latitude: latitude
longitude: longitude
size: population
name: city_name
title: US Cities by Population
colorScheme: #4287f5
minSize: 10
maxSize: 50
fillOpacity: 0.7
height: 500
zoom: 4
tooltipTemplate: <b>{name}</b><br>Population: {size}
shadow: true
rounded: true
```

### Custom Styled Bubble Map

```bubblemap
query: city_locations
latitude: latitude
longitude: longitude
size: population
name: city_name
title: City Population Distribution
colorScheme: #ff6b6b
minSize: 5
maxSize: 40
fillOpacity: 0.6
strokeColor: #ffffff
strokeWidth: 3
height: 450
```

---

## 3. AreaMap (Choropleth) Component

Display data across geographic regions with color-coded areas.

**Note**: AreaMap requires actual GeoJSON data. Below is an example of how to use it:

```areamap
query: us_states_data
areaId: state_code
value: population
areaName: state_name
geoJson: https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json
geoJsonKey: id
title: US States by Population
colorScheme: Blues
colorBuckets: 7
format: compact
height: 600
showLegend: true
legendPosition: bottomright
tooltipTemplate: {areaName}<br>Population: {formatted}
```

### Alternative Color Schemes

Available color schemes for AreaMap:
- **Sequential**: Blues, Greens, Reds, Oranges, Purples, Greys
- **Multi-hue Sequential**: YlOrRd, YlOrBr, YlGn, YlGnBu
- **Diverging**: RdYlGn, RdYlBu, RdBu, PiYG
- **Categorical**: Category10, Pastel

---

## Data Summary

```datatable
query: city_locations
searchable: true
sortable: true
```

---

## Component Features

### PointMap
- ✅ Display markers at lat/lon coordinates
- ✅ Auto-centering and bounds fitting
- ✅ Interactive tooltips
- ✅ Click popups with details
- ✅ Configurable zoom and center

### BubbleMap
- ✅ Proportional bubble sizing
- ✅ Custom color schemes
- ✅ Adjustable opacity and stroke
- ✅ Size range configuration
- ✅ Value range display

### AreaMap (Choropleth)
- ✅ 12 predefined color schemes
- ✅ GeoJSON data support
- ✅ Interactive legend
- ✅ Customizable tooltips
- ✅ Multiple bucket options

### Image
- ✅ Multiple alignment modes
- ✅ Configurable dimensions
- ✅ Fit modes (contain, cover, fill)
- ✅ Rounded corners & shadows
- ✅ Clickable with links
- ✅ Loading states
- ✅ Error handling

---

## Tips

1. **GeoJSON Data**: For AreaMap, you can use GeoJSON files from:
   - [Natural Earth Data](https://www.naturalearthdata.com/)
   - [TopoJSON](https://github.com/topojson)
   - Custom GeoJSON files

2. **Map Tiles**: Default tiles use OpenStreetMap. You can customize with:
   - `tilesUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'`
   - Or use other tile providers like Mapbox, CartoDB, etc.

3. **Performance**: For large datasets:
   - PointMap: Consider enabling clustering (future feature)
   - BubbleMap: Adjust minSize/maxSize for better visibility
   - AreaMap: Use appropriate colorBuckets (5-9 works well)

---

**Created with** 🤖 [Claude Code](https://claude.com/claude-code)
