---
title: Drilldown Demo
author: Miao Vision
date: 2024-12-31
description: Demonstration of drilldown functionality - Modal and SetInput actions
---

# 🔍 Drilldown Demo

This report demonstrates the **drilldown functionality** for DataTable - allowing users to click on rows for detailed views or cross-table filtering.

## Two Drilldown Modes

1. **Modal** - Click row to show a detail popup
2. **SetInput** - Click row to filter other components

---

## 📋 Example 1: Modal Drilldown (View Order Details)

Click any row to view the full order details in a modal popup.

### Orders Data

```sql orders
SELECT * FROM (VALUES
  (1001, 'Alice Chen', 'Laptop Pro 15"', 1, 2499.00, 'Shipped', '2024-01-15'),
  (1002, 'Bob Smith', 'Wireless Mouse MX', 2, 79.99, 'Delivered', '2024-01-14'),
  (1003, 'Carol Davis', 'USB-C Hub 7-in-1', 3, 149.00, 'Processing', '2024-01-16'),
  (1004, 'David Lee', 'Mechanical Keyboard', 1, 199.00, 'Shipped', '2024-01-13'),
  (1005, 'Eva Martinez', 'Monitor 27" 4K', 2, 898.00, 'Delivered', '2024-01-12'),
  (1006, 'Frank Wilson', 'Webcam HD Pro', 1, 129.00, 'Processing', '2024-01-16'),
  (1007, 'Grace Kim', 'Laptop Stand Ergonomic', 2, 98.00, 'Shipped', '2024-01-15'),
  (1008, 'Henry Brown', 'Headphones Pro Max', 1, 349.00, 'Delivered', '2024-01-11')
) AS t(order_id, customer, product, quantity, total, status, order_date)
```

### Orders Table with Modal Drilldown

```datatable
query: orders
sortable: true
searchable: true
exportable: true
columns:
  - name: order_id
    label: Order ID
    width: 100
  - name: customer
    label: Customer
    width: 150
  - name: product
    label: Product
    width: 200
  - name: quantity
    label: Qty
    width: 60
    align: right
  - name: total
    label: Total
    format: currency
    width: 100
    align: right
  - name: status
    label: Status
    width: 100
drilldown:
  enabled: true
  action: modal
  titleTemplate: "Order #{order_id}"
  displayColumns:
    - order_id
    - customer
    - product
    - quantity
    - total
    - status
    - order_date
  tooltip: Click to view order details
  cursor: pointer
  highlight: true
```

---

## 📊 Example 2: SetInput Drilldown (Cross-Table Filtering)

Click a customer in the first table to filter their orders in the second table.

### Customers Data

```sql customers
SELECT * FROM (VALUES
  ('Alice Chen', 'alice@email.com', 5, 5234.00, 'Gold'),
  ('Bob Smith', 'bob@email.com', 12, 1890.00, 'Silver'),
  ('Carol Davis', 'carol@email.com', 8, 3421.00, 'Gold'),
  ('David Lee', 'david@email.com', 3, 899.00, 'Bronze'),
  ('Eva Martinez', 'eva@email.com', 15, 7650.00, 'Platinum'),
  ('Frank Wilson', 'frank@email.com', 6, 2100.00, 'Silver'),
  ('Grace Kim', 'grace@email.com', 9, 4200.00, 'Gold'),
  ('Henry Brown', 'henry@email.com', 4, 1560.00, 'Bronze')
) AS t(customer, email, total_orders, total_spent, tier)
```

### Customers Table (Click to Filter)

```datatable
query: customers
sortable: true
searchable: true
columns:
  - name: customer
    label: Customer
    width: 150
  - name: email
    label: Email
    width: 200
  - name: total_orders
    label: Orders
    width: 80
    align: right
  - name: total_spent
    label: Total Spent
    format: currency
    width: 120
    align: right
  - name: tier
    label: Tier
    width: 100
drilldown:
  enabled: true
  action: setInput
  mappings:
    - customer: selected_customer
  tooltip: Click to filter orders by this customer
  cursor: pointer
  highlight: true
```

### Filtered Orders (by Selected Customer)

```sql customer_orders
SELECT * FROM (VALUES
  (1001, 'Alice Chen', 'Laptop Pro 15"', 2499.00, '2024-01-15'),
  (1009, 'Alice Chen', 'Wireless Charger', 45.00, '2024-01-10'),
  (1015, 'Alice Chen', 'Phone Case', 29.00, '2024-01-08'),
  (1002, 'Bob Smith', 'Wireless Mouse MX', 79.99, '2024-01-14'),
  (1010, 'Bob Smith', 'Mouse Pad XL', 25.00, '2024-01-12'),
  (1003, 'Carol Davis', 'USB-C Hub 7-in-1', 149.00, '2024-01-16'),
  (1011, 'Carol Davis', 'HDMI Cable', 15.00, '2024-01-14'),
  (1004, 'David Lee', 'Mechanical Keyboard', 199.00, '2024-01-13'),
  (1005, 'Eva Martinez', 'Monitor 27" 4K', 898.00, '2024-01-12'),
  (1012, 'Eva Martinez', 'Monitor Arm', 89.00, '2024-01-10'),
  (1016, 'Eva Martinez', 'Desk Lamp LED', 55.00, '2024-01-08'),
  (1006, 'Frank Wilson', 'Webcam HD Pro', 129.00, '2024-01-16'),
  (1007, 'Grace Kim', 'Laptop Stand Ergonomic', 98.00, '2024-01-15'),
  (1013, 'Grace Kim', 'Keyboard Wrist Rest', 35.00, '2024-01-12'),
  (1008, 'Henry Brown', 'Headphones Pro Max', 349.00, '2024-01-11')
) AS t(order_id, customer, product, total, order_date)
WHERE customer = ${inputs.selected_customer}
```

```datatable
query: customer_orders
sortable: true
columns:
  - name: order_id
    label: Order ID
    width: 100
  - name: product
    label: Product
    width: 250
  - name: total
    label: Total
    format: currency
    width: 100
    align: right
  - name: order_date
    label: Date
    width: 120
drilldown:
  enabled: true
  action: modal
  titleTemplate: "Order #{order_id} - {customer}"
  tooltip: Click to view details
```

---

## 📝 Drilldown Configuration Reference

### Modal Action (View Details)

```yaml
drilldown:
  enabled: true
  action: modal
  titleTemplate: "Order #{order_id}"  # Use {column} for dynamic title
  displayColumns:                      # Columns to show in modal
    - order_id
    - customer
    - product
  tooltip: Click to view details
  cursor: pointer
  highlight: true
```

### SetInput Action (Cross-Table Filtering)

```yaml
drilldown:
  enabled: true
  action: setInput
  mappings:
    - customer: filter_name      # column: inputName format
    - category: filter_category  # Maps category column to filter_category input
  tooltip: Click to filter
```

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **Modal View** | Click row to see all details in a popup |
| **Cross-Filtering** | Click row to filter other tables/charts |
| **Title Template** | Dynamic modal titles using `{column}` syntax |
| **Column Selection** | Choose which columns appear in modal |
| **Visual Feedback** | Row highlighting on hover |
| **Keyboard Support** | ESC to close modal |

---

## 🚀 Try It Out!

1. Click "Execute Report" to run all queries
2. **Example 1**: Click any order row to see the modal popup
3. **Example 2**: Click a customer to filter their orders below
4. Press **ESC** or click outside to close the modal
