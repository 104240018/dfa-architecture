/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Table as TableIcon, 
  Play, 
  RotateCcw, 
  ChevronRight, 
  CheckCircle2, 
  XCircle,
  Info,
  Plus,
  Minus,
  CircleDot
} from 'lucide-react';
import * as d3 from 'd3';

// --- Types ---

type Transitions = Record<string, Record<string, string>>;

interface DFAState {
  id: string;
  isStart: boolean;
  isAccept: boolean;
}

// --- Constants ---

const MAX_STATES = 10;
const MAX_ALPHABET = 5;
const ALPHABET_CHARS = 'abcdefghijklmnopqrstuvwxyz'.split('');

// --- Components ---

export default function App() {
  // --- State ---
  const [numStates, setNumStates] = useState(3);
  const [alphabetSize, setAlphabetSize] = useState(2);
  const [transitions, setTransitions] = useState<Transitions>({});
  const [startState, setStartState] = useState('q0');
  const [acceptStates, setAcceptStates] = useState<Set<string>>(new Set(['q1']));
  
  // Simulation State
  const [inputString, setInputString] = useState('');
  const [currentSimIndex, setCurrentSimIndex] = useState(-1); // -1 means not started
  const [simState, setSimState] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  /** manual: click Step for each symbol; auto: pause then run animated steps */
  const [stepMode, setStepMode] = useState<'manual' | 'auto'>('manual');
  /** Seconds between finished transitions in auto mode (animation time is extra). */
  const [autoStepSeconds, setAutoStepSeconds] = useState(1.5);
  const [activeEdge, setActiveEdge] = useState<{ from: string; to: string; char: string } | null>(null);
  const [arrivalState, setArrivalState] = useState<string | null>(null);
  const [isStepAnimating, setIsStepAnimating] = useState(false);

  const simStateRef = useRef(simState);
  const currentSimIndexRef = useRef(currentSimIndex);
  const stepAnimLockRef = useRef(false);
  simStateRef.current = simState;
  currentSimIndexRef.current = currentSimIndex;

  // --- Derived Data ---
  const states = useMemo(() => 
    Array.from({ length: numStates }, (_, i) => `q${i}`), 
  [numStates]);

  const alphabet = useMemo(() => 
    ALPHABET_CHARS.slice(0, alphabetSize), 
  [alphabetSize]);

  // Initialize/Sync transitions when states or alphabet change
  useEffect(() => {
    setTransitions(prev => {
      const next: Transitions = {};
      states.forEach(s => {
        next[s] = {};
        alphabet.forEach(char => {
          // Keep existing if valid, else default to q0
          if (prev[s] && prev[s][char] && states.includes(prev[s][char])) {
            next[s][char] = prev[s][char];
          } else {
            next[s][char] = states[0];
          }
        });
      });
      return next;
    });

    // Sync start state
    if (!states.includes(startState)) {
      setStartState(states[0]);
    }

    // Sync accept states
    setAcceptStates(prev => {
      const next = new Set<string>();
      prev.forEach(s => {
        if (states.includes(s)) next.add(s);
      });
      return next;
    });
  }, [states, alphabet]);

  // --- Handlers ---

  const handleTransitionChange = (from: string, char: string, to: string) => {
    setTransitions(prev => ({
      ...prev,
      [from]: {
        ...prev[from],
        [char]: to
      }
    }));
  };

  const toggleAcceptState = (stateId: string) => {
    setAcceptStates(prev => {
      const next = new Set(prev);
      if (next.has(stateId)) next.delete(stateId);
      else next.add(stateId);
      return next;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase();
    // Only allow characters in the alphabet
    const filtered = val.split('').filter(char => alphabet.includes(char)).join('');
    setInputString(filtered);
    resetSimulation();
  };

  const resetSimulation = () => {
    stepAnimLockRef.current = false;
    setCurrentSimIndex(-1);
    setSimState(null);
    setIsSimulating(false);
    setActiveEdge(null);
    setArrivalState(null);
    setIsStepAnimating(false);
  };

  const startSimulation = () => {
    setActiveEdge(null);
    setArrivalState(null);
    setIsStepAnimating(false);
    setCurrentSimIndex(0);
    setSimState(startState);
    setIsSimulating(true);
  };

  const EDGE_MS = 550;
  const ARRIVAL_MS = 750;

  const performAnimatedStep = useCallback(async () => {
    if (stepAnimLockRef.current) return;
    const idx = currentSimIndexRef.current;
    const from = simStateRef.current;
    if (idx < 0 || idx >= inputString.length || !from) return;

    const char = inputString[idx];
    const to = transitions[from]?.[char];
    if (!to) return;

    stepAnimLockRef.current = true;
    try {
      setIsStepAnimating(true);
      setActiveEdge({ from, to, char });
      await new Promise<void>(r => setTimeout(r, EDGE_MS));

      setActiveEdge(null);
      setArrivalState(to);
      await new Promise<void>(r => setTimeout(r, ARRIVAL_MS));

      const nextIdx = idx + 1;
      setSimState(to);
      setCurrentSimIndex(nextIdx);
      setArrivalState(null);
      if (nextIdx >= inputString.length) {
        setIsSimulating(false);
      }
      setIsStepAnimating(false);
    } finally {
      stepAnimLockRef.current = false;
    }
  }, [inputString, transitions]);

  const handleStepClick = async () => {
    if (currentSimIndex === -1) {
      startSimulation();
      return;
    }
    if (isStepAnimating) return;
    await performAnimatedStep();
  };

  const runFullSimulation = () => {
    stepAnimLockRef.current = false;
    setActiveEdge(null);
    setArrivalState(null);
    setIsStepAnimating(false);
    let currentState = startState;
    for (let i = 0; i < inputString.length; i++) {
      const char = inputString[i];
      currentState = transitions[currentState][char];
    }
    setSimState(currentState);
    setCurrentSimIndex(inputString.length);
    setIsSimulating(false);
  };

  useEffect(() => {
    if (stepMode !== 'auto') return;
    if (!isSimulating) return;
    if (isStepAnimating) return;
    if (currentSimIndex < 0) return;
    if (currentSimIndex >= inputString.length) return;

    const delayMs = Math.max(200, autoStepSeconds * 1000);
    const id = window.setTimeout(() => {
      void performAnimatedStep();
    }, delayMs);
    return () => window.clearTimeout(id);
  }, [
    stepMode,
    isSimulating,
    isStepAnimating,
    currentSimIndex,
    inputString.length,
    autoStepSeconds,
    performAnimatedStep,
  ]);

  const isAccepted = currentSimIndex === inputString.length && simState !== null && acceptStates.has(simState);

  const simComplete = currentSimIndex >= inputString.length && currentSimIndex !== -1;
  const startStepDisabled =
    isStepAnimating ||
    simComplete ||
    (stepMode === 'auto' && currentSimIndex !== -1) ||
    (inputString.length === 0 && currentSimIndex === -1);
  const runDisabled = isStepAnimating || simComplete;

  // --- Visualization ---
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 600;
    const height = 400;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const defs = svg.append("defs");
    const glowFilter = defs.append("filter").attr("id", "edge-glow").attr("x", "-40%").attr("y", "-40%").attr("width", "180%").attr("height", "180%");
    glowFilter.append("feGaussianBlur").attr("stdDeviation", 2.5).attr("result", "blur");
    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "blur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#666");
    defs.append("marker")
      .attr("id", "arrowhead-active")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#ca8a04");

    interface D3Node extends d3.SimulationNodeDatum {
      id: string;
    }

    interface D3Link extends d3.SimulationLinkDatum<D3Node> {
      source: D3Node;
      target: D3Node;
      /** Comma-separated symbols for display (e.g. "a,b") */
      label: string;
      /** Symbols on this edge — used to highlight the correct transition */
      chars: string[];
    }

    const NODE_R = 20;
    const SELF_LOOP_H = 44;
    const SELF_LOOP_W = 40;

    const nodes: D3Node[] = states.map(id => ({ id }));
    const links: D3Link[] = [];
    const edgeGroups = new Map<string, string[]>();

    states.forEach(from => {
      alphabet.forEach(char => {
        const toId = transitions[from]?.[char];
        if (toId) {
          const key = `${from}\0${toId}`;
          if (!edgeGroups.has(key)) edgeGroups.set(key, []);
          edgeGroups.get(key)!.push(char);
        }
      });
    });

    edgeGroups.forEach((chars, key) => {
      const sep = key.indexOf('\0');
      const fromId = key.slice(0, sep);
      const toId = key.slice(sep + 1);
      const source = nodes.find(n => n.id === fromId);
      const target = nodes.find(n => n.id === toId);
      if (!source || !target) return;
      const sorted = [...chars].sort();
      links.push({
        source,
        target,
        label: sorted.join(','),
        chars: sorted,
      });
    });

    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force("link", d3.forceLink<D3Node, D3Link>(links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50));

    const link = svg.append("g")
      .selectAll<SVGPathElement, D3Link>("path")
      .data(links)
      .enter().append("path")
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrowhead)")
      .attr("filter", "none");

    const linkLabel = svg.append("g")
      .selectAll<SVGTextElement, D3Link>("text")
      .data(links)
      .enter().append("text")
      .attr("font-size", "12px")
      .attr("fill", "#666")
      .attr("font-weight", "600")
      .attr("text-anchor", "middle")
      .text(d => d.label);

    const isActiveLink = (d: D3Link) =>
      !!activeEdge &&
      d.source.id === activeEdge.from &&
      d.target.id === activeEdge.to &&
      d.chars.includes(activeEdge.char);

    link.each(function (d) {
      const active = isActiveLink(d);
      d3.select(this)
        .attr("stroke", active ? "#ca8a04" : "#999")
        .attr("stroke-width", active ? 4 : 1.5)
        .attr("marker-end", active ? "url(#arrowhead-active)" : "url(#arrowhead)")
        .attr("filter", active ? "url(#edge-glow)" : "none")
        .attr("opacity", active ? 1 : 0.85);
    });

    linkLabel.each(function (d) {
      const active = isActiveLink(d);
      d3.select(this)
        .attr("fill", active ? "#a16207" : "#666")
        .attr("font-size", active ? "13px" : "12px");
    });

    const node = svg.append("g")
      .selectAll<SVGGElement, D3Node>("g")
      .data(nodes)
      .enter().append("g")
      .call(d3.drag<SVGGElement, D3Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    const nodeFill = (id: string) => {
      if (arrivalState === id) return "#22c55e";
      if (simState === id && arrivalState === null) return "#3b82f6";
      return "#fff";
    };

    const nodeLabelFill = (id: string) => {
      if (arrivalState === id) return "#fff";
      if (simState === id && arrivalState === null) return "#fff";
      return "#333";
    };

    const innerStroke = (id: string) => {
      if (arrivalState === id) return "#fff";
      if (simState === id && arrivalState === null) return "#fff";
      return "#333";
    };

    node.append("circle")
      .attr("r", 20)
      .attr("fill", d => nodeFill(d.id))
      .attr("stroke", d => d.id === startState ? "#10b981" : "#333")
      .attr("stroke-width", d => d.id === startState ? 3 : 1.5);

    // Inner circle for accept states
    node.filter(d => acceptStates.has(d.id))
      .append("circle")
      .attr("r", 16)
      .attr("fill", "none")
      .attr("stroke", d => innerStroke(d.id))
      .attr("stroke-width", 1);

    node.append("text")
      .attr("dy", ".35em")
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("fill", d => nodeLabelFill(d.id))
      .text(d => d.id);

    simulation.on("tick", () => {
      link.attr("d", d => {
        const sx = d.source.x ?? 0;
        const sy = d.source.y ?? 0;
        const tx = d.target.x ?? 0;
        const ty = d.target.y ?? 0;

        const dx = tx - sx;
        const dy = ty - sy;
        const dr = Math.sqrt(dx * dx + dy * dy);

        // Self-loop: symmetric cubic bulge above the node; label sits on the arc midpoint
        if (d.source.id === d.target.id) {
          const x0 = sx + NODE_R * 0.92;
          const x1 = sx - NODE_R * 0.92;
          return `M ${x0},${sy} C ${sx + SELF_LOOP_W},${sy - SELF_LOOP_H} ${sx - SELF_LOOP_W},${sy - SELF_LOOP_H} ${x1},${sy}`;
        }

        return `M${sx},${sy}A${dr},${dr} 0 0,1 ${tx},${ty}`;
      });

      linkLabel.attr("transform", d => {
        const sx = d.source.x ?? 0;
        const sy = d.source.y ?? 0;
        const tx = d.target.x ?? 0;
        const ty = d.target.y ?? 0;

        if (d.source.id === d.target.id) {
          const midY = sy - SELF_LOOP_H * 0.75;
          return `translate(${sx}, ${midY})`;
        }
        const x = (sx + tx) / 2;
        const y = (sy + ty) / 2;
        const rdx = tx - sx;
        const rdy = ty - sy;
        const len = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
        const nx = -rdy / len * 20;
        const ny = rdx / len * 20;
        return `translate(${x + nx}, ${y + ny})`;
      });

      node.attr("transform", d => `translate(${d.x ?? 0}, ${d.y ?? 0})`);
    });

    function dragstarted(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => simulation.stop();
  }, [states, alphabet, transitions, startState, acceptStates, simState, activeEdge, arrivalState]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <CircleDot size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Automata Visualizer</h1>
              <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">Step through your DFA</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Valid Configuration
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Configuration */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* 1. Basic Setup */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Settings size={18} className="text-blue-600" />
              <h2 className="font-semibold">Machine Configuration</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                  Number of States (Q)
                </label>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setNumStates(Math.max(1, numStates - 1))}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-xl font-mono font-bold w-8 text-center">{numStates}</span>
                  <button 
                    onClick={() => setNumStates(Math.min(MAX_STATES, numStates + 1))}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                  <span className="text-xs text-gray-400 font-mono ml-auto">MAX: {MAX_STATES}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                  Alphabet Size (Σ)
                </label>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setAlphabetSize(Math.max(1, alphabetSize - 1))}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-xl font-mono font-bold w-8 text-center">{alphabetSize}</span>
                  <button 
                    onClick={() => setAlphabetSize(Math.min(MAX_ALPHABET, alphabetSize + 1))}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                  <span className="text-xs text-gray-400 font-mono ml-auto">MAX: {MAX_ALPHABET}</span>
                </div>
                <div className="mt-2 flex gap-1">
                  {alphabet.map(char => (
                    <span key={char} className="px-2 py-1 bg-gray-100 rounded text-xs font-mono font-bold text-gray-600">
                      {char}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 2. State Properties */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <CheckCircle2 size={18} className="text-blue-600" />
              <h2 className="font-semibold">State Properties</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100">
                    <th className="pb-3 font-medium text-gray-400 uppercase text-[10px] tracking-widest">State</th>
                    <th className="pb-3 font-medium text-gray-400 uppercase text-[10px] tracking-widest text-center">Start</th>
                    <th className="pb-3 font-medium text-gray-400 uppercase text-[10px] tracking-widest text-center">Accept</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {states.map(s => (
                    <tr key={s} className="group">
                      <td className="py-3 font-mono font-bold">{s}</td>
                      <td className="py-3 text-center">
                        <input 
                          type="radio" 
                          name="startState" 
                          checked={startState === s}
                          onChange={() => setStartState(s)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={acceptStates.has(s)}
                          onChange={() => toggleAcceptState(s)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Column: Transitions & Simulation */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* 3. Transition Table */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <TableIcon size={18} className="text-blue-600" />
              <h2 className="font-semibold">Transition Function (δ)</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 bg-gray-50 border border-gray-100 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      δ(q, σ)
                    </th>
                    {alphabet.map(char => (
                      <th key={char} className="p-3 bg-gray-50 border border-gray-100 text-center font-mono font-bold text-blue-600">
                        {char}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {states.map(s => (
                    <tr key={s}>
                      <td className="p-3 border border-gray-100 font-mono font-bold bg-gray-50/50">
                        {s}
                      </td>
                      {alphabet.map(char => (
                        <td key={char} className="p-2 border border-gray-100">
                          <select
                            value={transitions[s]?.[char] || states[0]}
                            onChange={(e) => handleTransitionChange(s, char, e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          >
                            {states.map(target => (
                              <option key={target} value={target}>{target}</option>
                            ))}
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[11px] text-gray-400 flex items-center gap-1.5 italic">
              <Info size={12} />
              Every cell is pre-populated with a valid state. No missing transitions possible.
            </p>
          </section>

          {/* 4. Visualization & Simulation */}
          <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Play size={18} className="text-blue-600" />
                <h2 className="font-semibold">Interactive Simulation</h2>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={resetSimulation}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                  title="Reset Simulation"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
            </div>

            {/* Graph Area */}
            <div className="relative bg-gray-50/50 h-[400px] overflow-hidden">
              <svg 
                ref={svgRef} 
                className="w-full h-full cursor-grab active:cursor-grabbing"
              />
              
              {/* Legend */}
              <div className="absolute bottom-4 left-4 flex flex-col gap-2 bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-500 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-emerald-500" />
                  Start State
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-gray-800 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full border border-gray-800" />
                  </span>
                  Accept State
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600" />
                  Current State
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-0.5 bg-amber-500 rounded shadow-[0_0_6px_#fbbf24]" />
                  Active Transition
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  Arrival (next state)
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="p-6 space-y-6 bg-white">
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Input String (Σ*)
                </label>
                <div className="flex flex-wrap gap-3 items-stretch">
                  <input 
                    type="text"
                    value={inputString}
                    onChange={handleInputChange}
                    placeholder="Enter string (e.g. abba)"
                    className="flex-1 min-w-[200px] bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-300"
                  />
                  <button 
                    type="button"
                    onClick={() => void handleStepClick()}
                    disabled={startStepDisabled}
                    className="px-6 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
                  >
                    {currentSimIndex === -1 ? 'Start' : 'Step'}
                    <ChevronRight size={18} />
                  </button>
                  <button 
                    type="button"
                    onClick={runFullSimulation}
                    disabled={runDisabled}
                    className="px-6 border border-blue-600 text-blue-600 rounded-xl font-bold hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Run
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 pt-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">
                    Step playback
                  </span>
                  <div className="flex rounded-xl border border-gray-200 p-0.5 bg-gray-50/80">
                    <button
                      type="button"
                      onClick={() => setStepMode('manual')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        stepMode === 'manual'
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Manual (click each step)
                    </button>
                    <button
                      type="button"
                      onClick={() => setStepMode('auto')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        stepMode === 'auto'
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Auto (timed steps)
                    </button>
                  </div>
                  {stepMode === 'auto' && (
                    <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                      <label htmlFor="auto-step-delay" className="text-xs text-gray-500 whitespace-nowrap">
                        Pause between steps
                      </label>
                      <input
                        id="auto-step-delay"
                        type="range"
                        min={0.5}
                        max={3}
                        step={0.1}
                        value={autoStepSeconds}
                        onChange={(e) => setAutoStepSeconds(Number(e.target.value))}
                        className="flex-1 h-2 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-xs font-mono tabular-nums text-gray-600 w-14 text-right">
                        {autoStepSeconds.toFixed(1)}s
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {alphabet.map(char => (
                    <button
                      key={char}
                      onClick={() => setInputString(prev => prev + char)}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-mono font-bold transition-colors"
                    >
                      +{char}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulation Feedback */}
              <AnimatePresence mode="wait">
                {currentSimIndex !== -1 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 rounded-xl border flex items-center justify-between bg-gray-50 border-gray-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progress</span>
                        <div className="flex items-center font-mono text-lg">
                          <span className="text-blue-600 font-bold">{inputString.slice(0, currentSimIndex)}</span>
                          <span className="text-gray-300">{inputString.slice(currentSimIndex)}</span>
                        </div>
                      </div>
                      <div className="w-px h-8 bg-gray-200 mx-2" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current State</span>
                        <span className="font-mono font-bold text-lg">{simState}</span>
                      </div>
                    </div>

                    {currentSimIndex === inputString.length && (
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold ${
                          isAccepted ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {isAccepted ? (
                          <>
                            <CheckCircle2 size={18} />
                            Accepted
                          </>
                        ) : (
                          <>
                            <XCircle size={18} />
                            Rejected
                          </>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto p-6 text-center text-gray-400 text-xs border-t border-gray-100 mt-12">
        <p>© 2026 Automata Visualizer • Formal Languages & Automata Theory</p>
      </footer>
    </div>
  );
}
