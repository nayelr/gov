import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './styles.css';

const NODE_COUNT = 20;
const INITIAL_AUTOCRATS = new Set([1, 13]);
const MAX_STEPS = 18;

const BASE_NODES = [
  { id: 0, label: 'Assembly Chair', x: 13, y: 20, resistance: 0.34, extremism: 0.38 },
  { id: 1, label: 'Hardline Bloc A', x: 28, y: 12, resistance: 0.12, extremism: 0.91 },
  { id: 2, label: 'Courts', x: 47, y: 15, resistance: 0.54, extremism: 0.22 },
  { id: 3, label: 'Civil Service', x: 65, y: 18, resistance: 0.46, extremism: 0.31 },
  { id: 4, label: 'Media Board', x: 82, y: 24, resistance: 0.42, extremism: 0.43 },
  { id: 5, label: 'Coalition Left', x: 20, y: 39, resistance: 0.28, extremism: 0.49 },
  { id: 6, label: 'Budget Office', x: 39, y: 35, resistance: 0.39, extremism: 0.35 },
  { id: 7, label: 'Election Agency', x: 56, y: 38, resistance: 0.58, extremism: 0.24 },
  { id: 8, label: 'Security Panel', x: 75, y: 43, resistance: 0.26, extremism: 0.58 },
  { id: 9, label: 'Regional Caucus', x: 90, y: 47, resistance: 0.31, extremism: 0.52 },
  { id: 10, label: 'Labor Committee', x: 10, y: 61, resistance: 0.33, extremism: 0.41 },
  { id: 11, label: 'Ethics Office', x: 29, y: 58, resistance: 0.51, extremism: 0.27 },
  { id: 12, label: 'Upper Chamber', x: 47, y: 59, resistance: 0.45, extremism: 0.36 },
  { id: 13, label: 'Hardline Bloc B', x: 66, y: 64, resistance: 0.14, extremism: 0.88 },
  { id: 14, label: 'Police Oversight', x: 83, y: 67, resistance: 0.29, extremism: 0.57 },
  { id: 15, label: 'Public Broadcaster', x: 18, y: 82, resistance: 0.37, extremism: 0.46 },
  { id: 16, label: 'Municipal League', x: 36, y: 79, resistance: 0.43, extremism: 0.39 },
  { id: 17, label: 'Constitutional Court', x: 55, y: 84, resistance: 0.64, extremism: 0.2 },
  { id: 18, label: 'Interior Ministry', x: 73, y: 82, resistance: 0.32, extremism: 0.63 },
  { id: 19, label: 'Independent Watchdog', x: 90, y: 86, resistance: 0.61, extremism: 0.25 },
];

const EDGES = [
  [0, 1],
  [0, 5],
  [0, 6],
  [1, 2],
  [1, 5],
  [1, 6],
  [2, 3],
  [2, 6],
  [2, 7],
  [3, 4],
  [3, 7],
  [3, 8],
  [4, 8],
  [4, 9],
  [5, 6],
  [5, 10],
  [5, 11],
  [6, 7],
  [6, 11],
  [6, 12],
  [7, 8],
  [7, 12],
  [7, 13],
  [8, 9],
  [8, 13],
  [8, 14],
  [9, 14],
  [10, 11],
  [10, 15],
  [11, 12],
  [11, 15],
  [11, 16],
  [12, 13],
  [12, 16],
  [12, 17],
  [13, 14],
  [13, 17],
  [13, 18],
  [14, 18],
  [14, 19],
  [15, 16],
  [16, 17],
  [17, 18],
  [18, 19],
];

const NEIGHBORS = EDGES.reduce(
  (map, [a, b]) => {
    map[a].push(b);
    map[b].push(a);
    return map;
  },
  Array.from({ length: NODE_COUNT }, () => []),
);

const createNetwork = () =>
  BASE_NODES.map((node) => ({
    ...node,
    status: INITIAL_AUTOCRATS.has(node.id) ? 'autocratic' : 'democratic',
  }));

const percentDemocratic = (nodes) =>
  Math.round((nodes.filter((node) => node.status === 'democratic').length / NODE_COUNT) * 100);

