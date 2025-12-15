---
title: Histogram Test
---

# Histogram 测试

这个测试验证直方图功能是否正常工作。

## 测试 1: 基础直方图（正态分布数据）

生成一些正态分布的数据：

```sql normal_data
SELECT
  (random() * 10 + random() * 10 + random() * 10 + random() * 10) AS value
FROM generate_series(1, 1000)
```

使用 histogram 语法绘制直方图：

```histogram
type: histogram
data: normal_data
x: value
bins: 30
title: Normal Distribution
```

**预期结果**:
- 应该看到一个钟形的正态分布直方图
- 有 30 个柱状区间
- X 轴显示 value 的范围
- Y 轴显示每个区间的计数

---

## 测试 2: 简单直方图（均匀分布）

```sql uniform_data
SELECT
  random() * 100 AS score
FROM generate_series(1, 500)
```

```histogram
type: histogram
data: uniform_data
x: score
bins: 20
title: Uniform Distribution (Score)
```

**预期结果**: 相对均匀的分布

---

## 测试 3: 使用销售数据的直方图

```sql sales_revenue
SELECT * FROM (VALUES
  (100), (150), (200), (220), (180),
  (300), (350), (280), (400), (380),
  (500), (520), (480), (550), (600),
  (650), (620), (700), (750), (800),
  (850), (900), (950), (1000), (1050),
  (200), (250), (300), (320), (280),
  (400), (450), (480), (500), (520)
) AS t(revenue)
```

```histogram
type: histogram
data: sales_revenue
x: revenue
bins: 15
title: Revenue Distribution
width: 700
height: 450
```

**预期结果**:
- 显示销售额的分布情况
- 使用自定义的宽度和高度

---

## 操作步骤

1. 点击 "Execute Report" 按钮
2. 等待 SQL 查询执行完成
3. 查看三个直方图是否正确显示

## 成功标志

- ✅ 看到三个直方图渲染成功
- ✅ 直方图显示正确的柱状分布
- ✅ 标题正确显示
- ✅ 可以与图表交互（如果 Mosaic 提供交互功能）

## 调试信息

如果有问题，打开浏览器控制台查看：
- SQL 查询是否执行成功
- chart-builder 是否正确解析 histogram 配置
- VgplotChart 是否正确渲染
