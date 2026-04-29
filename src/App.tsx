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
  Moon,
  Sun,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelBottomClose,
  PanelBottomOpen,
  ChevronDown,
  ChevronUp,
  Cpu
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

// --- Sub-components ---

interface SimulationControlsProps {
  variant: 'panel' | 'floating';
  inputString: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleStepClick: () => Promise<void>;
  startStepDisabled: boolean;
  currentSimIndex: number;
  runFullSimulation: () => void;
  runDisabled: boolean;
  resetSimulation: () => void;
  stepMode: 'manual' | 'auto';
  setStepMode: (mode: 'manual' | 'auto') => void;
  autoStepSeconds: number;
  setAutoStepSeconds: (val: number) => void;
  isAccepted: boolean;
  simComplete: boolean;
}

const SimulationControls = ({ 
  variant,
  inputString,
  handleInputChange,
  handleStepClick,
  startStepDisabled,
  currentSimIndex,
  runFullSimulation,
  runDisabled,
  resetSimulation,
  stepMode,
  setStepMode,
  autoStepSeconds,
  setAutoStepSeconds,
  isAccepted,
  simComplete
}: SimulationControlsProps) => {
  const isFloating = variant === 'floating';
  
  return (
    <div className={`${isFloating ? 'p-4 space-y-3' : 'space-y-4'}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className={`relative flex-1 ${isFloating ? 'max-w-[200px]' : 'max-w-md'}`}>
          <input 
            type="text"
            value={inputString}
            onChange={handleInputChange}
            placeholder="Input string..."
            className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-300 dark:text-white"
          />
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => void handleStepClick()}
            disabled={startStepDisabled}
            className="flex items-center gap-2 h-10 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 text-white font-bold rounded-lg transition-all text-xs shadow-lg shadow-blue-500/20 whitespace-nowrap"
          >
            {currentSimIndex === -1 ? 'Start' : 'Step'}
          </button>
          <button 
            onClick={runFullSimulation}
            disabled={runDisabled}
            className="h-10 px-4 border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:border-gray-400 disabled:text-gray-400 font-bold rounded-lg transition-all text-xs"
          >
            Run
          </button>
          <button 
            onClick={resetSimulation}
            className="h-10 px-4 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold rounded-lg transition-all text-xs"
          >
            Reset
          </button>
        </div>

        <div className="flex items-center gap-3 ml-auto bg-gray-50 dark:bg-gray-900 p-1 rounded-lg transition-colors duration-300">
          <button 
            onClick={() => setStepMode('manual')}
            className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all ${stepMode === 'manual' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}
          >
            Manual
          </button>
          <button 
            onClick={() => setStepMode('auto')}
            className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all ${stepMode === 'auto' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}
          >
            Auto
          </button>
        </div>

        {stepMode === 'auto' && (
          <div className="flex items-center gap-2 ml-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Delay
            </span>
            <input
              type="number"
              min="0.2"
              step="0.1"
              value={autoStepSeconds}
              onChange={(e) => setAutoStepSeconds(Math.max(0.2, Number(e.target.value)))}
              className="w-16 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-blue-500 outline-none transition-colors duration-300 dark:text-white"
            />
            <span className="text-[10px] text-gray-400">s</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* String Visualizer */}
        <div className="flex-1 flex gap-1 font-mono overflow-x-auto pb-2 scrollbar-hide">
          {inputString.split('').map((char, i) => (
            <div 
              key={i}
              className={`w-8 h-10 flex items-center justify-center rounded border-b-2 text-base transition-all shrink-0 ${
                i === currentSimIndex ? 'bg-blue-600 text-white border-blue-800 scale-110 shadow-lg' : 
                i < currentSimIndex ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700' : 
                'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-gray-800'
              }`}
            >
              {char}
            </div>
          ))}
          {inputString.length === 0 && <span className="text-gray-400 dark:text-gray-500 text-xs italic">Enter a string to test</span>}
        </div>

        {/* Status */}
        <div className={`min-w-[120px] h-12 flex items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-4 transition-colors duration-300 ${isFloating ? 'bg-white/50 dark:bg-gray-950/50' : ''}`}>
          {simComplete ? (
            isAccepted ? (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-widest">
                <CheckCircle2 size={16} /> ACCEPT
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-widest">
                <XCircle size={16} /> REJECT
              </div>
            )
          ) : (
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              {currentSimIndex === -1 ? 'Ready' : `Step ${currentSimIndex + 1}/${inputString.length}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // --- State ---
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  // Dark Mode Sync
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isBottomCollapsed, setIsBottomCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'transitions' | 'simulation'>('transitions');
  const [numStates, setNumStates] = useState(3);
  const [alphabetInput, setAlphabetInput] = useState('a b');
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

  // --- Floating Panel State ---
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });
  const [panelSize, setPanelSize] = useState({ width: 500, height: 260 });
  const [panelInitialized, setPanelInitialized] = useState(false);
  
  const dragStartRef = useRef({ x: 0, y: 0, panelX: 0, panelY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Initialize Floating Panel Position
  useEffect(() => {
    if (panelInitialized || !containerRef.current) return;
    
    // Use an observer to catch the container size as soon as it's available
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          setPanelPos({ 
            x: width - panelSize.width - 24, 
            y: height - panelSize.height - 24 
          });
          setPanelInitialized(true);
          observer.disconnect();
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [panelInitialized, panelSize.width, panelSize.height]);

  // Handle Drag Move & End
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: PointerEvent) => {
      if (!containerRef.current) return;

      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      const { width, height } = containerRef.current.getBoundingClientRect();

      const newX = dragStartRef.current.panelX + dx;
      const newY = dragStartRef.current.panelY + dy;

      setPanelPos({
        x: Math.max(0, Math.min(newX, width - panelSize.width)),
        y: Math.max(0, Math.min(newY, height - panelSize.height))
      });
    };

    const handleUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [isDragging, panelSize]);

  // Handle Resize Move & End
  useEffect(() => {
    if (!isResizing) return;

    const handleMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const dx = e.clientX - resizeStartRef.current.x;
      const dy = e.clientY - resizeStartRef.current.y;
      
      const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect();
      const newWidth = Math.max(320, resizeStartRef.current.width + dx);
      const newHeight = Math.max(180, resizeStartRef.current.height + dy);
      
      setPanelSize({ 
        width: Math.min(newWidth, containerW - panelPos.x), 
        height: Math.min(newHeight, containerH - panelPos.y) 
      });
    };

    const handleUp = () => setIsResizing(false);

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    
    // Prevent text selection while resizing
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      document.body.style.userSelect = '';
    };
  }, [isResizing, panelPos.x, panelPos.y]);

  const handleDragStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    dragStartRef.current = { 
      x: e.clientX, 
      y: e.clientY, 
      panelX: panelPos.x, 
      panelY: panelPos.y 
    };
    
    document.body.style.userSelect = 'none';
  };

  const handleResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: panelSize.width,
      height: panelSize.height
    };
  };

  const simStateRef = useRef(simState);
  const currentSimIndexRef = useRef(currentSimIndex);
  const stepAnimLockRef = useRef(false);
  simStateRef.current = simState;
  currentSimIndexRef.current = currentSimIndex;

  // --- Derived Data ---
  const states = useMemo(() => 
    Array.from({ length: numStates }, (_, i) => `q${i}`), 
  [numStates]);

  const alphabet = useMemo(() => {
    const raw = alphabetInput.split(/[\s,]+/).map(s => s.trim()).filter(s => s.length === 1);
    return Array.from(new Set(raw)).slice(0, MAX_ALPHABET);
  }, [alphabetInput]);

  const handleTransitionsSync = useCallback((prev: Transitions, currentStates: string[], currentAlphabet: string[]) => {
    const next: Transitions = {};
    currentStates.forEach(s => {
      next[s] = {};
      currentAlphabet.forEach(char => {
        if (prev[s] && prev[s][char] && currentStates.includes(prev[s][char])) {
          next[s][char] = prev[s][char];
        } else {
          next[s][char] = currentStates[0];
        }
      });
    });
    return next;
  }, []);

  // Initialize/Sync transitions when states or alphabet change
  useEffect(() => {
    setTransitions(prev => handleTransitionsSync(prev, states, alphabet));

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
  }, [states, alphabet, handleTransitionsSync]);

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
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const graphReadyRef = useRef(false);

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

  // Effect A: Initialize Graph & Layout (Structural Changes)
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    graphReadyRef.current = false;

    const { width, height } = containerRef.current.getBoundingClientRect();
    const svg = d3.select(svgRef.current);
    
    // Clear layers but keep defs/markers
    svg.selectAll("g.root-container").remove();
    
    const root = svg.append("g").attr("class", "root-container");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        root.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Ensure defs exist
    let defs = svg.select("defs");
    if (defs.empty()) {
      defs = svg.append("defs");
      const glowFilter = defs.append("filter").attr("id", "edge-glow").attr("x", "-40%").attr("y", "-40%").attr("width", "180%").attr("height", "180%");
      glowFilter.append("feGaussianBlur").attr("stdDeviation", 2.5).attr("result", "blur");
      const feMerge = glowFilter.append("feMerge");
      feMerge.append("feMergeNode").attr("in", "blur");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");
      
      defs.append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 10)
        .attr("refY", 0)
        .attr("markerWidth", 10)
        .attr("markerHeight", 10)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5");

      defs.append("marker")
        .attr("id", "arrowhead-active")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 10)
        .attr("refY", 0)
        .attr("markerWidth", 10)
        .attr("markerHeight", 10)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#f59e0b");
    }

    const nodes: D3Node[] = states.map(id => ({ id }));
    const links: D3Link[] = [];
    const edgeGroups = new Map<string, string[]>();

    states.forEach(from => {
      alphabet.forEach(char => {
        const toId = transitions[from]?.[char];
        if (toId) {
          const key = `${from}\0${toId}`;
          if (!edgeGroups.has(key)) edgeGroups.set(key, []);
          if (!edgeGroups.get(key)!.includes(char)) {
            edgeGroups.get(key)!.push(char);
          }
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
      .force("charge", d3.forceManyBody().strength(-800))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(60));
    
    simulationRef.current = simulation;

    const link = root.append("g")
      .attr("class", "links-layer")
      .selectAll<SVGPathElement, D3Link>("path")
      .data(links)
      .enter().append("path")
      .attr("class", "transition-path")
      .attr("fill", "none")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrowhead)");

    const linkLabel = root.append("g")
      .attr("class", "labels-layer")
      .selectAll<SVGTextElement, D3Link>("text")
      .data(links)
      .enter().append("text")
      .attr("class", "transition-label")
      .attr("font-size", "12px")
      .attr("font-weight", "600")
      .attr("text-anchor", "middle")
      .text(d => d.label);

    const node = root.append("g")
      .attr("class", "nodes-layer")
      .selectAll<SVGGElement, D3Node>("g")
      .data(nodes)
      .enter().append("g")
      .attr("class", "state-node")
      .call(d3.drag<SVGGElement, D3Node>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    node.append("circle")
      .attr("class", "main-circle border-circle")
      .attr("r", 20)
      .attr("stroke-width", 2);

    node.append("circle")
      .attr("class", "accept-circle")
      .attr("r", 16)
      .attr("fill", "none")
      .attr("stroke-width", 1)
      .attr("opacity", 0);

    node.append("text")
      .attr("class", "state-label")
      .attr("dy", ".35em")
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text(d => d.id);

    simulation.on("tick", () => {
      link.attr("d", d => {
        const sx = d.source.x ?? 0;
        const sy = d.source.y ?? 0;
        const tx = d.target.x ?? 0;
        const ty = d.target.y ?? 0;
        const dx = tx - sx;
        const dy = ty - sy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;

        // move start/end away from node centers
        const offset = NODE_R;

        const nx = dx / len;
        const ny = dy / len;

        const sx2 = sx + nx * offset;
        const sy2 = sy + ny * offset;
        const tx2 = tx - nx * offset;
        const ty2 = ty - ny * offset;

        const dr = len;

      if (d.source.id === d.target.id) {
        // Angle for the start and end of the loop (in radians)
        // 30 degrees from the vertical top for a nice symmetrical loop
        const angle = Math.PI / 6; 
        
        // Start point (top right shoulder)
        const x0 = sx + NODE_R * Math.sin(angle);
        const y0 = sy - NODE_R * Math.cos(angle);
        
        // End point (top left shoulder)
        const x1 = sx - NODE_R * Math.sin(angle);
        const y1 = sy - NODE_R * Math.cos(angle);

        // We use the same SELF_LOOP_W/H but relative to the new start/end
        return `M ${x0},${y0} 
                C ${sx + SELF_LOOP_W},${sy - SELF_LOOP_H} 
                  ${sx - SELF_LOOP_W},${sy - SELF_LOOP_H} 
                  ${x1},${y1}`;
      }
      const shrink = 2; // tweak 1–4 for perfect touch

      return `M${sx2},${sy2}A${dr},${dr} 0 0,1 
              ${tx2 - nx * shrink},${ty2 - ny * shrink}`;
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
        const t = 0.5; // 0.5 = middle, 0.65 = closer to target node
        const x = sx + (tx - sx) * t;
        const y = sy + (ty - sy) * t;
        const rdx = tx - sx;
        const rdy = ty - sy;
        const len = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
        const nx = -rdy / len * 10;
        const ny = rdx / len * 10;
        return `translate(${x + nx}, ${y + ny})`;
      });

      node.attr("transform", d => `translate(${d.x ?? 0}, ${d.y ?? 0})`);
    });

    graphReadyRef.current = true;
    updateGraphStyles();

    return () => {
      simulation.stop();
      simulationRef.current = null;
      graphReadyRef.current = false;
    };
  }, [states, alphabet, transitions, theme]);

  // Effect B: Visualization Updates (Styling & Simulation Progress)
  const updateGraphStyles = useCallback(() => {
    if (!svgRef.current || !graphReadyRef.current) return;
    const svg = d3.select(svgRef.current);
    const isDark = theme === 'dark';

    const nodeFill = (id: string) => {
      if (arrivalState === id) return isDark ? "#22c55e" : "#22c55e";
      if (simState === id && arrivalState === null) return isDark ? "#3b82f6" : "#3b82f6";
      return isDark ? "#1f2937" : "#fff";
    };

    const nodeLabelFill = (id: string) => {
      if (arrivalState === id || (simState === id && arrivalState === null)) return "#fff";
      return isDark ? "#f3f4f6" : "#333";
    };

    const innerStroke = (id: string) => {
      if (arrivalState === id || (simState === id && arrivalState === null)) return "#fff";
      return isDark ? "#9ca3af" : "#333";
    };

    const isActiveLink = (d: D3Link) =>
      !!activeEdge &&
      d.source.id === activeEdge.from &&
      d.target.id === activeEdge.to &&
      d.chars.includes(activeEdge.char);

    // Update markers colors for theme
    svg.select("#arrowhead path").attr("fill", isDark ? "#4b5563" : "#666");

    // Update Nodes
    svg.selectAll<SVGGElement, D3Node>(".state-node").each(function(d) {
      const g = d3.select(this);
      g.select(".main-circle")
        .attr("fill", nodeFill(d.id))
        .attr("stroke", d.id === startState ? "#10b981" : (isDark ? "#4b5563" : "#333"))
        .attr("stroke-width", d.id === startState ? 3 : 1.5);
      
      const isAccept = acceptStates.has(d.id);
      g.select(".accept-circle")
        .attr("stroke", isAccept ? innerStroke(d.id) : "none")
        .attr("opacity", isAccept ? 1 : 0);

      g.select(".state-label")
        .attr("fill", nodeLabelFill(d.id))
        .text(d.id);
    });

    // Update Links
    svg.selectAll<SVGPathElement, D3Link>(".transition-path").each(function(d) {
      const active = isActiveLink(d);
      d3.select(this)
        .attr("stroke", active ? "#f59e0b" : (isDark ? "#4b5563" : "#999"))
        .attr("stroke-width", active ? 4 : 1.5)
        .attr("marker-end", active ? "url(#arrowhead-active)" : "url(#arrowhead)")
        .attr("filter", active ? "url(#edge-glow)" : "none")
        .attr("opacity", active ? 1 : (isDark ? 0.6 : 0.85));
    });

    svg.selectAll<SVGTextElement, D3Link>(".transition-label").each(function(d) {
      const active = isActiveLink(d);
      d3.select(this)
        .attr("fill", active ? "#f59e0b" : (isDark ? "#9ca3af" : "#666"))
        .attr("font-size", active ? "13px" : "12px");
    });
  }, [simState, activeEdge, arrivalState, startState, acceptStates, theme]);

  const handleFitScreen = () => {
    if (!svgRef.current || !containerRef.current || !zoomRef.current || !simulationRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const nodes = simulationRef.current.nodes();
    if (nodes.length === 0) return;

    const xExtent = d3.extent(nodes, (d: any) => d.x) as [number, number];
    const yExtent = d3.extent(nodes, (d: any) => d.y) as [number, number];
    
    const contentWidth = xExtent[1] - xExtent[0] + 100;
    const contentHeight = yExtent[1] - yExtent[0] + 100;
    
    const midX = (xExtent[0] + xExtent[1]) / 2;
    const midY = (yExtent[0] + yExtent[1]) / 2;
    
    const scale = 0.8 / Math.max(contentWidth / width, contentHeight / height);
    
    d3.select(svgRef.current).transition().duration(750).call(
      zoomRef.current.transform,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-midX, -midY)
    );
  };

  useEffect(() => {
    updateGraphStyles();
    // Re-center and update forces when layout changes
    if (simulationRef.current && containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      simulationRef.current.force("center", d3.forceCenter(width / 2, height / 2));
      simulationRef.current.alpha(0.1).restart();
    }
  }, [theme, updateGraphStyles, isSidebarCollapsed, isBottomCollapsed]);

  return (
    <div className="h-screen flex flex-col font-sans selection:bg-blue-500/20 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <header className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md px-4 flex items-center justify-between z-50 shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Cpu size={20} strokeWidth={2.5}/>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Automata Lab</h1>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono uppercase tracking-widest leading-none">DFA Engine v1.0</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            className="relative w-14 h-7 flex items-center rounded-full transition-colors duration-300 bg-gray-300 dark:bg-gray-700"
          >
            <div
              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center transition-all duration-300 ${
                theme === 'dark' ? 'translate-x-7' : 'translate-x-0'
              }`}
            >
              {theme === 'light' ? (
                <Sun size={12} className="text-yellow-500" />
              ) : (
                <Moon size={12} className="text-gray-700" />
              )}
            </div>
          </button>
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-2" />
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Engine Active</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <motion.aside 
          initial={false}
          animate={{ width: isSidebarCollapsed ? 0 : 280 }}
          className="border-r border-gray-200 dark:border-gray-800 overflow-hidden bg-gray-50/30 dark:bg-gray-900/40 shrink-0 relative transition-colors duration-300"
        >
          <div className="w-[280px] p-4 space-y-4 overflow-y-auto h-full">
            {/* Machine Config */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Settings size={16} />
                  <h2 className="text-xs font-bold uppercase tracking-wider">Configuration</h2>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-4 shadow-sm transition-colors duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    States (Q)
                  </label>
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-950 rounded-lg p-1 transition-colors duration-300">
                    <button 
                      onClick={() => setNumStates(Math.max(1, numStates - 1))}
                      className="p-1.5 rounded-md hover:bg-white dark:hover:bg-gray-900 transition-all text-gray-500"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-mono font-bold">{numStates} states</span>
                    <button 
                      onClick={() => setNumStates(Math.min(MAX_STATES, numStates + 1))}
                      className="p-1.5 rounded-md hover:bg-white dark:hover:bg-gray-900 transition-all text-gray-500"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    Alphabet (Σ)
                  </label>
                  <input
                    type="text"
                    value={alphabetInput}
                    onChange={(e) => setAlphabetInput(e.target.value)}
                    placeholder="a b"
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-1.5 font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                  />
                  <div className="flex flex-wrap gap-1">
                    {alphabet.map(char => (
                      <span key={char} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[10px] font-mono font-bold">
                        {char}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* State Properties */}
            <section className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={16} />
                <h2 className="text-xs font-bold uppercase tracking-wider">State Map</h2>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm transition-colors duration-300">
                <table className="w-full text-[11px]">
                  <thead className="bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
                    <tr className="text-left border-b border-gray-100 dark:border-gray-700">
                      <th className="px-3 py-2 text-gray-400 font-bold uppercase tracking-widest text-[9px]">State</th>
                      <th className="px-2 py-2 text-center text-gray-400 font-bold uppercase tracking-widest text-[9px]">S</th>
                      <th className="px-2 py-2 text-center text-gray-400 font-bold uppercase tracking-widest text-[9px]">A</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800 transition-colors duration-300">
                    {states.map(s => (
                      <tr key={s} className="hover:bg-gray-50/50 dark:hover:bg-gray-950/20 transition-colors duration-300">
                        <td className="px-3 py-2 font-mono font-bold text-gray-600 dark:text-gray-300">{s}</td>
                        <td className="px-2 py-2 text-center">
                          <input 
                            type="radio" 
                            name="startState" 
                            checked={startState === s}
                            onChange={() => setStartState(s)}
                            className="w-3 h-3 text-blue-600 dark:bg-gray-950 border-gray-300 dark:border-gray-600 focus:ring-0"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input 
                            type="checkbox" 
                            checked={acceptStates.has(s)}
                            onChange={() => toggleAcceptState(s)}
                            className="w-3 h-3 text-emerald-600 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-950 focus:ring-0"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </motion.aside>

        {/* Sidebar Toggle Handle */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-50 w-5 h-12 bg-white dark:bg-gray-900 border border-l-0 border-gray-200 dark:border-gray-800 rounded-r-lg flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all shadow-sm ${isSidebarCollapsed ? 'translate-x-0' : 'translate-x-[280px]'}`}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>

        {/* Main Canvas Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden transition-colors duration-300">
          {/* Top Canvas Control Bar */}
          <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
             <button 
                onClick={handleFitScreen}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-white dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
                title="Fit to Screen"
              >
                <Maximize2 size={16} />
              </button>
          </div>

          <div ref={containerRef} className="flex-1 bg-gray-50 dark:bg-gray-950 relative overflow-hidden transition-colors duration-300">
            <svg 
              ref={svgRef} 
              className="w-full h-full cursor-grab active:cursor-grabbing"
            />
            
            {/* Floating Simulation Panel */}
            <AnimatePresence>
              {isBottomCollapsed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`absolute z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl shadow-blue-500/10 overflow-hidden flex flex-col ${(isDragging || isResizing) ? 'select-none' : ''}`}
                  style={{
                    width: panelSize.width,
                    height: panelSize.height,
                    left: panelPos.x,
                    top: panelPos.y,
                    touchAction: 'none'
                  }}
                >
                  <div 
                    onPointerDown={handleDragStart}
                    className="px-4 py-2 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between cursor-move select-none touch-none"
                  >
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      <Play size={10} className="text-blue-500" />
                      Quick Simulation
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsBottomCollapsed(false);
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      onPointerDown={e => e.stopPropagation()}
                    >
                      <PanelBottomOpen size={14} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <SimulationControls 
                      variant="floating" 
                      inputString={inputString}
                      handleInputChange={handleInputChange}
                      handleStepClick={handleStepClick}
                      startStepDisabled={startStepDisabled}
                      currentSimIndex={currentSimIndex}
                      runFullSimulation={runFullSimulation}
                      runDisabled={runDisabled}
                      resetSimulation={resetSimulation}
                      stepMode={stepMode}
                      setStepMode={setStepMode}
                      autoStepSeconds={autoStepSeconds}
                      setAutoStepSeconds={setAutoStepSeconds}
                      isAccepted={isAccepted}
                      simComplete={simComplete}
                    />
                  </div>
                  
                  {/* Resize Handle */}
                  <div
                    onPointerDown={handleResizeStart}
                    className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-center justify-center group"
                  >
                    <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full group-hover:bg-blue-500 transition-colors" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Visual Legend */}
            <div className="absolute bottom-4 left-4 flex gap-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md p-2 rounded-lg border border-gray-200 dark:border-gray-800 text-[9px] font-bold uppercase tracking-widest text-gray-500 shadow-sm pointer-events-none transition-colors duration-300">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full border border-emerald-500" />
                Start
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full border border-gray-400 dark:border-gray-600 flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full border border-gray-400" />
                </span>
                Accept
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                Current
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Active
              </div>
            </div>
          </div>

          {/* Bottom Panel */}
          <motion.div 
            initial={false}
            animate={{ height: isBottomCollapsed ? 40 : 240 }}
            className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col transition-colors duration-300 overflow-hidden shrink-0 group"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 transition-colors duration-300 shrink-0">
              <div className="flex">
                <button 
                  onClick={() => {
                    setActiveTab('transitions');
                    setIsBottomCollapsed(false);
                  }}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'transitions' && !isBottomCollapsed ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}
                >
                  Table
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('simulation');
                    setIsBottomCollapsed(false);
                  }}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'simulation' && !isBottomCollapsed ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}
                >
                  Simulation
                </button>
              </div>
              
              <button 
                onClick={() => setIsBottomCollapsed(!isBottomCollapsed)}
                className="p-1 px-3 text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-2"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  {isBottomCollapsed ? 'Expand' : 'Collapse'}
                </span>
                {isBottomCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 transition-colors duration-300">
              <AnimatePresence mode="wait">
                {!isBottomCollapsed && (
                  activeTab === 'transitions' ? (
                    <motion.div 
                      key="transitions"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="max-w-4xl"
                    >
                      <table className="w-full border-collapse text-[11px] transition-colors duration-300">
                        <thead>
                          <tr>
                            <th className="p-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest transition-colors duration-300">
                              δ(q, σ)
                            </th>
                            {alphabet.map(char => (
                              <th key={char} className="p-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 text-center font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap transition-colors duration-300">
                                {char}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {states.map(s => (
                            <tr key={s}>
                              <td className="p-2 border border-gray-100 dark:border-gray-700 font-mono font-bold text-xs bg-gray-50/50 dark:bg-gray-900/30 transition-colors duration-300">
                                {s}
                              </td>
                              {alphabet.map(char => (
                                <td key={char} className="p-1 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                                  <select
                                    value={transitions[s]?.[char] || states[0]}
                                    onChange={(e) => handleTransitionChange(s, char, e.target.value)}
                                    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-blue-500 outline-none transition-colors duration-300 dark:text-white"
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
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="simulation"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <SimulationControls 
                        variant="panel" 
                        inputString={inputString}
                        handleInputChange={handleInputChange}
                        handleStepClick={handleStepClick}
                        startStepDisabled={startStepDisabled}
                        currentSimIndex={currentSimIndex}
                        runFullSimulation={runFullSimulation}
                        runDisabled={runDisabled}
                        resetSimulation={resetSimulation}
                        stepMode={stepMode}
                        setStepMode={setStepMode}
                        autoStepSeconds={autoStepSeconds}
                        setAutoStepSeconds={setAutoStepSeconds}
                        isAccepted={isAccepted}
                        simComplete={simComplete}
                      />
                    </motion.div>
                  )
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
