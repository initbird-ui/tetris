"use client";

import React, { useState, useEffect, useCallback } from 'react';

// 1. 블록 5종 정의 (I, O, T, S, Z)
const TETROMINOS = {
  I: { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: 'bg-cyan-400' },
  O: { shape: [[1, 1], [1, 1]], color: 'bg-yellow-400' },
  T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: 'bg-purple-500' },
  S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: 'bg-green-500' },
  Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: 'bg-red-500' },
};

const RANDOM_KEYS = ['I', 'O', 'T', 'S', 'Z'] as const;
type TetrominoKey = typeof RANDOM_KEYS[number];

const Tetris = () => {
  // --- 상태 관리 (기존) ---
  const [stage, setStage] = useState<'INTRO' | 'PLAYING' | 'RESULT'>('INTRO'); // INTRO, PLAYING, RESULT
  const [userName, setUserName] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false); // 게임 실행 중 여부
  const [isPaused, setIsPaused] = useState(false); // 일시정지 여부
  const [topRank, setTopRank] = useState<{ name: string; time: string; timestamp?: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // --- 상태 관리 (테트리스 게임용) ---
  const [grid, setGrid] = useState(Array(20).fill(Array(10).fill(0))); // 게임 박스 (10x20)
  const [activePiece, setActivePiece] = useState<{shape: number[][], color: string} | null>(null); // 현재 내려오는 블록
  const [nextPiece, setNextPiece] = useState<TetrominoKey>(RANDOM_KEYS[Math.floor(Math.random() * 5)]); // 다음 블록
  const [pos, setPos] = useState({ x: 3, y: 0 }); // 블록 위치
  const [lineCount, setLineCount] = useState(0); // 제거된 줄 수
  const [gameOver, setGameOver] = useState(false);

  // --- 구글 시트 설정 ---
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwj4pv5A8jw1HLcFYwtz9XadBXBiBcs-ROsgf64eRtrl8SfxAk246x3xRZuAPHvDPorfw/exec";

  // --- 타이머 로직 ---
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && !isPaused && !gameOver) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused, gameOver]);

  // --- 데이터 불러오기 (랭킹) ---
  const fetchRankings = useCallback(async () => {
    console.log("랭킹 데이터를 가져오는 중...");
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'GET',
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data && data.rankings) {
        setTopRank(data.rankings);
        console.log("랭킹 업데이트 성공:", data.rankings);
      }
    } catch (error) {
      console.warn("랭킹 불러오기 실패 (네트워크 또는 CORS 문제):", error);
      setTopRank([]); // 연결 실패 시 빈 배열로 유지하여 시트에 없는 가짜 랭킹을 방지합니다.
    }
  }, [GOOGLE_SCRIPT_URL]);

  useEffect(() => {
    if (stage === 'INTRO' || stage === 'RESULT') {
      fetchRankings();
    }
  }, [stage, fetchRankings]);

  // --- 게임 종료 조건 감시 (3줄 삭제 시) ---
  useEffect(() => {
    if (lineCount >= 3 && !gameOver) {
      setGameOver(true);
      handleGameFinish();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineCount, gameOver]);
  
  // --- 테트리스 로직 ---
  
  // 블록 회전
  const rotate = (matrix: number[][]) => {
    const rotated = matrix[0].map((_, index) => matrix.map(col => col[index]).reverse());
    return rotated;
  };

  // 충돌 체크
  const checkCollision = useCallback((newPos: {x: number, y: number}, newShape: number[][]) => {
    for (let y = 0; y < newShape.length; y++) {
      for (let x = 0; x < newShape[y].length; x++) {
        if (newShape[y][x] !== 0) {
          if (
            !grid[y + newPos.y] || 
            grid[y + newPos.y][x + newPos.x] === undefined ||
            grid[y + newPos.y][x + newPos.x] !== 0
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }, [grid]);

  // 새로운 블록 생성 및 게임오버 체크
  const spawnPiece = useCallback(() => {
    const nextType = nextPiece;
    const newNext = RANDOM_KEYS[Math.floor(Math.random() * 5)];
    const newPiece = TETROMINOS[nextType];
    
    if (checkCollision({ x: 3, y: 0 }, newPiece.shape)) {
      setGameOver(true); // 꽉 차서 죽은 경우
      handleGameFinish();
      return;
    }

    setActivePiece(newPiece);
    setNextPiece(newNext);
    setPos({ x: 3, y: 0 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextPiece, checkCollision]);

  // 줄 삭제 및 카운트
  const lockPiece = useCallback(() => {
    if (!activePiece) return;
    
    const newGrid = grid.map(row => [...row]);
    activePiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
            if (y + pos.y >= 0 && y + pos.y < 20 && x + pos.x >= 0 && x + pos.x < 10) {
                newGrid[y + pos.y][x + pos.x] = activePiece.color;
            }
        }
      });
    });

    let cleared = 0;
    const filteredGrid = newGrid.filter(row => {
      if (row.every(cell => cell !== 0)) {
        cleared++;
        return false;
      }
      return true;
    });

    while (filteredGrid.length < 20) filteredGrid.unshift(Array(10).fill(0));
    
    setGrid(filteredGrid);
    setLineCount(prev => prev + cleared);
    
    // 비동기적으로 다음 블록 스폰
    setTimeout(() => {
       if (lineCount + cleared < 3) {
         spawnPiece();
       }
    }, 0);
  }, [activePiece, grid, pos, spawnPiece, lineCount]);

  // 블록 내리기
  const moveDown = useCallback(() => {
    if (!activePiece || gameOver || isPaused) return;
    const newPos = { ...pos, y: pos.y + 1 };
    if (!checkCollision(newPos, activePiece.shape)) {
      setPos(newPos);
    } else {
      lockPiece();
    }
  }, [pos, activePiece, gameOver, isPaused, checkCollision, lockPiece]);

  // 게임 루프 (자동 하강)
  useEffect(() => {
    let dropInterval: NodeJS.Timeout;
    if (isActive && !isPaused && !gameOver && activePiece) {
      dropInterval = setInterval(() => {
        moveDown();
      }, 1000 - (lineCount * 100)); // 속도 증가
    }
    return () => clearInterval(dropInterval);
  }, [isActive, isPaused, gameOver, activePiece, moveDown, lineCount]);

  // 키보드 조작
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // P 또는 Esc 키로 일시정지 토글
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        setIsPaused(prev => !prev);
        return;
      }

      if (gameOver || isPaused || !activePiece || !isActive) return;
      if (e.key === 'ArrowLeft') {
        const newPos = { ...pos, x: pos.x - 1 };
        if (!checkCollision(newPos, activePiece.shape)) setPos(newPos);
      } else if (e.key === 'ArrowRight') {
        const newPos = { ...pos, x: pos.x + 1 };
        if (!checkCollision(newPos, activePiece.shape)) setPos(newPos);
      } else if (e.key === 'ArrowUp') {
        // 모양 돌리기
        const rotated = rotate(activePiece.shape);
        if (!checkCollision(pos, rotated)) setActivePiece({ ...activePiece, shape: rotated });
      } else if (e.key === 'ArrowDown') {
        moveDown();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pos, activePiece, gameOver, moveDown, isPaused, isActive, checkCollision]);

  // --- 주요 액션 함수 ---
  const startGame = () => {
    if (!userName) return alert("이름을 입력해주세요!");
    setLineCount(0);
    setSeconds(0);
    setGrid(Array(20).fill(Array(10).fill(0)));
    setGameOver(false);
    setStage('PLAYING');
    setIsActive(true);
    setIsPaused(false);
    
    // 첫 블록 생성
    const firstNext = RANDOM_KEYS[Math.floor(Math.random() * 5)];
    const firstPiece = TETROMINOS[firstNext];
    setActivePiece(firstPiece);
    setNextPiece(RANDOM_KEYS[Math.floor(Math.random() * 5)]);
    setPos({ x: 3, y: 0 });
  };

  const handleGameFinish = async () => {
    setIsActive(false);
    setStage('RESULT');
    const finalTime = formatTime(seconds);
    await saveToGoogleSheet(userName, finalTime);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const saveToGoogleSheet = async (name: string, time: string) => {
    setIsSaving(true);
    console.log(`${name}님 기록 ${time} 저장 중...`);
    
    const payload = {
      timestamp: new Date().toISOString(), // 정확한 시간 정렬을 위해 ISO 사용
      name: name,
      finishtime: time
    };

    // 1. 서버 연동 전 즉각적으로 로컬 순위판에 반영 (Top3 유지)
    setTopRank(prev => {
        const newRank = [...prev, { name, time, timestamp: payload.timestamp }]
          .sort((a, b) => {
            if (a.time !== b.time) return a.time.localeCompare(b.time);
            if (a.timestamp && b.timestamp) return a.timestamp.localeCompare(b.timestamp);
            return 0;
          })
          .slice(0, 3);
        return newRank;
    });

    try {
      // 2. 구글 스크립트 웹 앱으로 POST 요청하여 시트에 데이터 저장
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Opaque response
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      console.log("저장 요청 완료");
      
      // 3. 약간의 딜레이 후 시트의 최신 데이터를 다시 불러와서 정확한 순위판 동기화
      setTimeout(fetchRankings, 2000); 
    } catch (error) {
      console.error("저장 실패:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetGame = () => {
    setStage('INTRO');
    setUserName('');
  };

  // --- 화면 렌더링 ---
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 font-mono">
      
      {/* 1. 시작 화면 (INTRO) */}
      {stage === 'INTRO' && (
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-bold text-yellow-400 italic">TETRIS</h1>
          <div className="flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="사용자 이름 입력" 
              className="px-4 py-2 text-white bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none transition-all placeholder:text-gray-500"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
            <button 
              onClick={startGame}
              className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold text-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/50"
            >
              게임 시작
            </button>
          </div>
          <div className="mt-10 space-y-2">
             <p className="text-gray-500 text-sm">AI코딩을활용한창의적앱개발 / GTS / 박주영</p>
          </div>
        </div>
      )}

      {/* 2. 메인 게임 화면 (PLAYING) */}
      {stage === 'PLAYING' && (
        <div className="flex flex-row gap-8 bg-black p-10 rounded-xl border-4 border-gray-700 relative">
            
            {/* 일시정지 오버레이 */}
            {isPaused && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-lg">
                    <p className="text-4xl font-bold text-white tracking-widest animate-pulse">PAUSED</p>
                </div>
            )}

            {/* 메인 게임 박스 (10x20 그리드) */}
            <div className="relative border-2 border-white w-[200px] h-[400px] grid grid-cols-10 grid-rows-20 bg-gray-900/50">
                {grid.map((row, y) => row.map((cell, x) => (
                   <div key={`grid-${y}-${x}`} className={`border-[0.5px] border-gray-800/50 ${cell !== 0 ? cell : 'bg-transparent'}`} />
                )))}
                
                {/* 현재 움직이는 블록 렌더링 */}
                {activePiece && activePiece.shape.map((row, y) => row.map((value, x) => {
                  if (value !== 0 && pos.y + y >= 0 && pos.y + y < 20 && pos.x + x >= 0 && pos.x + x < 10) {
                      return (
                          <div 
                            key={`active-${y}-${x}`}
                            className={`absolute w-[20px] h-[20px] ${activePiece.color} border-[1px] border-white/50 shadow-inner`}
                            style={{ top: (pos.y + y) * 20, left: (pos.x + x) * 20 }}
                          />
                      );
                  }
                  return null;
                }))}
            </div>

            {/* 우측 정보 패널 */}
            <div className="flex flex-col justify-between w-40">
                <div className="flex flex-col gap-6 text-white">
                    <div className="border border-gray-700 bg-gray-800/50 p-4 rounded-lg text-center shadow-lg">
                        <p className="text-xs text-gray-400 mb-2 font-bold tracking-wider">NEXT</p>
                        <div className="w-20 h-20 mx-auto flex items-center justify-center bg-black rounded border border-gray-700">
                            <p className="font-bold text-3xl text-yellow-400">{nextPiece}</p>
                        </div>
                    </div>
                    
                    <div className="border border-gray-700 bg-gray-800/50 p-4 rounded-lg text-center shadow-lg">
                        <p className="text-xs text-gray-400 mb-1 font-bold tracking-wider">LINES</p>
                        <p className="text-3xl font-black text-yellow-400">{lineCount} <span className="text-sm text-gray-500">/ 3</span></p>
                    </div>

                    <div className="border border-gray-700 bg-gray-800/50 p-4 rounded-lg text-center shadow-lg">
                        <p className="text-xs text-gray-400 mb-1 font-bold tracking-wider">TIME</p>
                        <p className="text-2xl font-black text-green-400 tabular-nums">{formatTime(seconds)}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-2 mt-4">
                    <button 
                        onClick={() => setIsPaused(!isPaused)}
                        className="bg-zinc-700 hover:bg-zinc-600 py-3 rounded-lg font-bold transition-colors border-b-4 border-zinc-900 active:translate-y-1 active:border-b-0"
                    >
                        {isPaused ? "RESUME" : "PAUSE"}
                    </button>
                    <button 
                        onClick={resetGame}
                        className="bg-red-700 hover:bg-red-600 py-3 rounded-lg font-bold transition-colors border-b-4 border-red-950 active:translate-y-1 active:border-b-0"
                    >
                        GIVE UP
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 3. 결과 화면 (RESULT) */}
      {stage === 'RESULT' && (
        <div className="text-center space-y-6 w-full max-w-sm animate-in fade-in zoom-in duration-300">
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">MISSION CLEAR!</h2>
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-2xl space-y-6">
            <div>
              <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Your Time</p>
              <p className="font-black text-5xl text-white tracking-tighter">{formatTime(seconds)}</p>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-left text-blue-400 font-bold text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></span>
                HALL OF FAME
              </h3>
              <ul className="text-left space-y-3">
                {topRank.length > 0 ? topRank.map((rank, index) => (
                  <li key={index} className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-300'}`}>
                        {index + 1}
                      </span>
                      <span className="font-medium">{rank.name}</span>
                    </div>
                    <span className="text-yellow-400 font-mono font-bold">{rank.time}</span>
                  </li>
                )) : (
                  <p className="text-gray-600 text-xs text-center py-4">저장된 기록이 없습니다.</p>
                )}
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={resetGame}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-4 rounded-xl font-black text-lg transition-all border-b-4 border-blue-900 shadow-lg"
            >
              {isSaving ? "SAVING RECORD..." : "PLAY AGAIN"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tetris;
