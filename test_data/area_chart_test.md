---
title: Area Chart Test
---

# Area Chart 测试

测试新增的 Area Chart 功能，包括基础面积图、多系列面积图、透明度控制等。

## 测试 1: 基础 Area Chart - 单系列

```sql monthly_revenue
SELECT * FROM (VALUES
  (DATE '2024-01-01', 125000),
  (DATE '2024-02-01', 143000),
  (DATE '2024-03-01', 138000),
  (DATE '2024-04-01', 167000),
  (DATE '2024-05-01', 189000),
  (DATE '2024-06-01', 195000),
  (DATE '2024-07-01', 178000),
  (DATE '2024-08-01', 210000),
  (DATE '2024-09-01', 198000),
  (DATE '2024-10-01', 225000),
  (DATE '2024-11-01', 234000),
  (DATE '2024-12-01', 256000)
) AS t(month, revenue)
```

```chart
type: area
data: monthly_revenue
x: month
y: revenue
title: Monthly Revenue Trend 2024
xLabel: Month
yLabel: Revenue ($)
```

**测试步骤**:
1. 点击 "Execute Report" 按钮
2. 观察面积图渲染

**预期结果**:
- ✅ 显示平滑的面积图
- ✅ 填充颜色为蓝色（steelblue）
- ✅ 默认透明度约 70%
- ✅ X 轴显示月份
- ✅ Y 轴显示收入
- ✅ 标题和轴标签正确显示

---

## 测试 2: 自定义透明度的 Area Chart

```sql sales_data
SELECT * FROM (VALUES
  (1, 1200),
  (2, 1400),
  (3, 1100),
  (4, 1800),
  (5, 2100),
  (6, 1900),
  (7, 2300),
  (8, 2600)
) AS t(week, sales)
```

```chart
type: area
data: sales_data
x: week
y: sales
title: Weekly Sales (Low Opacity)
fillOpacity: 0.3
```

**测试步骤**:
1. 执行报告
2. 对比与测试 1 的透明度差异

**预期结果**:
- ✅ 面积填充透明度为 30%
- ✅ 更能看清底层网格线
- ✅ 图表仍然清晰可读

---

## 测试 3: 多系列 Area Chart - 按区域分组

```sql regional_sales
SELECT * FROM (VALUES
  (DATE '2024-01-01', 15000, 'North'),
  (DATE '2024-02-01', 18000, 'North'),
  (DATE '2024-03-01', 22000, 'North'),
  (DATE '2024-04-01', 19000, 'North'),
  (DATE '2024-05-01', 24000, 'North'),
  (DATE '2024-06-01', 26000, 'North'),
  (DATE '2024-01-01', 12000, 'South'),
  (DATE '2024-02-01', 14000, 'South'),
  (DATE '2024-03-01', 16000, 'South'),
  (DATE '2024-04-01', 15000, 'South'),
  (DATE '2024-05-01', 18000, 'South'),
  (DATE '2024-06-01', 19000, 'South'),
  (DATE '2024-01-01', 10000, 'East'),
  (DATE '2024-02-01', 11000, 'East'),
  (DATE '2024-03-01', 13000, 'East'),
  (DATE '2024-04-01', 14000, 'East'),
  (DATE '2024-05-01', 15000, 'East'),
  (DATE '2024-06-01', 17000, 'East'),
  (DATE '2024-01-01', 13000, 'West'),
  (DATE '2024-02-01', 15000, 'West'),
  (DATE '2024-03-01', 17000, 'West'),
  (DATE '2024-04-01', 18000, 'West'),
  (DATE '2024-05-01', 20000, 'West'),
  (DATE '2024-06-01', 22000, 'West')
) AS t(month, revenue, region)
```

```chart
type: area
data: regional_sales
x: month
y: revenue
group: region
title: Revenue by Region (Q1-Q2 2024)
xLabel: Month
yLabel: Revenue ($)
fillOpacity: 0.6
```

**测试步骤**:
1. 执行报告
2. 观察多个区域的面积图叠加

**预期结果**:
- ✅ 显示 4 个区域的面积图（North, South, East, West）
- ✅ 每个区域使用不同颜色
- ✅ 图例自动显示在图表上方/右侧
- ✅ 面积图半透明，可以看到重叠部分
- ✅ 鼠标悬停显示数据点信息

---

## 测试 4: 对比 Line Chart vs Area Chart

### Line Chart

