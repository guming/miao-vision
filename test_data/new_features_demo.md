---
title: New Features Demo - Color Scale, Icon Sets, Export
---

# New Features Demo

This demo showcases the newly implemented features:
- **Color Scale** - Automatic gradient coloring based on values
- **Icon Sets** - Visual indicators for value categories
- **Excel Export** - Export data to Excel format
- **Tabs Component** - (Tab content requires additional markdown parser support)

---

## 1. Color Scale Demo

Color scales automatically apply gradient colors based on cell values.

### Sales Performance Data

```sql color_scale_data
SELECT * FROM (VALUES
  ('Alice', 'North', 125000, 21.6, 45),
  ('Bob', 'South', 143000, 19.6, 52),
  ('Carol', 'East', 98000, 16.3, 38),
  ('David', 'West', 167000, 23.4, 61),
  ('Eve', 'North', 134000, 23.9, 48),
  ('Frank', 'South', 89000, 15.2, 32),
  ('Grace', 'East', 178000, 25.1, 65),
  ('Henry', 'West', 112000, 18.7, 41)
) AS t(rep, region, revenue, margin, deals)
```

### Red-Green Color Scale (Low=Red, High=Green)

```datatable
query: color_scale_data
sortable: true
exportable: true
summaryRow: true
columns:
  - name: rep
    label: Sales Rep
  - name: region
    label: Region
  - name: revenue
    label: Revenue
    format: currency
    align: right
    summary: sum
    colorScale:
      type: red-green
  - name: margin
    label: Margin %
    format: percent
    align: right
    summary: avg
    colorScale:
      type: red-green
  - name: deals
    label: Deals
    format: number
    align: center
    summary: sum
    colorScale:
      type: white-blue
```

### Other Color Scale Types

```datatable
query: color_scale_data
sortable: true
columns:
  - name: rep
    label: Sales Rep
  - name: revenue
    label: Revenue (Blue-White-Red)
    format: currency
    align: right
    colorScale:
      type: blue-white-red
  - name: margin
    label: Margin (Red-Yellow-Green)
    format: percent
    align: right
    colorScale:
      type: red-yellow-green
  - name: deals
    label: Deals (Green-Red)
    format: number
    align: center
    colorScale:
      type: green-red
```

---

## 2. Icon Sets Demo

Icon sets display visual indicators (arrows, flags, etc.) based on value thresholds.

### Performance Metrics Data

```sql icon_set_data
SELECT * FROM (VALUES
  ('Product A', 95000, 4.8, 23.5, 89),
  ('Product B', 78000, 4.2, 18.2, 72),
  ('Product C', 112000, 4.9, 28.1, 95),
  ('Product D', 65000, 3.8, 15.3, 58),
  ('Product E', 89000, 4.5, 21.0, 82),
  ('Product F', 45000, 3.2, 12.1, 45),
  ('Product G', 134000, 4.7, 31.2, 91),
  ('Product H', 72000, 4.0, 16.8, 65)
) AS t(product, revenue, rating, growth, satisfaction)
```

### Arrow Icons (↓ → ↑)

```datatable
query: icon_set_data
sortable: true
summaryRow: true
columns:
  - name: product
    label: Product
  - name: revenue
    label: Revenue
    format: currency
    align: right
    summary: sum
    iconSet:
      type: arrows
  - name: growth
    label: Growth %
    format: percent
    align: right
    summary: avg
    iconSet:
      type: arrows
```

### Trend Icons (▼ – ▲)

```datatable
query: icon_set_data
sortable: true
columns:
  - name: product
    label: Product
  - name: rating
    label: Rating
    format: number
    align: center
    iconSet:
      type: trend
  - name: satisfaction
    label: Satisfaction
    format: number
    align: center
    iconSet:
      type: trend
```

### Flag Icons (🔴 🟡 🟢)

```datatable
query: icon_set_data
sortable: true
columns:
  - name: product
    label: Product
  - name: revenue
    label: Revenue
    format: currency
    align: right
    iconSet:
      type: flags
  - name: satisfaction
    label: Satisfaction
    format: number
    align: center
    iconSet:
      type: flags
```

### Symbol Icons (✕ ● ✓)

```datatable
query: icon_set_data
sortable: true
columns:
  - name: product
    label: Product
  - name: growth
    label: Growth %
    format: percent
    align: right
    iconSet:
      type: symbols
  - name: rating
    label: Rating
    format: number
    align: center
    iconSet:
      type: symbols
```

---

## 3. Combined Features Demo

### All Features Combined

