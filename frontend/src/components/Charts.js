import React from 'react';

// Simple chart components using CSS and SVG
export const BarChart = ({ data, title, color = '#4f46e5' }) => {
  const maxValue = Math.max(...data.map(item => item.value));
  const chartHeight = 200;
  const barWidth = 40;
  const barSpacing = 20;

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <div className="chart">
        <svg width="100%" height={chartHeight} viewBox="0 0 400 200">
          {data.map((item, index) => {
            const barHeight = (item.value / maxValue) * (chartHeight - 40);
            const x = index * (barWidth + barSpacing) + 20;
            const y = chartHeight - barHeight - 20;
            
            return (
              <g key={index}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={color}
                  rx="4"
                />
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 5}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#666"
                >
                  {item.label}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#333"
                  fontWeight="bold"
                >
                  {item.value}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export const PieChart = ({ data, title }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const centerX = 100;
  const centerY = 100;
  const radius = 80;
  
  let currentAngle = -90;
  const colors = ['#4f46e5', '#7c3aed', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <div className="chart">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const angle = (percentage / 100) * 360;
            const endAngle = currentAngle + angle;
            
            const x1 = centerX + radius * Math.cos((currentAngle * Math.PI) / 180);
            const y1 = centerY + radius * Math.sin((currentAngle * Math.PI) / 180);
            const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
            const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');
            
            currentAngle = endAngle;
            
            return (
              <g key={index}>
                <path
                  d={pathData}
                  fill={colors[index % colors.length]}
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={centerX + radius * 1.3 * Math.cos(((currentAngle - angle/2) * Math.PI) / 180)}
                  y={centerY + radius * 1.3 * Math.sin(((currentAngle - angle/2) * Math.PI) / 180)}
                  fontSize="12"
                  fill="#333"
                  textAnchor="middle"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="pie-legend">
          {data.map((item, index) => (
            <div key={index} className="legend-item">
              <div 
                className="legend-color" 
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span>{item.label}: {item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const LineChart = ({ data, title, color = '#4f46e5' }) => {
  const maxValue = Math.max(...data.map(item => item.value));
  const chartHeight = 200;
  const chartWidth = 400;
  const padding = 40;
  const pointRadius = 4;

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <div className="chart">
        <svg width="100%" height={chartHeight} viewBox="0 0 400 200">
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <line
              key={i}
              x1={padding}
              y1={padding + i * ((chartHeight - 2 * padding) / 4)}
              x2={chartWidth - padding}
              y2={padding + i * ((chartHeight - 2 * padding) / 4)}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          
          {/* Line path */}
          <polyline
            points={data.map((item, index) => {
              const x = padding + (index / (data.length - 1)) * (chartWidth - 2 * padding);
              const y = chartHeight - padding - (item.value / maxValue) * (chartHeight - 2 * padding);
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="2"
          />
          
          {/* Data points */}
          {data.map((item, index) => {
            const x = padding + (index / (data.length - 1)) * (chartWidth - 2 * padding);
            const y = chartHeight - padding - (item.value / maxValue) * (chartHeight - 2 * padding);
            
            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r={pointRadius}
                  fill={color}
                />
                <text
                  x={x}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#666"
                >
                  {item.label}
                </text>
                <text
                  x={x}
                  y={y - 10}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#333"
                  fontWeight="bold"
                >
                  {item.value}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export const StatCard = ({ title, value, change, icon, color = '#4f46e5' }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ backgroundColor: color + '20', color }}>
      {icon}
    </div>
    <div className="stat-content">
      <h4 className="stat-title">{title}</h4>
      <p className="stat-value">{value}</p>
      {change && (
        <p className={`stat-change ${change >= 0 ? 'positive' : 'negative'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
        </p>
      )}
    </div>
  </div>
);
