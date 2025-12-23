---
title: Interactive Filtering Demo
author: Miao Vision
date: 2024-12-10
description: Demonstration of interactive dropdown inputs and SQL template variables
---

# 🎯 Interactive Filtering Demo

This report demonstrates the **interactive input system** - the core feature that makes reports dynamic and interactive, just like Evidence.dev!

## How It Works

1. **Dropdown inputs** read data from SQL queries
2. Users select values from the dropdown
3. **Other SQL queries** use `${inputs.variable}` to reference the selected value
4. Charts and tables automatically update when the input changes

---

## 📊 Example: Sales Analysis by Region

### Step 1: Get Available Regions

First, we query all unique regions from our sales data:

```sql regions_list
SELECT * FROM (VALUES
  ('North America'),
  ('Europe'),
  ('Asia Pacific'),
  ('Latin America'),
  ('Middle East')
) AS t(region)
```

### Step 2: Create Interactive Dropdown

Now users can select a region:

```dropdown
name: selected_region
data: regions_list
value: region
title: Select a Region
placeholder: Choose a region...
defaultValue: North America
```

### Step 3: Filter Data by Selected Region

This query uses the selected region to filter sales data:

```sql regional_sales
SELECT * FROM (VALUES
  ('North America', '2024-01', 125000, 450),
  ('North America', '2024-02', 143000, 520),
  ('North America', '2024-03', 138000, 490),
  ('Europe', '2024-01', 98000, 380),
  ('Europe', '2024-02', 112000, 420),
  ('Europe', '2024-03', 105000, 395),
  ('Asia Pacific', '2024-01', 156000, 680),
  ('Asia Pacific', '2024-02', 178000, 750),
  ('Asia Pacific', '2024-03', 165000, 720),
  ('Latin America', '2024-01', 67000, 280),
  ('Latin America', '2024-02', 75000, 310),
  ('Latin America', '2024-03', 72000, 295),
  ('Middle East', '2024-01', 89000, 340),
  ('Middle East', '2024-02', 95000, 365),
  ('Middle East', '2024-03', 92000, 355)
) AS t(region, month, revenue, orders)
WHERE region = ${inputs.selected_region}
```

**Notice the SQL template variable:** `${inputs.selected_region}`

- Template variables are automatically quoted for SQL safety
- No need to add quotes manually - the system handles escaping
- This prevents SQL injection attacks

### Step 4: Display Results

#### 💰 Total Revenue

```bigvalue
query: regional_sales
value: revenue
title: Total Revenue (${inputs.selected_region})
format: currency
```

#### 📈 Revenue Trend

```chart
type: line
data: regional_sales
x: month
y: revenue
title: Revenue Trend - ${inputs.selected_region}
xLabel: Month
yLabel: Revenue ($)
```

#### 📋 Detailed Data Table

```datatable
query: regional_sales
searchable: true
sortable: true
exportable: true
columns:
  - name: month
    label: Month
    format: text
    align: left
  - name: revenue
    label: Revenue
    format: currency
    align: right
  - name: orders
    label: Orders
    format: number
    align: right
```

---

## 🎨 Advanced Example: Multi-Dimensional Filtering

### Product Categories

```sql categories_list
SELECT * FROM (VALUES
  ('Electronics'),
  ('Clothing'),
  ('Food & Beverage'),
  ('Home & Garden')
) AS t(category)
```

```dropdown
name: selected_category
data: categories_list
value: category
title: Select Product Category
defaultValue: Electronics
```

### Product Performance

```sql product_performance
SELECT * FROM (VALUES
  ('Electronics', 'Laptop', 2500, 45),
  ('Electronics', 'Phone', 800, 120),
  ('Electronics', 'Tablet', 600, 85),
  ('Clothing', 'T-Shirt', 25, 450),
  ('Clothing', 'Jeans', 60, 280),
  ('Clothing', 'Jacket', 120, 150),
  ('Food & Beverage', 'Coffee', 12, 890),
  ('Food & Beverage', 'Snacks', 8, 1200),
  ('Food & Beverage', 'Drinks', 5, 1500),
  ('Home & Garden', 'Furniture', 450, 35),
  ('Home & Garden', 'Plants', 30, 180),
  ('Home & Garden', 'Tools', 75, 95)
) AS t(category, product, price, units_sold)
WHERE category = ${inputs.selected_category}
```

### Visualization

```chart
type: bar
data: product_performance
x: product
y: units_sold
title: Units Sold by Product (${inputs.selected_category})
xLabel: Product
yLabel: Units Sold
```

```chart
type: scatter
data: product_performance
x: price
y: units_sold
title: Price vs. Units Sold (${inputs.selected_category})
xLabel: Price ($)
yLabel: Units Sold
```

---

## ✨ Key Features Demonstrated

### 1. **Dynamic Dropdown**
- ✅ Reads options from SQL query results
- ✅ Customizable title and placeholder
- ✅ Default value support

### 2. **SQL Template Variables**
- ✅ `${inputs.variable_name}` syntax
- ✅ Automatic value substitution
- ✅ Proper SQL escaping for strings

### 3. **Reactive Data Flow**
- ✅ Input changes → SQL re-execution
- ✅ SQL results → Chart updates
- ✅ BigValue displays current selection

### 4. **Component Integration**
- ✅ Works with BigValue
- ✅ Works with Charts (Bar, Line, Scatter)
- ✅ Works with DataTable

---

## 🚀 What's Next?

Planned features to complete the interactive system:

1. ✅ **Auto-Refresh** - Automatically re-execute queries when inputs change (DONE!)
2. ✅ **Button Group** - Quick selection buttons (DONE!)
3. **Date Range Input** - Select date ranges for time-series filtering
4. **Multi-Select Dropdown** - Select multiple values
5. **Input Dependencies** - One dropdown updates options in another
6. **Grid Layout** - Arrange components in responsive grids
7. **Tabs Layout** - Organize content in tabbed sections

---

## 📖 Usage Guide

### Creating a Dropdown Input

```markdown
\`\`\`dropdown
name: variable_name           # JavaScript variable name (no spaces)
data: sql_query_name          # Name of SQL query providing options
value: column_name            # Column to use as option values
label: column_name            # Column to use as option labels (optional, defaults to value)
title: Display Title          # Optional title above dropdown
placeholder: Choose...        # Optional placeholder text
defaultValue: default_value   # Optional default selection
\`\`\`
```

### Using Input Values in SQL

**Example syntax (don't execute):**
```
SELECT * FROM my_table
WHERE column = ${inputs.variable_name}
```

**Important:**
- String values are automatically quoted: `${inputs.region}` → `'North America'`
- Numbers don't need quotes: `${inputs.year}` → `2024`
- NULL is returned if input is not set
- **Don't manually add quotes** - the system handles it for you!

---

## 💡 Tips

1. **Always provide a default value** for dropdowns to avoid NULL queries
2. **Use descriptive variable names** like `selected_region` instead of `reg`
3. **Test with SQL validation** - make sure template substitution works correctly
4. **Order matters** - Define dropdowns before queries that use them

---

## 🎉 Try It Out!

1. Click "Execute Report" to run all queries
2. Use the dropdown to select different regions
3. **Watch the charts and data update automatically!** ✨
4. Try selecting different categories in the second example
5. No need to click "Execute" again - it's fully reactive!

**✅ Auto-refresh is now live!** The system automatically re-executes affected SQL queries when you change inputs.
