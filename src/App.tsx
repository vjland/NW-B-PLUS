/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { RefreshCw, LineChart, List, Pencil } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
);

type Card = { suit: string; rank: string; value: number };

const createShoe = (numDecks: number): Card[] => {
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const values: Record<string, number> = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 0, 'J': 0, 'Q': 0, 'K': 0
  };

  let shoe: Card[] = [];
  for (let i = 0; i < numDecks; i++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        shoe.push({ suit, rank, value: values[rank] });
      }
    }
  }
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
};

const getHandValue = (cards: Card[]): number => {
  return cards.reduce((sum, card) => sum + card.value, 0) % 10;
};

type HandResult = {
  player: Card[];
  banker: Card[];
  playerValue: number;
  bankerValue: number;
  winner: 'Player' | 'Banker' | 'Tie';
  isNatural: boolean;
};

const dealHand = (shoe: Card[]): HandResult | null => {
  if (shoe.length < 6) return null;

  const player: Card[] = [shoe.pop()!];
  const banker: Card[] = [shoe.pop()!];
  player.push(shoe.pop()!);
  banker.push(shoe.pop()!);

  let playerValue = getHandValue(player);
  let bankerValue = getHandValue(banker);

  let playerDrew = false;
  let playerThirdCard: Card | null = null;

  if (playerValue >= 8 || bankerValue >= 8) {
    // Natural, both stand
  } else {
    if (playerValue <= 5) {
      playerThirdCard = shoe.pop()!;
      player.push(playerThirdCard);
      playerValue = getHandValue(player);
      playerDrew = true;
    }

    if (!playerDrew) {
      if (bankerValue <= 5) {
        banker.push(shoe.pop()!);
        bankerValue = getHandValue(banker);
      }
    } else {
      const p3 = playerThirdCard!.value;
      let bankerDraws = false;
      if (bankerValue <= 2) bankerDraws = true;
      else if (bankerValue === 3 && p3 !== 8) bankerDraws = true;
      else if (bankerValue === 4 && p3 >= 2 && p3 <= 7) bankerDraws = true;
      else if (bankerValue === 5 && p3 >= 4 && p3 <= 7) bankerDraws = true;
      else if (bankerValue === 6 && (p3 === 6 || p3 === 7)) bankerDraws = true;

      if (bankerDraws) {
        banker.push(shoe.pop()!);
        bankerValue = getHandValue(banker);
      }
    }
  }

  let winner: 'Player' | 'Banker' | 'Tie' = 'Tie';
  if (playerValue > bankerValue) winner = 'Player';
  else if (bankerValue > playerValue) winner = 'Banker';

  return {
    player,
    banker,
    playerValue,
    bankerValue,
    winner,
    isNatural: player.length === 2 && banker.length === 2
  };
};

type LogEntry = {
  handNumber: number;
  player?: Card[];
  banker?: Card[];
  playerValue?: number;
  bankerValue?: number;
  winner: 'Player' | 'Banker' | 'Tie';
  isNatural: boolean;
  betPlaced: 'Player' | 'Banker' | null;
  betResult: 'Win' | 'Loss' | 'Push' | 'No Bet';
  runningSum: number;
};

const simulate = () => {
  const shoe = createShoe(8);
  const cutCardIndex = 14;

  let runningSum = 0;
  let nextBet: 'Player' | 'Banker' | null = null;
  let handNumber = 1;
  const logs: LogEntry[] = [];
  const chartData: number[] = [];

  while (shoe.length > cutCardIndex && handNumber <= 80) {
    const result = dealHand(shoe);
    if (!result) break;

    let betResult: 'Win' | 'Loss' | 'Push' | 'No Bet' = 'No Bet';
    let betPlaced = nextBet;

    if (nextBet) {
      if (result.winner === 'Tie') {
        betResult = 'Push';
      } else if (result.winner === nextBet) {
        betResult = 'Win';
        runningSum += 1;
      } else {
        betResult = 'Loss';
        runningSum -= 1;
      }
    }

    logs.push({
      handNumber,
      player: result.player,
      banker: result.banker,
      playerValue: result.playerValue,
      bankerValue: result.bankerValue,
      winner: result.winner,
      isNatural: result.isNatural,
      betPlaced,
      betResult,
      runningSum
    });

    // Exclude ties from the performance chart
    if (result.winner !== 'Tie') {
      chartData.push(runningSum);
    }

    if (result.winner !== 'Tie') {
      if (result.isNatural) {
        nextBet = 'Banker';
      } else {
        nextBet = 'Player';
      }
    }

    handNumber++;
  }

  return { logs, chartData };
};