const statusLabel = {
  democratic: 'Democratic',
  autocratic: 'Autocratic',
  isolated: 'Isolated by threshold',
};

function stepUnrestricted(nodes, spreadRate) {
  let changed = false;

  const next = nodes.map((node) => {
    if (node.status !== 'democratic') {
      return node;
    }

    const redPressure =
      NEIGHBORS[node.id].filter((neighborId) => nodes[neighborId].status === 'autocratic').length /
      NEIGHBORS[node.id].length;

    if (redPressure * spreadRate >= node.resistance) {
      changed = true;
      return { ...node, status: 'autocratic' };
    }

    return node;
  });

  return { next, changed };
}

function stepMilitant(nodes, spreadRate, threshold) {
  let changed = false;

  const next = nodes.map((node) => {
    if (node.status === 'isolated') {
      return node;
    }

    const activeRedNeighbors = NEIGHBORS[node.id].filter(
      (neighborId) => nodes[neighborId].status === 'autocratic',
    ).length;
    const redPressure = activeRedNeighbors / NEIGHBORS[node.id].length;
    const thresholdRisk = node.extremism * 0.72 + redPressure * spreadRate * 0.55;

    if (node.status === 'autocratic' && thresholdRisk >= threshold) {
      changed = true;
      return { ...node, status: 'isolated' };
    }

    if (activeRedNeighbors > 0 && thresholdRisk >= threshold) {
      changed = true;
      return { ...node, status: 'isolated' };
    }

    if (
      node.status === 'democratic' &&
      redPressure * spreadRate >= node.resistance &&
      thresholdRisk < threshold
    ) {
      changed = true;
      return { ...node, status: 'autocratic' };
    }

    return node;
  });

  return { next, changed };
}

