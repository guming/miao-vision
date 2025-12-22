<script lang="ts">
/**
 * Calendar Heatmap Component
 *
 * Displays a GitHub-style calendar heatmap for visualizing daily values.
 * Shows activity patterns over time with color-coded intensity.
 *
 * @example
 * ```calendar-heatmap
 * data: daily_activity
 * dateColumn: date
 * valueColumn: count
 * colorScheme: green
 * ```
 */

import type { CalendarHeatmapData, CalendarDay } from './types'

interface Props {
  data: CalendarHeatmapData
}

let { data }: Props = $props()

const cellSize = $derived(data.config.cellSize || 12)
const cellGap = $derived(data.config.cellGap || 2)
const showMonthLabels = $derived(data.config.showMonthLabels !== false)
const showDayLabels = $derived(data.config.showDayLabels !== false)
const showLegend = $derived(data.config.showLegend !== false)

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const displayDayLabels = $derived(
  showDayLabels ? [dayLabels[1], dayLabels[3], dayLabels[5]] : []
)

const totalWidth = $derived(
  data.weeks.length * (cellSize + cellGap) + (showDayLabels ? 30 : 0)
)

const totalHeight = $derived(
  7 * (cellSize + cellGap) + (showMonthLabels ? 20 : 0)
)

let hoveredDay: CalendarDay | null = $state(null)

function handleMouseEnter(day: CalendarDay | null) {
  hoveredDay = day
}

function handleMouseLeave() {
  hoveredDay = null
}
</script>

<div class="calendar-heatmap {data.config.class || ''}">
  {#if data.title}
    <div class="calendar-title">{data.title}</div>
  {/if}

  <div class="calendar-container">
    <svg
      width={totalWidth}
      height={totalHeight}
      class="calendar-svg"
    >
      <!-- Month labels -->
      {#if showMonthLabels}
        {#each data.monthLabels as month}
          <text
            x={(showDayLabels ? 30 : 0) + month.weekIndex * (cellSize + cellGap)}
            y="12"
            class="month-label"
          >
            {month.name}
          </text>
        {/each}
      {/if}

      <!-- Day labels -->
      {#if showDayLabels}
        {#each displayDayLabels as label, i}
          <text
            x="0"
            y={(showMonthLabels ? 20 : 0) + (1 + i * 2) * (cellSize + cellGap) + cellSize / 2 + 4}
            class="day-label"
          >
            {label}
          </text>
        {/each}
      {/if}

      <!-- Calendar cells -->
      <g transform="translate({showDayLabels ? 30 : 0}, {showMonthLabels ? 20 : 0})">
        {#each data.weeks as week}
          {#each week.days as day}
            {#if day}
              <rect
                x={week.index * (cellSize + cellGap)}
                y={day.dayOfWeek * (cellSize + cellGap)}
                width={cellSize}
                height={cellSize}
                rx="2"
                fill={day.color}
                class="calendar-cell"
                class:has-value={day.value > 0}
                role="img"
                aria-label={day.tooltip}
                onmouseenter={() => handleMouseEnter(day)}
                onmouseleave={handleMouseLeave}
              />
            {/if}
          {/each}
        {/each}
      </g>
    </svg>

    <!-- Tooltip -->
    {#if hoveredDay}
      <div class="calendar-tooltip">
        {hoveredDay.tooltip}
      </div>
    {/if}
  </div>

  <!-- Legend -->
  {#if showLegend}
    <div class="calendar-legend">
      <span class="legend-label">Less</span>
      {#each data.legend as item}
        <div
          class="legend-cell"
          style="background-color: {item.color}; width: {cellSize}px; height: {cellSize}px;"
          title={item.label}
        ></div>
      {/each}
      <span class="legend-label">More</span>
    </div>
  {/if}

  <!-- Summary stats -->
  <div class="calendar-stats">
    <span class="stat">
      <strong>{data.totalValue.toLocaleString()}</strong> total
    </span>
    <span class="stat">
      <strong>{data.daysWithData}</strong> days with activity
    </span>
  </div>
</div>

<style>
.calendar-heatmap {
  font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
  width: 100%;
}

.calendar-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
  margin-bottom: 0.75rem;
}

.calendar-container {
  position: relative;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.calendar-svg {
  display: block;
}

.month-label {
  font-size: 10px;
  fill: var(--text-secondary, #6b7280);
  font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
}

.day-label {
  font-size: 9px;
  fill: var(--text-secondary, #6b7280);
  font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
}

.calendar-cell {
  stroke: var(--border-color, #e5e7eb);
  stroke-width: 1;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.calendar-cell:hover {
  stroke: var(--text-primary, #1f2937);
  stroke-width: 2;
}

.calendar-tooltip {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-primary, #1f2937);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
}

.calendar-legend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.75rem;
  justify-content: flex-end;
}

.legend-label {
  font-size: 0.7rem;
  color: var(--text-secondary, #6b7280);
  margin: 0 0.25rem;
}

.legend-cell {
  border-radius: 2px;
  border: 1px solid var(--border-color, #e5e7eb);
}

.calendar-stats {
  display: flex;
  gap: 1.5rem;
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: var(--text-secondary, #6b7280);
}

.stat strong {
  color: var(--text-primary, #1f2937);
  font-weight: 600;
}

/* Responsive */
@media (max-width: 640px) {
  .calendar-legend {
    justify-content: flex-start;
  }

  .calendar-stats {
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>
