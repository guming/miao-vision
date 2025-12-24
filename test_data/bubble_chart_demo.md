---
title: Bubble Chart Demo
author: Miaoshou Vision Team
date: 2025-12-23
---

# Bubble Chart Component Demo

Visualize three-dimensional data using bubbles with X, Y positions and size.

## Test Data Setup

```sql company_performance
SELECT * FROM (VALUES
  ('Apple', 365817, 94680, 164000, 'Technology'),
  ('Microsoft', 198270, 72738, 221000, 'Technology'),
  ('Google', 282836, 76033, 190234, 'Technology'),
  ('Amazon', 513983, 33364, 1608000, 'E-commerce'),
  ('Meta', 116609, 39370, 86482, 'Technology'),
  ('Tesla', 81462, 12583, 127855, 'Automotive'),
  ('Walmart', 611289, 15080, 2300000, 'Retail'),
  ('ExxonMobil', 413680, 55740, 62000, 'Energy'),
  ('Toyota', 272612, 18608, 375235, 'Automotive'),
  ('Samsung', 244187, 30465, 267937, 'Technology'),
  ('Alibaba', 109480, 11737, 245700, 'E-commerce'),
  ('Coca-Cola', 43004, 10126, 82500, 'Consumer Goods')
) AS t(company, revenue, profit, employees, industry)
```

---

## Example 1: Basic Bubble Chart

Simple bubble chart showing company performance.

```bubble
data: company_performance
x: revenue
y: profit
size: employees
label: company
title: Company Performance Analysis
xLabel: Revenue (Million $)
yLabel: Profit (Million $)
```

---

## Example 2: Grouped by Industry

Bubble chart with industry grouping and custom colors.

```bubble
data: company_performance
x: revenue
y: profit
size: employees
label: company
group: industry
title: Company Performance by Industry
xLabel: Revenue (Million $)
yLabel: Profit (Million $)
showLegend: true
```

---

## Example 3: Custom Bubble Sizes

Adjust minimum and maximum bubble sizes.

```bubble
data: company_performance
x: revenue
y: profit
size: employees
label: company
group: industry
title: Employee Count Visualization
xLabel: Revenue (Million $)
yLabel: Profit (Million $)
minBubbleSize: 15
maxBubbleSize: 80
opacity: 0.6
```

---

## Example 4: Simple Layout

Bubble chart without labels for cleaner look.

```bubble
data: company_performance
x: revenue
y: profit
size: employees
group: industry
title: Revenue vs Profit Analysis
xLabel: Revenue (Million $)
yLabel: Profit (Million $)
showLabels: false
showLegend: true
opacity: 0.8
```

---

## Product Performance Data

```sql products
SELECT * FROM (VALUES
  ('Product A', 299.99, 1500, 45.5, 'Electronics'),
  ('Product B', 499.99, 750, 38.2, 'Electronics'),
  ('Product C', 79.99, 3200, 62.8, 'Clothing'),
  ('Product D', 799.99, 300, 28.1, 'Electronics'),
  ('Product E', 129.99, 1800, 51.3, 'Clothing'),
  ('Product F', 199.99, 900, 42.7, 'Home'),
  ('Product G', 349.99, 600, 35.9, 'Electronics'),
  ('Product H', 89.99, 1200, 58.4, 'Home'),
  ('Product I', 159.99, 450, 31.2, 'Clothing'),
  ('Product J', 599.99, 250, 25.6, 'Electronics')
) AS t(product, price, sales, market_share, category)
```

---

## Example 5: Product Analysis

Analyze product performance with price, sales, and market share.

```bubble
data: products
x: price
y: sales
size: market_share
label: product
group: category
title: Product Performance Matrix
xLabel: Price ($)
yLabel: Sales Volume
height: 450
width: 700
```

---

## Tips for Using Bubble Charts

### When to Use
- **Three-dimensional data**: Perfect for visualizing 3 variables simultaneously
- **Correlation analysis**: Show relationships between variables
- **Comparative analysis**: Compare entities across multiple dimensions
- **Portfolio analysis**: Evaluate investment opportunities
- **Product positioning**: Market share vs. price vs. sales

### Configuration Tips
- **Bubble size**: Use `minBubbleSize` and `maxBubbleSize` to control visibility
- **Grouping**: Use `group` column to color-code categories
- **Labels**: Toggle `showLabels` based on bubble density
- **Opacity**: Adjust `opacity` (0-1) when bubbles overlap
- **Grid**: Use `showGrid: true` for precise value reading

### Best Practices
- Limit to 10-20 bubbles for readability
- Use clear, descriptive labels
- Choose appropriate scales for X and Y axes
- Group similar items for pattern recognition
- Ensure bubble sizes are proportional and meaningful

---

**Created with** 🤖 [Claude Code](https://claude.com/claude-code)