```sql comparison_data
SELECT * FROM (VALUES
  (1, 100),
  (2, 120),
  (3, 115),
  (4, 140),
  (5, 165),
  (6, 180),
  (7, 175),
  (8, 200)
) AS t(period, value)
```

```chart
type: line
data: comparison_data
x: period
y: value
title: Line Chart - Trend Only
```

### Area Chart

```chart
type: area
data: comparison_data
x: period
y: value
title: Area Chart - Trend with Magnitude
fillOpacity: 0.5
```

**测试步骤**:
1. 执行报告
2. 对比两种图表的视觉效果

**预期结果**:
- ✅ Line Chart 只显示趋势线
- ✅ Area Chart 显示趋势线 + 填充区域
- ✅ Area Chart 更能体现数值的大小和累积效果
- ✅ 两者使用相同数据，趋势一致

---

## 测试 5: 时间序列数据 - 股票价格模拟

```sql stock_price
SELECT * FROM (VALUES
  (DATE '2024-01-01', 150.25),
  (DATE '2024-01-08', 152.80),
  (DATE '2024-01-15', 148.50),
  (DATE '2024-01-22', 155.00),
  (DATE '2024-01-29', 158.75),
  (DATE '2024-02-05', 162.30),
  (DATE '2024-02-12', 159.80),
  (DATE '2024-02-19', 165.50),
  (DATE '2024-02-26', 163.20),
  (DATE '2024-03-04', 170.00),
  (DATE '2024-03-11', 168.50),
  (DATE '2024-03-18', 175.30),
  (DATE '2024-03-25', 172.80),
  (DATE '2024-04-01', 180.50)
) AS t(date, price)
```

```chart
type: area
data: stock_price
x: date
y: price
title: Stock Price Trend (Q1 2024)
xLabel: Date
yLabel: Price ($)
fillOpacity: 0.4
```

**测试步骤**:
1. 执行报告
2. 观察日期轴的格式化

**预期结果**:
- ✅ X 轴正确显示日期
- ✅ 日期自动格式化（根据范围）
- ✅ 价格变化清晰可见
- ✅ 填充区域增强了价格波动的视觉效果

---

## 测试 6: 多系列面积图 - 产品线对比

```sql product_revenue
SELECT * FROM (VALUES
  (1, 5000, 'Product A'),
  (2, 5500, 'Product A'),
  (3, 6200, 'Product A'),
  (4, 6800, 'Product A'),
  (5, 7500, 'Product A'),
  (6, 8200, 'Product A'),
  (1, 3000, 'Product B'),
  (2, 3200, 'Product B'),
  (3, 3800, 'Product B'),
  (4, 4100, 'Product B'),
  (5, 4500, 'Product B'),
  (6, 5000, 'Product B'),
  (1, 2000, 'Product C'),
  (2, 2300, 'Product C'),
  (3, 2600, 'Product C'),
  (4, 2900, 'Product C'),
  (5, 3100, 'Product C'),
  (6, 3500, 'Product C')
) AS t(quarter, revenue, product)
```

```chart
type: area
data: product_revenue
x: quarter
y: revenue
group: product
title: Product Line Revenue Comparison
xLabel: Quarter
yLabel: Revenue ($)
fillOpacity: 0.5
```

**测试步骤**:
1. 执行报告
2. 观察三条产品线的收入趋势

**预期结果**:
- ✅ 三个产品线使用不同颜色
- ✅ 可以清楚看到各产品线的增长趋势
- ✅ 重叠部分半透明，可以识别
- ✅ 图例清晰标注产品名称

---

## 测试 7: 小数值 Area Chart

```sql small_values
SELECT * FROM (VALUES
  (1, 0.12),
  (2, 0.15),
  (3, 0.11),
  (4, 0.18),
  (5, 0.22),
  (6, 0.19),
  (7, 0.25)
) AS t(day, rate)
```

```chart
type: area
data: small_values
x: day
y: rate
title: Daily Conversion Rate
yLabel: Rate (%)
fillOpacity: 0.7
```

**测试步骤**:
1. 执行报告
2. 检查小数值的显示

**预期结果**:
- ✅ Y 轴正确显示小数值
- ✅ 刻度合理（如 0.10, 0.15, 0.20, 0.25）
- ✅ 面积填充正常
- ✅ 数值可读性好

---

## 测试 8: 大数值 Area Chart

