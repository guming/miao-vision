---
title: DataTable Advanced Features Demo
author: Miaoshou Vision Team
date: 2025-12-23
---

# DataTable Advanced Features Demo

This demo showcases the 6 new advanced features added to the DataTable component.

## Test Data Setup

```sql products
SELECT * FROM (VALUES
  ('Product A', 'Electronics', 299.99, 150, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100', '<span style="color: #10B981;">✓ In Stock</span>'),
  ('Product B', 'Electronics', 499.99, 75, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=100', '<span style="color: #10B981;">✓ In Stock</span>'),
  ('Product C', 'Clothing', 79.99, 200, 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=100', '<span style="color: #F59E0B;">⚠ Low Stock</span>'),
  ('Product D', 'Electronics', 799.99, 30, 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=100', '<span style="color: #EF4444;">✗ Out of Stock</span>'),
  ('Product E', 'Clothing', 129.99, 180, 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=100', '<span style="color: #10B981;">✓ In Stock</span>'),
  ('Product F', 'Home', 199.99, 90, 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=100', '<span style="color: #10B981;">✓ In Stock</span>'),
  ('Product G', 'Electronics', 349.99, 60, 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=100', '<span style="color: #F59E0B;">⚠ Low Stock</span>'),
  ('Product H', 'Home', 89.99, 120, 'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=100', '<span style="color: #10B981;">✓ In Stock</span>'),
  ('Product I', 'Clothing', 159.99, 45, 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=100', '<span style="color: #EF4444;">✗ Out of Stock</span>'),
  ('Product J', 'Electronics', 599.99, 25, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=100', '<span style="color: #F59E0B;">⚠ Low Stock</span>')
) AS t(product_name, category, price, stock, image_url, status_html)
```

---

## Feature 1: Image Column

Display product images directly in the table.

```datatable
query: products
columns:
  - name: image_url
    label: Image
    contentType: image
    imageConfig:
      width: 60
      height: 60
      fit: cover
      rounded: true
    align: center
  - name: product_name
    label: Product
  - name: category
    label: Category
  - name: price
    label: Price
    format: currency
  - name: stock
    label: Stock
    format: number
searchable: true
sortable: true
rowHeight: 80
```

---

## Feature 2: HTML Column

Render HTML content for rich status indicators.

```datatable
query: products
columns:
  - name: product_name
    label: Product
  - name: status_html
    label: Status
    contentType: html
    align: center
  - name: price
    label: Price
    format: currency
  - name: stock
    label: Stock
    format: number
searchable: true
sortable: true
```

---

## Feature 3: Column Resizing

Drag the column borders to adjust width.

```datatable
query: products
columns:
  - name: product_name
    label: Product Name
    width: 150
  - name: category
    label: Category
    width: 120
  - name: price
    label: Price
    format: currency
    width: 100
  - name: stock
    label: Stock Quantity
    format: number
    width: 120
resizableColumns: true
searchable: true
sortable: true
```

---

## Feature 4: Frozen Columns

First column is frozen (scroll horizontally to see effect).

```datatable
query: products
columns:
  - name: product_name
    label: Product
    frozen: left
    width: 150
  - name: category
    label: Category
    width: 120
  - name: price
    label: Price
    format: currency
    width: 100
  - name: stock
    label: Stock
    format: number
    width: 100
  - name: status_html
    label: Status
    contentType: html
    width: 150
  - name: image_url
    label: Image
    contentType: image
    frozen: right
    imageConfig:
      width: 50
      height: 50
      rounded: true
    width: 80
searchable: true
sortable: true
resizableColumns: true
rowHeight: 70
```

---

## Feature 5 & 6: Combined Demo

All features together: Image, HTML, Resizing, Frozen, and Summary.

```datatable
query: products
columns:
  - name: image_url
    label: ""
    contentType: image
    imageConfig:
      width: 50
      height: 50
      fit: cover
      rounded: true
    frozen: left
    width: 70
    align: center
  - name: product_name
    label: Product Name
    width: 150
  - name: category
    label: Category
    width: 120
  - name: price
    label: Price ($)
    format: currency
    width: 100
    summary: sum
    align: right
  - name: stock
    label: Stock
    format: number
    width: 100
    summary: sum
    align: right
  - name: status_html
    label: Availability
    contentType: html
    frozen: right
    width: 130
    align: center
searchable: true
sortable: true
exportable: true
resizableColumns: true
summaryRow: true
columnSelector: true
filterable: true
rowHeight: 90
```

---

## Tips for Using Advanced Features

### Image Column
- Use `contentType: 'image'` to display images
- Configure with `imageConfig` for size and styling
- Images auto-fallback to ❌ on error
- Best for: Product images, avatars, thumbnails

### HTML Column
- Use `contentType: 'html'` for rich content
- Perfect for: Status badges, custom formatting, icons
- ⚠️ Ensure HTML is safe/sanitized

### Column Resizing
- Enable with `resizableColumns: true`
- Drag the right edge of column headers
- Minimum width is 50px
- Works with all column types

### Frozen Columns
- Use `frozen: 'left'` or `frozen: 'right'`
- Keep important columns visible while scrolling
- Works with Image and HTML columns
- Multiple frozen columns supported

### Grouping & Subtotals
- Use `groupBy: 'column_name'` to group rows
- Enable `showSubtotals: true` for group summaries
- Configure `summary` on columns for aggregation
- Set `groupCollapsible: true` to collapse groups

---

## Performance Notes

- **Image Loading**: Images load asynchronously
- **HTML Rendering**: Use sparingly for large datasets
- **Frozen Columns**: CSS sticky positioning (modern browsers)
- **Resizing**: Smooth performance with optimized event handling

---

**Created with** 🤖 [Claude Code](https://claude.com/claude-code)
