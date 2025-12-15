---
title: Histogram Feature Comprehensive Test
author: Claude
date: 2024-12-09
---

# Histogram 功能全面测试

这个报告展示了 Histogram 功能的完整用例，包括各种数据分布和配置选项。

## 1. 销售数据分布分析

首先创建一些模拟的销售数据：

```sql sales_data
SELECT * FROM (VALUES
  (DATE '2024-01-01', 'North', 1250),
  (DATE '2024-01-02', 'South', 2340),
  (DATE '2024-01-03', 'East', 1890),
  (DATE '2024-01-04', 'West', 3100),
  (DATE '2024-01-05', 'North', 2750),
  (DATE '2024-01-06', 'South', 1980),
  (DATE '2024-01-07', 'East', 2650),
  (DATE '2024-01-08', 'West', 3500),
  (DATE '2024-01-09', 'North', 2100),
  (DATE '2024-01-10', 'South', 2890),
  (DATE '2024-01-11', 'East', 1750),
  (DATE '2024-01-12', 'West', 4200),
  (DATE '2024-01-13', 'North', 3200),
  (DATE '2024-01-14', 'South', 2450),
  (DATE '2024-01-15', 'East', 2980),
  (DATE '2024-01-16', 'West', 3800),
  (DATE '2024-01-17', 'North', 2600),
  (DATE '2024-01-18', 'South', 3100),
  (DATE '2024-01-19', 'East', 2200),
  (DATE '2024-01-20', 'West', 4500),
  (DATE '2024-01-21', 'North', 2950),
  (DATE '2024-01-22', 'South', 2700),
  (DATE '2024-01-23', 'East', 3300),
  (DATE '2024-01-24', 'West', 3900),
  (DATE '2024-01-25', 'North', 2500),
  (DATE '2024-01-26', 'South', 2150),
  (DATE '2024-01-27', 'East', 2800),
  (DATE '2024-01-28', 'West', 4100),
  (DATE '2024-01-29', 'North', 3400),
  (DATE '2024-01-30', 'South', 2600)
) AS t(date, region, revenue)
```

### 销售额分布直方图

```histogram
type: histogram
data: sales_data
x: revenue
bins: 15
title: Daily Revenue Distribution
width: 700
height: 400
```

**分析**: 查看销售额的分布情况，识别常见的销售额区间。

---

## 2. 正态分布模拟

使用 DuckDB 的随机函数生成正态分布数据：

```sql normal_distribution
SELECT
  (random() + random() + random() + random() + random() + random()) * 10 AS measurement
FROM generate_series(1, 2000)
```

### 正态分布直方图（30 bins）

```histogram
type: histogram
data: normal_distribution
x: measurement
bins: 30
title: Normal Distribution (Central Limit Theorem)
```

**预期**: 应该看到经典的钟形曲线，因为多个随机数相加趋向于正态分布（中心极限定理）。

---

## 3. 均匀分布对比

创建均匀分布的数据：

```sql uniform_distribution
SELECT
  random() * 100 AS score
FROM generate_series(1, 1000)
```

### 均匀分布直方图（25 bins）

```histogram
type: histogram
data: uniform_distribution
x: score
bins: 25
title: Uniform Distribution (0-100)
```

**预期**: 各个柱子的高度应该相对均匀，因为数据是均匀分布的。

---

## 4. 偏态分布（指数分布）

模拟客户响应时间（通常是右偏分布）：

```sql response_time
SELECT
  -LN(random()) * 100 AS response_time_ms
FROM generate_series(1, 1500)
WHERE random() > 0  -- Avoid log(0)
```

### 响应时间分布直方图

```histogram
type: histogram
data: response_time
x: response_time_ms
bins: 20
title: API Response Time Distribution (Right-Skewed)
width: 680
height: 400
```

**分析**: 大部分响应时间集中在较小的值，少数有较长的响应时间（长尾分布）。

---

## 5. 双峰分布

模拟两组不同用户的购买金额：

```sql bimodal_data
SELECT amount FROM (
  SELECT (random() * 20 + 10) AS amount FROM generate_series(1, 300)  -- Low spenders
  UNION ALL
  SELECT (random() * 30 + 80) AS amount FROM generate_series(1, 300)  -- High spenders
)
```

### 双峰分布直方图

```histogram
type: histogram
data: bimodal_data
x: amount
bins: 25
title: Customer Purchase Amount (Bimodal Distribution)
```

**分析**: 应该看到两个明显的峰值，分别对应低消费和高消费用户群体。

---

## 6. 不同 bins 数量对比

使用同一数据源，但不同的 bins 设置：

```sql test_data
SELECT
  random() * 50 AS value
FROM generate_series(1, 800)
```

### 10 Bins

```histogram
type: histogram
data: test_data
x: value
bins: 10
title: Histogram with 10 Bins
```

### 20 Bins (默认)

```histogram
type: histogram
data: test_data
x: value
bins: 20
title: Histogram with 20 Bins (Default)
```

### 40 Bins

```histogram
type: histogram
data: test_data
x: value
bins: 40
title: Histogram with 40 Bins
```

**分析**: 观察不同 bins 数量如何影响分布的可视化效果。bins 太少会过度平滑，bins 太多会产生噪音。

---

## 测试清单

### 功能测试

- [ ] 所有 SQL 查询成功执行
- [ ] 所有直方图正确渲染
- [ ] 柱子数量与 bins 参数匹配
- [ ] 标题正确显示
- [ ] 宽度和高度配置生效

### 数据分布验证

- [ ] 正态分布呈现钟形
- [ ] 均匀分布各柱子相对平均
- [ ] 指数分布呈现右偏
- [ ] 双峰分布显示两个峰值
- [ ] 不同 bins 数量的视觉差异明显

### 交互测试

- [ ] 图表加载无错误
- [ ] 浏览器控制台无错误
- [ ] 图表响应式调整（如果窗口大小改变）

---

## 使用说明

1. 打开这个报告
2. 点击 "Execute Report" 按钮
3. 等待所有 SQL 查询执行完成
4. 向下滚动查看所有直方图
5. 检查每个分布是否符合预期

## 故障排除

如果直方图不显示：

1. **检查浏览器控制台**（F12 → Console）
   - 查找与 "histogram" 或 "VgplotChart" 相关的错误

2. **验证 SQL 执行**
   - 确保 SQL 查询块显示了结果
   - 查看是否有 SQL 错误

3. **检查配置**
   - 确保 `data` 字段引用的查询名称正确
   - 确保 `x` 字段是存在的列名
   - 确保 `bins` 是一个正整数

4. **重新执行**
   - 尝试清除缓存并重新执行报告
   - 使用 Ctrl+Shift+R (Mac: Cmd+Shift+R) 硬刷新页面