```sql combined_demo
SELECT * FROM (VALUES
  ('Jan 2024', 'Electronics', 245000, 32.5, 4.7, 156),
  ('Jan 2024', 'Clothing', 128000, 28.1, 4.2, 89),
  ('Jan 2024', 'Home', 89000, 22.3, 3.9, 67),
  ('Feb 2024', 'Electronics', 267000, 35.2, 4.8, 172),
  ('Feb 2024', 'Clothing', 142000, 30.5, 4.4, 98),
  ('Feb 2024', 'Home', 95000, 24.1, 4.1, 71),
  ('Mar 2024', 'Electronics', 289000, 38.1, 4.9, 185),
  ('Mar 2024', 'Clothing', 156000, 32.8, 4.5, 108),
  ('Mar 2024', 'Home', 102000, 26.5, 4.3, 78)
) AS t(month, category, revenue, margin, rating, orders)
```

```datatable
query: combined_demo
filterable: true
searchable: true
sortable: true
exportable: true
summaryRow: true
selectable: true
columnSelector: true
columns:
  - name: month
    label: Month
  - name: category
    label: Category
  - name: revenue
    label: Revenue
    format: currency
    align: right
    summary: sum
    colorScale:
      type: red-green
  - name: margin
    label: Margin %
    format: percent
    align: right
    summary: avg
    iconSet:
      type: trend
  - name: rating
    label: Rating
    format: number
    align: center
    summary: avg
    iconSet:
      type: flags
  - name: orders
    label: Orders
    format: number
    align: center
    summary: sum
    showDataBar: true
```

---

## 4. Excel Export Test

Click the **Export** dropdown and select **Excel** to download the data as an `.xlsx` file.

```sql export_test_data
SELECT * FROM (VALUES
  (1, 'Alice Johnson', 'Engineering', 85000, '2022-03-15'),
  (2, 'Bob Smith', 'Marketing', 72000, '2021-08-20'),
  (3, 'Carol Williams', 'Sales', 91000, '2020-01-10'),
  (4, 'David Brown', 'Engineering', 95000, '2019-06-05'),
  (5, 'Eve Davis', 'HR', 68000, '2023-02-28')
) AS t(id, name, department, salary, hire_date)
```

```datatable
query: export_test_data
sortable: true
exportable: true
searchable: true
columns:
  - name: id
    label: ID
    align: center
  - name: name
    label: Full Name
  - name: department
    label: Department
  - name: salary
    label: Salary
    format: currency
    align: right
    colorScale:
      type: white-blue
  - name: hire_date
    label: Hire Date
    format: date
```

### Export Features

- **CSV Export**: Download as comma-separated values
- **Excel Export**: Download as `.xlsx` with proper formatting
- Auto-calculated column widths in Excel
- Exports only visible (filtered) data

---

## 5. Tabs Component (Basic)

The tabs component shows tab headers. Tab content blocks require additional markdown parser support.

```tabs
- Overview
- Sales Data
- Performance
```

```tabs
variant: pills
- Monthly
- Quarterly
- Yearly
```

```tabs
variant: underline
fullWidth: true
- Products
- Customers
- Regions
```

---

## Test Checklist

### Color Scale
- [ ] Red-Green scale: red for low, green for high
- [ ] Green-Red scale: green for low, red for high
- [ ] Red-Yellow-Green: three-color gradient
- [ ] Blue-White-Red: diverging scale
- [ ] White-Blue: intensity scale
- [ ] Colors update after filtering/sorting

### Icon Sets
- [ ] Arrows: ↓ (low), → (mid), ↑ (high)
- [ ] Trend: ▼ (low), – (mid), ▲ (high)
- [ ] Flags: 🔴 (low), 🟡 (mid), 🟢 (high)
- [ ] Symbols: ✕ (low), ● (mid), ✓ (high)
- [ ] Icons colored appropriately
- [ ] Values shown alongside icons

### Excel Export
- [ ] Export dropdown shows CSV and Excel options
- [ ] CSV downloads correctly
- [ ] Excel (.xlsx) downloads correctly
- [ ] Column widths auto-adjusted
- [ ] Data formatted properly

### Tabs Component
- [ ] Default tabs display correctly
- [ ] Pills variant shows rounded buttons
- [ ] Underline variant shows bottom border

---

## Configuration Reference

### Color Scale Options

```yaml
colorScale:
  type: red-green | green-red | red-yellow-green | blue-white-red | white-blue
  min: 0               # Optional: manual minimum value
  max: 100             # Optional: manual maximum value
```

### Icon Set Options

```yaml
iconSet:
  type: arrows | trend | rating | flags | symbols
  thresholds: [33, 67] # Percentile thresholds [low, high]
  showValue: true      # Show value alongside icon
```

### Tabs Configuration

```yaml
tabs:
  variant: default | pills | underline
  defaultTab: 0        # Zero-based tab index
  fullWidth: false     # Stretch tabs to full width
```
