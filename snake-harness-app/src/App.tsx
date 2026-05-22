import React, { useState, useEffect, useRef } from 'react';
import { SnakeEnvironment } from './rl/SnakeEnvironment';
import { SnakeAgent } from './rl/SnakeAgent';
import { AIHarness } from './rl/AIHarness';
import { GameCanvas } from './components/GameCanvas';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';

const MAX_STEPS_PER_EPISODE = 500; // 提高步數限制，給 Harness 組更多吃蘋果機會

export const App: React.FC = () => {
  const [envBase] = useState(() => new SnakeEnvironment());
  const [agentBase] = useState(() => new SnakeAgent());
  const [harnessBase] = useState(() => new AIHarness(false));

  const [envProp] = useState(() => new SnakeEnvironment());
  const [agentProp] = useState(() => new SnakeAgent());
  const [harnessProp] = useState(() => new AIHarness(true));

  const [baseState, setBaseState] = useState({ snake: envBase.snake, apple: envBase.apple, intercepted: false });
  const [propState, setPropState] = useState({ snake: envProp.snake, apple: envProp.apple, intercepted: false });

  const statsRef = useRef({
    episodesBase: 0,
    episodesProp: 0,
    deathsBase: 0,
    deathsProp: 0,
    maxScoreBase: 0,
    maxScoreProp: 0,
    // 用於計算平均得分
    totalScoreBase: 0,
    totalScoreProp: 0,
    interceptsProp: 0,
    totalSteps: 0,
    lastChartStep: 0
  });

  const [uiStats, setUiStats] = useState({
    episodesBase: 0,
    episodesProp: 0,
    deathsBase: 0,
    deathsProp: 0,
    maxScoreBase: 0,
    maxScoreProp: 0,
    avgScoreBase: '0.00',
    avgScoreProp: '0.00',
    interceptsProp: 0
  });

  const [chartData, setChartData] = useState<any[]>([]);

  const [isRunning, setIsRunning] = useState(false);
  const [speedMs, setSpeedMs] = useState(50);

  const loopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const resetAll = () => {
    envBase.reset();
    agentBase.reset();
    harnessBase.resetStats();

    envProp.reset();
    agentProp.reset();
    harnessProp.resetStats();

    statsRef.current = {
      episodesBase: 0,
      episodesProp: 0,
      deathsBase: 0,
      deathsProp: 0,
      maxScoreBase: 0,
      maxScoreProp: 0,
      totalScoreBase: 0,
      totalScoreProp: 0,
      interceptsProp: 0,
      totalSteps: 0,
      lastChartStep: 0
    };

    setBaseState({ snake: envBase.snake, apple: envBase.apple, intercepted: false });
    setPropState({ snake: envProp.snake, apple: envProp.apple, intercepted: false });

    setUiStats({
      episodesBase: 0,
      episodesProp: 0,
      deathsBase: 0,
      deathsProp: 0,
      maxScoreBase: 0,
      maxScoreProp: 0,
      avgScoreBase: '0.00',
      avgScoreProp: '0.00',
      interceptsProp: 0
    });

    setChartData([]);
    setIsRunning(false);
  };

  const stepGame = (
    env: SnakeEnvironment,
    agent: SnakeAgent,
    harness: AIHarness,
    isBaseline: boolean
  ) => {
    if (env.isGameOver || env.steps >= MAX_STEPS_PER_EPISODE) {
      const wasDead = env.isGameOver;
      const episodeScore = env.score;

      env.reset();

      if (isBaseline) {
        statsRef.current.episodesBase++;
        statsRef.current.totalScoreBase += episodeScore;
        if (wasDead) statsRef.current.deathsBase++;
        if (episodeScore > statsRef.current.maxScoreBase) {
          statsRef.current.maxScoreBase = episodeScore;
        }
      } else {
        statsRef.current.episodesProp++;
        statsRef.current.totalScoreProp += episodeScore;
        if (wasDead) statsRef.current.deathsProp++;
        if (episodeScore > statsRef.current.maxScoreProp) {
          statsRef.current.maxScoreProp = episodeScore;
        }
      }
      return { intercepted: false };
    }

    const currentState = env.getState();
    const action = agent.chooseAction(currentState);
    
    // 透過 Harness 審查 (新增傳入 apple 位置)
    const { finalAction, harnessPenalty, isIntercepted } = harness.inspectAndOverride(env.snake, action, env.apple);

    if (isIntercepted && !isBaseline) {
      statsRef.current.interceptsProp = harness.interceptCount;
    }

    const { reward: envReward } = env.step(finalAction);
    const totalReward = envReward + harnessPenalty;
    const nextState = env.getState();

    agent.updateQTable(currentState, action, totalReward, nextState);
    agent.decayEpsilon();

    return { intercepted: isIntercepted };
  };

  const gameLoop = (time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;

    if (deltaTime >= speedMs) {
      const resBase = stepGame(envBase, agentBase, harnessBase, true);
      const resProp = stepGame(envProp, agentProp, harnessProp, false);

      statsRef.current.totalSteps++;

      setBaseState({ snake: [...envBase.snake], apple: envBase.apple, intercepted: resBase.intercepted });
      setPropState({ snake: [...envProp.snake], apple: envProp.apple, intercepted: resProp.intercepted });

      const s = statsRef.current;
      const avgBase = s.episodesBase > 0 ? (s.totalScoreBase / s.episodesBase).toFixed(2) : '0.00';
      const avgProp = s.episodesProp > 0 ? (s.totalScoreProp / s.episodesProp).toFixed(2) : '0.00';

      setUiStats({
        episodesBase: s.episodesBase,
        episodesProp: s.episodesProp,
        deathsBase: s.deathsBase,
        deathsProp: s.deathsProp,
        maxScoreBase: s.maxScoreBase,
        maxScoreProp: s.maxScoreProp,
        avgScoreBase: avgBase,
        avgScoreProp: avgProp,
        interceptsProp: s.interceptsProp
      });

      const currentStep = s.totalSteps;
      if (currentStep - s.lastChartStep >= 100) {
        setChartData(prev => {
          const newData = [...prev, {
            step: currentStep,
            deathsBaseline: s.deathsBase,
            deathsProposed: s.deathsProp,
            avgScoreBaseline: s.episodesBase > 0 ? parseFloat((s.totalScoreBase / s.episodesBase).toFixed(2)) : 0,
            avgScoreProposed: s.episodesProp > 0 ? parseFloat((s.totalScoreProp / s.episodesProp).toFixed(2)) : 0
          }];
          if (newData.length > 100) return newData.slice(newData.length - 100);
          return newData;
        });
        s.lastChartStep = currentStep;
      }

      lastTimeRef.current = time;
    }

    if (isRunning) {
      loopRef.current = requestAnimationFrame(gameLoop);
    }
  };

  useEffect(() => {
    if (isRunning) {
      loopRef.current = requestAnimationFrame(gameLoop);
    } else if (loopRef.current) {
      cancelAnimationFrame(loopRef.current);
    }
    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [isRunning, speedMs]);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(to right, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          AI Harness: RL 安全駕馭控制架構
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          即時對比實驗：純粹強化學習 (Baseline) vs. 加裝 AI Harness 安全防禦層 (Proposed)
        </p>
      </header>

      {/* 控制面板 */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => setIsRunning(!isRunning)}>
          {isRunning ? <Pause size={18} /> : <Play size={18} />}
          {isRunning ? '暫停訓練' : '開始訓練 (Start)'}
        </button>
        <button className="btn btn-secondary" onClick={resetAll}>
          <RotateCcw size={18} /> 重置實驗 (Reset)
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '2rem' }}>
          <FastForward size={18} color="var(--text-secondary)" />
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>訓練速度 (Speed):</span>
          <input 
            type="range" 
            min="1" max="99" 
            value={100 - speedMs} 
            onChange={(e) => setSpeedMs(100 - Number(e.target.value))}
            style={{ width: '150px' }}
          />
          <span style={{ fontSize: '0.875rem', width: '40px', fontWeight: 'bold' }}>{100 - speedMs}x</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* 對照組 A Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ color: 'var(--accent-red)', fontSize: '1.5rem' }}>對照組 A (純 RL)</h2>
            <span className="badge badge-red">純 Q-Learning</span>
          </div>
          
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GameCanvas snake={baseState.snake} apple={baseState.apple} isIntercepted={baseState.intercepted} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '150px' }}>
              <div className="stat-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem' }}>
                <span className="stat-label">訓練回合 (Episodes)</span>
                <span className="stat-value">{uiStats.episodesBase}</span>
              </div>
              <div className="stat-card" style={{ background: 'rgba(239, 68, 68, 0.08)', borderRadius: '12px', padding: '1rem' }}>
                <span className="stat-label" style={{ color: '#fca5a5' }}>累積死亡次數 (Deaths)</span>
                <span className="stat-value" style={{ color: '#ef4444' }}>{uiStats.deathsBase}</span>
              </div>
              <div className="stat-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem' }}>
                <span className="stat-label">平均每回合得分 (Avg Score)</span>
                <span className="stat-value">{uiStats.avgScoreBase}</span>
              </div>
              <div className="stat-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.75rem' }}>
                <span className="stat-label">最高得分 (Max Score)</span>
                <span className="stat-value" style={{ fontSize: '1.5rem' }}>{uiStats.maxScoreBase}</span>
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            傳統強化學習高度依賴隨機探索，訓練首期蛇身因隨機動作頻繁撞牆自殺，多數回合得分為 0。
          </p>
        </div>

        {/* 實驗組 B Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ color: 'var(--accent-green)', fontSize: '1.5rem' }}>實驗組 B (RL + Harness)</h2>
            <span className="badge badge-green">零自殺安全防禦</span>
          </div>
          
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GameCanvas snake={propState.snake} apple={propState.apple} isIntercepted={propState.intercepted} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '150px' }}>
              <div className="stat-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem' }}>
                <span className="stat-label">訓練回合 (Episodes)</span>
                <span className="stat-value">{uiStats.episodesProp}</span>
              </div>
              <div className="stat-card" style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: '12px', padding: '1rem' }}>
                <span className="stat-label" style={{ color: '#6ee7b7' }}>Harness 攔截次數</span>
                <span className="stat-value" style={{ color: '#10b981' }}>{uiStats.interceptsProp}</span>
              </div>
              <div className="stat-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem' }}>
                <span className="stat-label">平均每回合得分 (Avg Score)</span>
                <span className="stat-value">{uiStats.avgScoreProp}</span>
              </div>
              <div className="stat-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.75rem' }}>
                <span className="stat-label">最高得分 (Max Score)</span>
                <span className="stat-value" style={{ fontSize: '1.5rem' }}>{uiStats.maxScoreProp}</span>
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            AI Harness 攔截自殺決策並智慧導向蘋果方向，確保全期零自殺率，每回合都能有效得分。
          </p>
        </div>
      </div>

      {/* 圖表呈現 */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>即時收斂曲線數據 (Training Metrics)</h3>
        <div style={{ display: 'flex', justifyContent: 'space-around', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1rem' }}>累積死亡次數對比 (Cumulative Deaths vs Steps)</h4>
            <LineChart width={520} height={260} data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="step" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
              <Legend />
              <Line type="monotone" dataKey="deathsBaseline" name="對照組 A 累積死亡" stroke="#ef4444" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="deathsProposed" name="實驗組 B 累積死亡" stroke="#10b981" strokeWidth={3} dot={false} />
            </LineChart>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1rem' }}>平均每回合得分對比 (Avg Score per Episode vs Steps)</h4>
            <LineChart width={520} height={260} data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="step" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
              <Legend />
              <Line type="monotone" dataKey="avgScoreBaseline" name="對照組 A 平均得分" stroke="#ef4444" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="avgScoreProposed" name="實驗組 B 平均得分" stroke="#10b981" strokeWidth={3} dot={false} />
            </LineChart>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