export default function App() {
  const [appMode, setAppMode] = useState<'simu' | 'live'>('simu');
  const [activeTab, setActiveTab] = useState<'chart' | 'log'>('chart');

  // Simu state
  const [simuLogs, setSimuLogs] = useState<LogEntry[]>([]);
  const [simuChartData, setSimuChartData] = useState<number[]>([]);

  // Live state
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);
  const [liveChartData, setLiveChartData] = useState<number[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [autoHide, setAutoHide] = useState(false);
  const [liveWinner, setLiveWinner] = useState<'Player' | 'Banker' | 'Tie' | null>(null);
  const [liveIsNatural, setLiveIsNatural] = useState<boolean | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const runSimulation = () => {
    const { logs: newLogs, chartData: newChartData } = simulate();
    setSimuLogs(newLogs);
    setSimuChartData(newChartData);
  };

  useEffect(() => {
    runSimulation();
  }, []);

  const getNextBet = (logs: LogEntry[]): 'Player' | 'Banker' | null => {
    for (let i = logs.length - 1; i >= 0; i--) {
      if (logs[i].winner !== 'Tie') {
        return logs[i].isNatural ? 'Banker' : 'Player';
      }
    }
    return null;
  };

  const handleLiveConfirm = () => {
    if (!liveWinner || liveIsNatural === null) return;

    const handNumber = liveLogs.length + 1;
    const nextBet = getNextBet(liveLogs);
    let runningSum = liveLogs.length > 0 ? liveLogs[liveLogs.length - 1].runningSum : 0;
    
    let betResult: 'Win' | 'Loss' | 'Push' | 'No Bet' = 'No Bet';
    if (nextBet) {
      if (liveWinner === 'Tie') {
        betResult = 'Push';
      } else if (liveWinner === nextBet) {
        betResult = 'Win';
        runningSum += 1;
      } else {
        betResult = 'Loss';
        runningSum -= 1;
      }
    }

    const newLog: LogEntry = {
      handNumber,
      winner: liveWinner,
      isNatural: liveIsNatural || false,
      betPlaced: nextBet,
      betResult,
      runningSum
    };

    const newLogs = [...liveLogs, newLog];
    setLiveLogs(newLogs);
    
    const newChartData = newLogs.filter(l => l.winner !== 'Tie').map(l => l.runningSum);
    setLiveChartData(newChartData);

    setLiveWinner(null);
    setLiveIsNatural(null);

    if (autoHide) {
      setIsPanelOpen(false);
    }
  };

  const handleLiveUndo = () => {
    if (liveLogs.length === 0) return;
    const newLogs = liveLogs.slice(0, -1);
    setLiveLogs(newLogs);
    const newChartData = newLogs.filter(l => l.winner !== 'Tie').map(l => l.runningSum);
    setLiveChartData(newChartData);
  };

  const handleLiveReset = () => {
    setIsResetConfirmOpen(true);
  };

  const confirmReset = () => {
    setLiveLogs([]);
    setLiveChartData([]);
    setLiveWinner(null);
    setLiveIsNatural(null);
    setIsResetConfirmOpen(false);
  };

  const currentLogs = appMode === 'simu' ? simuLogs : liveLogs;
  const currentChartData = appMode === 'simu' ? simuChartData : liveChartData;
  const nextUpcomingBet = getNextBet(currentLogs);

  const labels = Array.from({ length: 80 }, (_, i) => i + 1);

  const data = {
    labels,
    datasets: [
      {
        label: 'Running Sum',
        data: currentChartData,
        borderColor: appMode === 'simu' ? '#F59E0B' : '#91D06C',
        backgroundColor: appMode === 'simu' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(145, 208, 108, 0.1)',
        borderWidth: 2,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: appMode === 'simu' ? '#F59E0B' : '#91D06C',
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: 0
    },
    scales: {
      x: {
        min: 0,
        max: 79,
        title: { display: false },
        grid: {
          color: '#27272A',
        },
        ticks: { color: '#A1A1AA' }
      },
      y: {
        min: -20,
        max: 20,
        title: { display: false },
        grid: {
          color: '#27272A',
        },
        ticks: { color: '#A1A1AA' }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          title: (context: any) => `Hand ${context[0].label}`,
          label: (context: any) => `Running Sum: ${context.raw}`
        }
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'y',
        },
        limits: {
          y: { min: -40, max: 40 }
        }
      }
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Header */}
      <div className="flex-none flex justify-between items-center p-4 bg-zinc-900 border-b border-zinc-800 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-zinc-100">NW-B</h1>
          <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            <button 
              onClick={() => setAppMode('simu')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${appMode === 'simu' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'}`}
            >
              Simu
            </button>
            <button 
              onClick={() => setAppMode('live')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${appMode === 'live' ? 'bg-live-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'}`}
            >
              Live
            </button>
          </div>
          {nextUpcomingBet && (
            <div className={`flex items-center justify-center w-8 h-8 rounded border-2 font-bold text-sm ${
              nextUpcomingBet === 'Banker' ? 'border-red-500 text-red-500' : 'border-blue-500 text-blue-500'
            }`}>
              {nextUpcomingBet.charAt(0)}
            </div>
          )}
        </div>
        
        {appMode === 'simu' ? (
          <button
            onClick={runSimulation}
            className="p-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-lg transition-colors shadow-sm"
            title="Simulate New Shoe"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className={`p-2 rounded-lg transition-colors shadow-sm ${isPanelOpen ? 'bg-live-600 text-zinc-950' : 'bg-live-500 hover:bg-live-600 text-zinc-950'}`}
            title="Toggle Input Panel"
          >
            <Pencil className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden bg-zinc-950">
        
        {/* Live Input Panel */}
        {appMode === 'live' && isPanelOpen && (
          <div className="absolute top-2 right-2 bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-lg z-30 w-36">
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                {['Player', 'Banker'].map(w => {
                  const isSelected = liveWinner === w;
                  const activeColor = w === 'Player' ? 'bg-blue-600 border-blue-600' : 'bg-red-600 border-red-600';
                  return (
                    <button
                      key={w}
                      onClick={() => setLiveWinner(w as any)}
                      className={`aspect-square flex items-center justify-center rounded-lg text-xl font-bold border ${isSelected ? `${activeColor} text-white` : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800/50'}`}
                    >
                      {w.charAt(0)}
                    </button>
                  );
                })}
                {['Y', 'N'].map(n => {
                  const isSelected = liveIsNatural === (n === 'Y');
                  const activeColor = n === 'Y' ? 'bg-live-500 border-live-500 text-zinc-950' : 'bg-zinc-600 border-zinc-600 text-white';
                  return (
                    <button
                      key={n}
                      onClick={() => setLiveIsNatural(n === 'Y')}
                      className={`aspect-square flex items-center justify-center rounded-lg text-xl font-bold border ${isSelected ? activeColor : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800/50'}`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input 
                  type="checkbox" 
                  id="autoHide" 
                  checked={autoHide} 
                  onChange={(e) => setAutoHide(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950 text-live-500 focus:ring-live-500"
                />
                <label htmlFor="autoHide" className="text-[11px] leading-tight text-zinc-400">Auto hide</label>
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleLiveConfirm}
                  disabled={!liveWinner || liveIsNatural === null}
                  className="flex-1 py-2 bg-live-500 hover:bg-live-600 disabled:opacity-50 disabled:hover:bg-live-500 text-zinc-950 rounded text-sm font-medium transition-colors"
                >
                  Confirm
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleLiveUndo}
                  disabled={liveLogs.length === 0}
                  className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-100 rounded text-xs font-medium transition-colors"
                >
                  Undo
                </button>
                <button
                  onClick={handleLiveReset}
                  disabled={liveLogs.length === 0}
                  className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-100 rounded text-xs font-medium transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chart Tab */}
        <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'chart' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}>
          <div className="w-full h-full bg-zinc-950">
            <Line data={data} options={options} />
          </div>
        </div>

        {/* Log Tab */}
        <div className={`absolute inset-0 overflow-y-auto bg-zinc-950 transition-opacity duration-200 ${activeTab === 'log' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}>
          <table className="w-full text-sm text-center text-zinc-400">
            <thead className="text-xs text-zinc-400 uppercase bg-zinc-900 sticky top-0 shadow-sm z-20">
              <tr>
                <th className="px-2 py-3 font-semibold">#</th>
                <th className="px-2 py-3 font-semibold">Score</th>
                <th className="px-2 py-3 font-semibold">Win</th>
                <th className="px-2 py-3 font-semibold">Bet</th>
                <th className="px-2 py-3 font-semibold">Sum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {[...currentLogs].reverse().map((log, i) => (
                <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-2 py-3 text-zinc-100">{log.handNumber}</td>
                  <td className="px-2 py-3">{log.playerValue !== undefined ? `${log.playerValue}-${log.bankerValue}` : '-'}</td>
                  <td className={`px-2 py-3 font-medium ${
                    log.winner === 'Player' ? 'text-blue-400' :
                    log.winner === 'Banker' ? 'text-red-400' :
                    'text-green-400'
                  }`}>
                    {log.winner.charAt(0)}{log.isNatural ? '(N)' : ''}
                  </td>
                  <td className="px-2 py-3">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${
                      log.betResult === 'Win' ? 'bg-green-500/20 text-green-400' :
                      log.betResult === 'Loss' ? 'bg-red-500/20 text-red-400' :
                      log.betResult === 'Push' ? 'bg-amber-500/20 text-amber-400' :
                      'text-blue-200/50'
                    }`}>
                      {log.betPlaced ? log.betPlaced.charAt(0) : '-'}
                    </span>
                  </td>
                  <td className={`px-2 py-3 font-bold ${
                    log.runningSum > 0 ? 'text-green-400' :
                    log.runningSum < 0 ? 'text-red-400' :
                    'text-zinc-100'
                  }`}>
                    {log.runningSum > 0 ? '+' : ''}{log.runningSum}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex-none flex bg-zinc-900 border-t border-zinc-800 pb-2 pt-1 px-2 z-20">
        <button
          onClick={() => setActiveTab('chart')}
          className={`flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-lg transition-colors ${activeTab === 'chart' ? (appMode === 'live' ? 'text-live-500 bg-live-500/10' : 'text-amber-500 bg-amber-500/10') : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'}`}
        >
          <LineChart className="w-5 h-5" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Chart</span>
        </button>
        <button
          onClick={() => setActiveTab('log')}
          className={`flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-lg transition-colors ${activeTab === 'log' ? (appMode === 'live' ? 'text-live-500 bg-live-500/10' : 'text-amber-500 bg-amber-500/10') : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'}`}
        >
          <List className="w-5 h-5" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Audit Log</span>
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-2xl max-w-xs w-full mx-4">
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Reset Data?</h3>
            <p className="text-sm text-zinc-400 mb-6">This will clear all live tracking data. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
