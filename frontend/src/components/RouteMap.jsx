const WIDTH = 520;
const HEIGHT = 300;
const PADDING = 40;

export default function RouteMap({ stops, vehicle }) {
  if (!stops || stops.length === 0) {
    return <div className="map-empty">This route has no stops with coordinates, so a position cannot be drawn.</div>;
  }

  const points = vehicle?.latitude != null ? [...stops, vehicle] : stops;
  const lngScale = Math.cos((stops[0].latitude * Math.PI) / 180);
  const xs = points.map((p) => p.longitude * lngScale);
  const ys = points.map((p) => p.latitude);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 0.002);
  const scale = Math.min((WIDTH - PADDING * 2) / span, (HEIGHT - PADDING * 2) / span);
  const offsetX = (WIDTH - (maxX - minX) * scale) / 2;
  const offsetY = (HEIGHT - (maxY - minY) * scale) / 2;

  const project = (p) => [
    offsetX + (p.longitude * lngScale - minX) * scale,
    HEIGHT - (offsetY + (p.latitude - minY) * scale),
  ];
  const path = stops.map(project);

  return (
    <div className="map">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Simulated vehicle position on route">
        <polyline points={path.map((p) => p.join(',')).join(' ')} className="map-route" />
        {path.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="6" className="map-stop" />
            <text x={x + 10} y={y - 8} className="map-label">{stops[i].name}</text>
          </g>
        ))}
        {vehicle?.latitude != null && (() => {
          const [x, y] = project(vehicle);
          return (
            <g>
              <rect x={x - 9} y={y - 9} width="18" height="18" rx="3" className="map-vehicle" />
              <text x={x} y={y + 26} textAnchor="middle" className="map-vehicle-label">{vehicle.name}</text>
            </g>
          );
        })()}
      </svg>
      <div className="map-caption">Schematic view · Simulated GPS position, not live hardware data</div>
    </div>
  );
}
