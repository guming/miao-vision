---
title: Sales Analysis Report 2024
author: Data Team
date: 2024-12-08
---

# Sales Analysis Report 2024

**Author**: Data Team
**Date**: 2024-12-08

## Executive Summary

This report provides a comprehensive analysis of sales performance across different regions, products, and categories for the year 2024.

## Key Metrics

```sql total_revenue
SELECT
  SUM(revenue) as total_revenue,
  SUM(profit) as total_profit,
  COUNT(*) as total_orders
FROM sales_data
```

```bigvalue
query: total_revenue
value: total_revenue
title: Total Revenue
format: currency
```

```bigvalue
query: total_revenue
value: total_profit
title: Total Profit
format: currency
```

```bigvalue
query: total_revenue
value: total_orders
title: Total Orders
format: number
```

## Sales by Category

```sql category_summary
SELECT
  category,
  COUNT(*) as orders,
  SUM(quantity) as total_quantity,
  SUM(revenue) as total_revenue,
  SUM(profit) as total_profit,
  AVG(margin) as avg_margin
FROM sales_data
GROUP BY category
ORDER BY total_revenue DESC
```

### Category Performance Table

```datatable
query: category_summary
columns:
  - name: category
    label: Category
    format: text
    align: left
  - name: orders
    label: Orders
    format: number
    align: right
  - name: total_quantity
    label: Units Sold
    format: number
    align: right
  - name: total_revenue
    label: Revenue
    format: currency
    align: right
  - name: total_profit
    label: Profit
    format: currency
    align: right
  - name: avg_margin
    label: Avg Margin
    format: percent
    align: right
searchable: false
sortable: true
exportable: true
```

## Top Performing Products

```sql top_products
SELECT
  product,
  category,
  SUM(quantity) as total_quantity,
  SUM(revenue) as total_revenue,
  SUM(profit) as total_profit,
  AVG(margin) as avg_margin
FROM sales_data
GROUP BY product, category
ORDER BY total_revenue DESC
LIMIT 20
```

### Top 20 Products

```datatable
query: top_products
columns:
  - name: product
    label: Product
    format: text
    align: left
  - name: category
    label: Category
    format: text
    align: left
  - name: total_quantity
    label: Units Sold
    format: number
    align: right
  - name: total_revenue
    label: Revenue
    format: currency
    align: right
  - name: total_profit
    label: Profit
    format: currency
    align: right
  - name: avg_margin
    label: Margin
    format: percent
    align: right
searchable: true
sortable: true
exportable: true
maxHeight: 500
```

## Sales by Region

```sql region_performance
SELECT
  region,
  sales_person,
  COUNT(*) as orders,
  SUM(revenue) as total_revenue,
  SUM(profit) as total_profit,
  AVG(margin) as avg_margin
FROM sales_data
GROUP BY region, sales_person
ORDER BY total_revenue DESC
```

### Regional Performance

```datatable
query: region_performance
columns:
  - name: region
    label: Region
    format: text
    align: left
  - name: sales_person
    label: Sales Person
    format: text
    align: left
  - name: orders
    label: Orders
    format: number
    align: right
  - name: total_revenue
    label: Revenue
    format: currency
    align: right
  - name: total_profit
    label: Profit
    format: currency
    align: right
  - name: avg_margin
    label: Margin
    format: percent
    align: right
searchable: true
sortable: true
exportable: true
```

## Monthly Sales Trend

```sql monthly_trend
SELECT
  strftime('%Y-%m', date) as month,
  COUNT(*) as orders,
  SUM(revenue) as revenue,
  SUM(profit) as profit,
  AVG(margin) as avg_margin
FROM sales_data
GROUP BY month
ORDER BY month
```

### Monthly Performance

```datatable
query: monthly_trend
columns:
  - name: month
    label: Month
    format: text
    align: left
  - name: orders
    label: Orders
    format: number
    align: right
  - name: revenue
    label: Revenue
    format: currency
    align: right
  - name: profit
    label: Profit
    format: currency
    align: right
  - name: avg_margin
    label: Avg Margin
    format: percent
    align: right
searchable: false
sortable: true
exportable: true
```

## Detailed Transaction Data

```sql all_sales
SELECT * FROM sales_data
ORDER BY date DESC
```

### All Transactions (Searchable & Sortable)

```datatable
query: all_sales
columns:
  - name: date
    label: Date
    format: date
    align: left
  - name: product
    label: Product
    format: text
    align: left
  - name: category
    label: Category
    format: text
    align: left
  - name: region
    label: Region
    format: text
    align: left
  - name: sales_person
    label: Sales Person
    format: text
    align: left
  - name: quantity
    label: Qty
    format: number
    align: right
  - name: unit_price
    label: Unit Price
    format: currency
    align: right
  - name: revenue
    label: Revenue
    format: currency
    align: right
  - name: profit
    label: Profit
    format: currency
    align: right
  - name: margin
    label: Margin
    format: percent
    align: right
searchable: true
sortable: true
exportable: true
maxHeight: 600
```

## Conclusion

The sales data shows strong performance across all regions and categories. Electronics products generate higher revenue per order, while Furniture products show consistent profit margins.

### Key Findings:
- Total of 100 orders processed in 2024
- Electronics category leads in revenue
- All regions show positive profit margins
- Top sales performers across all territories