function NetworkGraph({ title, subtitle, nodes }) {
  return (
    <section className="network-card" aria-label={title}>
      <div className="network-heading">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <svg className="network-svg" viewBox="0 0 100 100" role="img" aria-label={`${title} graph`}>
        <g>
          {EDGES.map(([a, b]) => (
            <line
              key={`${a}-${b}`}
              x1={nodes[a].x}
              y1={nodes[a].y}
              x2={nodes[b].x}
              y2={nodes[b].y}
              className={`edge ${
                nodes[a].status === 'isolated' || nodes[b].status === 'isolated'
                  ? 'edge-muted'
                  : ''
              }`}
            />
          ))}
        </g>

        <g>
          {nodes.map((node) => (
            <g key={node.id} className={`node node-${node.status}`}>
              <circle cx={node.x} cy={node.y} r="3.7">
                <title>{`${node.label}: ${statusLabel[node.status]}`}</title>
              </circle>
              <text x={node.x} y={node.y + 1.1}>
                {node.id + 1}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </section>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="stat-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function App() {
  const [leftNetwork, setLeftNetwork] = useState(createNetwork);
  const [rightNetwork, setRightNetwork] = useState(createNetwork);
  const [spreadRate, setSpreadRate] = useState(0.78);
  const [threshold, setThreshold] = useState(0.58);
  const [history, setHistory] = useState(() => [
    {
      step: 0,
      unrestricted: percentDemocratic(createNetwork()),
      militant: percentDemocratic(createNetwork()),
    },
  ]);
  const [step, setStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);

  const resetSimulation = useCallback(() => {
    const freshLeft = createNetwork();
    const freshRight = createNetwork();
    setLeftNetwork(freshLeft);
    setRightNetwork(freshRight);
    setHistory([
      {
        step: 0,
        unrestricted: percentDemocratic(freshLeft),
        militant: percentDemocratic(freshRight),
      },
    ]);
    setStep(0);
    setIsRunning(false);
  }, []);

  const advanceSimulation = useCallback(() => {
    const unrestrictedResult = stepUnrestricted(leftNetwork, spreadRate);
    const militantResult = stepMilitant(rightNetwork, spreadRate, threshold);
    const nextStep = step + 1;

    setLeftNetwork(unrestrictedResult.next);
    setRightNetwork(militantResult.next);
    setHistory((currentHistory) => [
      ...currentHistory,
      {
        step: nextStep,
        unrestricted: percentDemocratic(unrestrictedResult.next),
        militant: percentDemocratic(militantResult.next),
      },
    ]);
    setStep(nextStep);

    if (nextStep >= MAX_STEPS || (!unrestrictedResult.changed && !militantResult.changed)) {
      setIsRunning(false);
    }
  }, [leftNetwork, rightNetwork, spreadRate, step, threshold]);

  useEffect(() => {
    if (!isRunning) {
      clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(advanceSimulation, 850);
    return () => clearInterval(timerRef.current);
  }, [advanceSimulation, isRunning]);

  const counts = useMemo(
    () => ({
      leftDemocratic: percentDemocratic(leftNetwork),
      rightDemocratic: percentDemocratic(rightNetwork),
      isolated: rightNetwork.filter((node) => node.status === 'isolated').length,
    }),
    [leftNetwork, rightNetwork],
  );

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Interactive systems dynamics</p>
          <h1>The Paradox Threshold</h1>
          <p className="hero-copy">
            Watch identical democratic networks face autocratic contagion. The left network tolerates
            every actor; the right applies defensive isolation when extremism crosses a threshold.
          </p>
        </div>
        <div className="legend" aria-label="Node color legend">
          <span><i className="legend-blue" /> Democratic</span>
          <span><i className="legend-red" /> Autocratic</span>
          <span><i className="legend-grey" /> Isolated</span>
        </div>
      </header>

      <section className="controls-panel" aria-label="Simulation controls">
        <div className="button-row">
          <button
            className="primary-button"
            onClick={() => setIsRunning((running) => !running)}
            disabled={step >= MAX_STEPS}
          >
            {isRunning ? 'Pause Simulation' : 'Run Simulation'}
          </button>
          <button className="secondary-button" onClick={resetSimulation}>
            Reset
          </button>
        </div>

        <label className="slider-control">
          <span>Extremism Spread Rate: {(spreadRate * 100).toFixed(0)}%</span>
          <input
            type="range"
            min="0.35"
            max="1"
            step="0.01"
            value={spreadRate}
            onChange={(event) => setSpreadRate(Number(event.target.value))}
          />
        </label>

        <label className="slider-control">
          <span>Militant Threshold: {(threshold * 100).toFixed(0)}%</span>
          <input
            type="range"
            min="0.32"
            max="0.9"
            step="0.01"
            value={threshold}
            onChange={(event) => setThreshold(Number(event.target.value))}
          />
        </label>
      </section>

      <section className="stats-grid" aria-label="Current simulation status">
        <StatPill label="Step" value={step} />
        <StatPill label="Unrestricted democratic" value={`${counts.leftDemocratic}%`} />
        <StatPill label="Militant democratic" value={`${counts.rightDemocratic}%`} />
        <StatPill label="Right network isolated" value={counts.isolated} />
      </section>

      <section className="networks-grid">
        <NetworkGraph
          title="Unrestricted Tolerance"
          subtitle="Autocratic actors remain connected and keep converting neighbors."
          nodes={leftNetwork}
        />
        <NetworkGraph
          title="Militant Democracy Threshold"
          subtitle="Exposed extremist actors are isolated before they can amplify contagion."
          nodes={rightNetwork}
        />
      </section>

      <section className="chart-card" aria-label="Democratic share over time">
        <div className="network-heading">
          <h2>Democratic Nodes Over Time</h2>
          <p>Higher lines mean more institutions remain democratic.</p>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 16, right: 20, left: 0, bottom: 12 }}>
              <CartesianGrid stroke="#ddd" />
              <XAxis dataKey="step" label={{ value: 'Step', position: 'insideBottom', offset: -4 }} />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="unrestricted"
                name="Unrestricted Tolerance"
                stroke="#d62728"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="militant"
                name="Militant Democracy Threshold"
                stroke="#1f77b4"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <footer className="site-credit">
        Made with love by Nayel, Vineel, Arhan, Sanjeev, and Pratham.
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
