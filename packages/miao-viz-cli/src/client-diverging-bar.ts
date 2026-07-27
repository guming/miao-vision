export const CLIENT_DIVERGING_BAR_JS = String.raw`
  miaoData.renderDivergingBar = function(chart, chartRows, chartId) {
    var categoryField = chart.encoding && chart.encoding.x && chart.encoding.x.field || '';
    var measureField = chart.encoding && chart.encoding.y && chart.encoding.y.field || '';
    var style = chart.style || {};
    var data = chartRows.map(function(row, index) {
      return { row:row, index:index, label:String(row[categoryField] == null ? '—' : row[categoryField]), value:Number(row[measureField]) };
    }).filter(function(item) { return Number.isFinite(item.value); });
    if (!categoryField || !measureField || !data.length) return miaoData.renderNoData();

    var sort = style.divergingSort == null ? 'asc' : style.divergingSort;
    if (sort === 'asc' || sort === 'desc') {
      data.sort(function(a, b) { return sort === 'asc' ? a.value - b.value : b.value - a.value; });
    }
    var width = Number.isFinite(Number(style.width)) ? Number(style.width) : 720;
    var rowHeight = Number.isFinite(Number(style.rowHeight)) ? Number(style.rowHeight) : 25;
    var margin = { top:54, right:44, bottom:24, left:44 };
    var height = Number.isFinite(Number(style.height)) ? Number(style.height) : Math.max(420, margin.top + margin.bottom + data.length * rowHeight);
    var plotWidth = width - margin.left - margin.right;
    var plotHeight = height - margin.top - margin.bottom;
    var rawMin = Math.min.apply(null, [0].concat(data.map(function(item) { return item.value; })));
    var rawMax = Math.max.apply(null, [0].concat(data.map(function(item) { return item.value; })));
    var rough = Math.max(rawMax - rawMin, 1) / 6;
    var power = Math.pow(10, Math.floor(Math.log10(Math.max(rough, Number.EPSILON))));
    var normalized = rough / power;
    var tickStep = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * power;
    var domainMin = Number.isFinite(Number(style.xDomainMin)) ? Number(style.xDomainMin) : Math.floor(rawMin / tickStep) * tickStep;
    var domainMax = Number.isFinite(Number(style.xDomainMax)) ? Number(style.xDomainMax) : Math.ceil(rawMax / tickStep) * tickStep;
    var domainSpan = Math.max(domainMax - domainMin, 1);
    var scale = function(value) { return margin.left + (value - domainMin) / domainSpan * plotWidth; };
    var zeroX = scale(0);
    var step = plotHeight / data.length;
    var positiveColor = String(style.positiveColor || '#9bd66d');
    var negativeColor = String(style.negativeColor || '#e79ac8');
    var decimals = Math.max(0, Math.min(6, Number(style.valueDecimals == null ? 1 : style.valueDecimals)));
    var suffix = String(style.valueSuffix == null && chart.encoding && chart.encoding.y && chart.encoding.y.unit === 'percentage' ? '%' : (style.valueSuffix || ''));
    var format = function(value) {
      return (value > 0 ? '+' : value < 0 ? '−' : '') + Math.abs(value).toFixed(decimals) + suffix;
    };
    var ticks = [];
    for (var tick = Math.ceil(domainMin / tickStep) * tickStep; tick <= domainMax + tickStep / 100; tick += tickStep) {
      ticks.push(Number(tick.toFixed(10)));
    }
    var grid = style.showGrid === false ? '' : ticks.map(function(tick) {
      var x = scale(tick);
      return '<line x1="' + fixed(x) + '" y1="' + fixed(margin.top - 8) + '" x2="' + fixed(x) + '" y2="' +
        fixed(margin.top + plotHeight) + '" stroke="#ffffff" stroke-width="1" />';
    }).join('');
    var axis = ticks.map(function(tick) {
      var x = scale(tick);
      return '<line x1="' + fixed(x) + '" y1="' + fixed(margin.top - 13) + '" x2="' + fixed(x) + '" y2="' +
        fixed(margin.top - 5) + '" stroke="' + escapeAttr(runtimeTheme.axisColor) + '" />' +
        '<text x="' + fixed(x) + '" y="' + fixed(margin.top - 20) + '" text-anchor="middle" fill="' +
        escapeAttr(runtimeTheme.labelColor) + '" font-size="11">' + escapeHtml(format(tick)) + '</text>';
    }).join('');
    var bars = data.map(function(item, index) {
      var end = scale(item.value);
      var x = Math.min(zeroX, end);
      var y = margin.top + index * step + step * 0.12;
      var barHeight = step * 0.76;
      var negative = item.value < 0;
      var stateX = zeroX + (negative ? 8 : -8);
      var valueX = end + (negative ? -7 : 7);
      var valueLabel = style.showValueLabels === false ? '' :
        '<text x="' + fixed(valueX) + '" y="' + fixed(y + barHeight * 0.68) + '" text-anchor="' +
        (negative ? 'end' : 'start') + '" fill="' + escapeAttr(runtimeTheme.labelColor) +
        '" font-size="10">' + escapeHtml(format(item.value)) + '</text>';
      return '<g ' + markAttrs(chartId, categoryField, item.row[categoryField], item.index, item.label + ': ' + format(item.value)) + '>' +
        '<rect x="' + fixed(x) + '" y="' + fixed(y) + '" width="' + fixed(Math.abs(end - zeroX)) +
        '" height="' + fixed(barHeight) + '" fill="' + escapeAttr(negative ? negativeColor : positiveColor) + '" />' +
        '<text x="' + fixed(stateX) + '" y="' + fixed(y + barHeight * 0.68) + '" text-anchor="' +
        (negative ? 'start' : 'end') + '" fill="' + escapeAttr(runtimeTheme.labelColor) +
        '" font-size="11">' + escapeHtml(item.label) + '</text>' + valueLabel + '</g>';
    }).join('');
    var title = String(style.axisTitle || chart.title || '← decrease · change · increase →');
    return svgFrame(width, height, '<g class="miao-diverging-bar"><text x="' + fixed(zeroX) +
      '" y="20" text-anchor="middle" fill="' + escapeAttr(runtimeTheme.labelColor) + '" font-size="12">' +
      escapeHtml(title) + '</text>' + grid + axis + '<line x1="' + fixed(zeroX) + '" y1="' +
      fixed(margin.top - 8) + '" x2="' + fixed(zeroX) + '" y2="' + fixed(margin.top + plotHeight) +
      '" stroke="' + escapeAttr(runtimeTheme.labelColor) + '" />' + bars + '</g>');
  };
`