```sql large_values
SELECT * FROM (VALUES
  (1, 1500000),
  (2, 1800000),
  (3, 2100000),
  (4, 1900000),
  (5, 2400000),
  (6, 2700000),
  (7, 2900000),
  (8, 3200000)
) AS t(month, revenue)
```

```chart
type: area
data: large_values
x: month
y: revenue
title: Monthly Revenue (Millions)
yLabel: Revenue ($M)
fillOpacity: 0.6
```

**测试步骤**:
1. 执行报告
2. 检查大数值的格式化

**预期结果**:
- ✅ Y 轴使用科学计数法或缩写（1.5M, 2M, 2.5M, 3M）
- ✅ 数值清晰可读
- ✅ 面积图正常渲染
- ✅ 标题和标签正确

---

## 功能验证清单

### ✅ 基础功能
- [ ] 单系列 area chart 渲染
- [ ] 多系列 area chart（使用 group）
- [ ] 自定义 fillOpacity (0-1)
- [ ] 默认 fillOpacity = 0.7
- [ ] 颜色自动分配（多系列）

### ✅ 数据处理
- [ ] 日期数据正确显示在 X 轴
- [ ] 数值数据正确显示在 Y 轴
- [ ] 小数值处理正确
- [ ] 大数值格式化正确
- [ ] 分组数据正确分离

### ✅ 视觉效果
- [ ] 填充区域平滑
- [ ] 透明度设置生效
- [ ] 多系列重叠可见
- [ ] 颜色区分清晰
- [ ] 图例正确显示

### ✅ 配置选项
- [ ] title 显示正确
- [ ] xLabel 显示正确
- [ ] yLabel 显示正确
- [ ] fillOpacity 参数有效
- [ ] group 参数有效

### ✅ 对比测试
- [ ] Area vs Line 视觉差异明显
- [ ] Area 更能体现数值大小
- [ ] Area 适合展示累积效果
- [ ] 与其他图表类型集成良好

---

## 使用场景

### 适合使用 Area Chart 的场景:
1. **时间序列趋势** - 显示随时间变化的指标
2. **累积效果** - 强调数值的大小和总量
3. **多指标对比** - 比较多个系列的相对贡献
4. **填充强调** - 需要视觉上填充区域的场景

### 不适合使用 Area Chart 的场景:
1. **分类数据对比** - 使用 Bar Chart 更好
2. **相关性分析** - 使用 Scatter Plot
3. **精确数值读取** - Line Chart 更清晰
4. **分布分析** - 使用 Histogram 或 Box Plot

---

## 配置示例

### 基础配置

```yaml
chart:
  type: area
  data: my_data
  x: date_column
  y: value_column
  title: My Area Chart
```

### 完整配置

```yaml
chart:
  type: area
  data: my_data
  x: date_column
  y: value_column
  group: category_column
  title: My Area Chart
  xLabel: Time Period
  yLabel: Metric Value
  fillOpacity: 0.6
  width: 800
  height: 400
```

---

## 已知限制

1. **堆叠模式** - 暂不支持 stacked 和 normalized 参数（未来版本）
2. **曲线类型** - 暂不支持 step, basis, monotone 等曲线类型
3. **渐变填充** - 暂不支持自定义渐变色
4. **动画效果** - 暂无过渡动画

---

## 未来增强

1. **堆叠面积图**
   - `stacked: true` - 堆叠显示多个系列
   - `normalized: true` - 百分比堆叠（总和为 100%）

2. **曲线类型**
   - `curve: 'step'` - 阶梯线
   - `curve: 'basis'` - 平滑曲线
   - `curve: 'monotone'` - 单调曲线

3. **渐变填充**
   - 支持从上到下的颜色渐变
   - 自定义渐变色方案

4. **交互增强**
   - 鼠标悬停高亮
   - 点击系列切换显示
   - 区域选择缩放

---

## 故障排除

**如果 Area Chart 不显示**:
1. 检查 `type: area` 拼写正确
2. 确认数据查询已执行
3. 检查 x 和 y 列名是否正确
4. 查看浏览器控制台错误

**如果颜色不正确**:
1. 检查 group 参数是否设置
2. 确认数据中有多个系列
3. 检查 fillOpacity 是否过低

**如果透明度不生效**:
1. 确认 fillOpacity 值在 0-1 之间
2. 检查是否有 CSS 样式覆盖
3. 尝试不同的 fillOpacity 值
