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
  { id: 0, label: 'Mutual Toleration', x: 13, y: 20 },
  { id: 1, label: 'Anti-Democratic Bloc A', x: 28, y: 12 },
  { id: 2, label: 'Independent Courts', x: 47, y: 15 },
  { id: 3, label: 'Civil Service', x: 65, y: 18 },
  { id: 4, label: 'Free Press', x: 82, y: 24 },
  { id: 5, label: 'Institutional Forbearance', x: 20, y: 39 },
  { id: 6, label: 'Congressional Norms', x: 39, y: 35 },
  { id: 7, label: 'Election Administration', x: 56, y: 38 },
  { id: 8, label: 'Security Agencies', x: 75, y: 43 },
  { id: 9, label: 'Federalism', x: 90, y: 47 },
  { id: 10, label: 'Civic Trust', x: 10, y: 61 },
  { id: 11, label: 'Ethics Oversight', x: 29, y: 58 },
  { id: 12, label: 'Checks and Balances', x: 47, y: 59 },
  { id: 13, label: 'Anti-Democratic Bloc B', x: 66, y: 64 },
  { id: 14, label: 'Rule of Law', x: 83, y: 67 },
  { id: 15, label: 'Local Journalism', x: 18, y: 82 },
  { id: 16, label: 'Civic Participation', x: 36, y: 79 },
  { id: 17, label: 'Constitutional Limits', x: 55, y: 84 },
  { id: 18, label: 'Executive Restraint', x: 73, y: 82 },
  { id: 19, label: 'Independent Watchdogs', x: 90, y: 86 },
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

function chanceFor(step, fromId, toId) {
  const value = Math.sin((step + 1) * 1000 + fromId * 37 + toId * 101) * 10000;
  return value - Math.floor(value);
}

function isConvertedByNeighbor(nodes, nodeId, spreadRate, step) {
  return NEIGHBORS[nodeId].some(
    (neighborId) =>
      nodes[neighborId].status === 'autocratic' &&
      chanceFor(step, neighborId, nodeId) < spreadRate,
  );
}

function stepUnrestricted(nodes, spreadRate, step) {
  let changed = false;

  const next = nodes.map((node) => {
    if (node.status !== 'democratic') {
      return node;
    }

    if (isConvertedByNeighbor(nodes, node.id, spreadRate, step)) {
      changed = true;
      return { ...node, status: 'autocratic' };
    }

    return node;
  });

  return { next, changed };
}

function stepMilitant(nodes, spreadRate, threshold, step) {
  let changed = false;

  const next = nodes.map((node) => {
    if (node.status === 'isolated') {
      return node;
    }

    const becameAutocratic =
      node.status === 'democratic' && isConvertedByNeighbor(nodes, node.id, spreadRate, step);
    const autocraticNode = becameAutocratic ? { ...node, status: 'autocratic' } : node;

    if (becameAutocratic) {
      changed = true;
    }

    if (autocraticNode.status === 'autocratic' && chanceFor(step, node.id, node.id) >= threshold) {
      changed = true;
      return { ...autocraticNode, status: 'isolated' };
    }

    return autocraticNode;
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
  const [spreadRate, setSpreadRate] = useState(0.6);
  const [threshold, setThreshold] = useState(0.4);
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
    const unrestrictedResult = stepUnrestricted(leftNetwork, spreadRate, step);
    const militantResult = stepMilitant(rightNetwork, spreadRate, threshold, step);
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

    if (nextStep >= MAX_STEPS) {
      setIsRunning(false);
    }
  }, [leftNetwork, rightNetwork, spreadRate, step, threshold]);

  useEffect(() => {
    if (!isRunning) {
      clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(advanceSimulation, 1000);
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
      <p className="site-credit">Made with ❤️ by Nayel, Vineel, Arhan, Sanjeev, and Pratham.</p>

      <header className="hero">
        <div>
          <h1>The Paradox Threshold</h1>
        </div>
        <div className="legend" aria-label="Node color legend">
          <span><i className="legend-blue" /> Democratic</span>
          <span><i className="legend-red" /> Autocratic</span>
          <span><i className="legend-grey" /> Isolated</span>
        </div>
      </header>

      <section className="explain">
        <h2>What the model shows</h2>
        <p>
          The left network represents unrestricted tolerance. Red nodes keep using the system to
          convert connected democratic institutions. The right network represents militant
          democracy: once a node turns red, a defensive threshold can isolate it before it keeps
          spreading. Lower thresholds mean earlier intervention; higher thresholds mean the system
          waits longer and risks collapse.
        </p>
      </section>

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
          <small>Higher values make anti-democratic influence spread faster.</small>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.01"
            value={spreadRate}
            onChange={(event) => setSpreadRate(Number(event.target.value))}
          />
        </label>

        <label className="slider-control">
          <span>Militant Threshold: {(threshold * 100).toFixed(0)}%</span>
          <small>Lower values isolate red nodes earlier in the right network.</small>
          <input
            type="range"
            min="0.1"
            max="1"
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
          subtitle="No defensive guardrail: autocratic actors stay connected and keep spreading."
          nodes={leftNetwork}
        />
        <NetworkGraph
          title="Militant Democracy Threshold"
          subtitle="Defensive guardrail: red nodes can be isolated before they capture neighbors."
          nodes={rightNetwork}
        />
      </section>

      <section className="chart-card" aria-label="Democratic share over time">
        <div className="network-heading">
          <h2>Democratic Nodes Over Time</h2>
          <p>
            The blue line should survive better when the militant threshold is low, showing why
            institutions need guardrails instead of unlimited tolerance.
          </p>
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

    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
