"use client";

import React, { useState, useEffect } from 'react';

const Tetris = () => {
  // --- 상태 관리 ---
  const [stage, setStage] = useState<'INTRO' | 'PLAYING' | 'RESULT'>('INTRO'); // INTRO, PLAYING, RESULT
  const [userName, setUserName] = useState('');
  const [linesCleared, setLinesCleared] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false); // 게임 실행 중 여부
  const [isPaused, setIsPaused] = useState(false); // 일시정지 여부
  const [topRank, setTopRank] = useState<{ name: string; time: string }[]>([]);

  // --- 타이머 로직 ---
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && !isPaused) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused]);

  // --- 게임 종료 조건 감시 ---
  useEffect(() => {
    if (linesCleared >= 3) {
      handleGameOver();
    }
  }, [linesCleared]);

  // --- 주요 함수 ---
  const startGame = () => {
    if (!userName) return alert("이름을 입력해주세요!");
    setLinesCleared(0);
    setSeconds(0);
    setStage('PLAYING');
    setIsActive(true);
    setIsPaused(false);
  };

  const handleGameOver = () => {
    setIsActive(false);
    setStage('RESULT');
    saveToGoogleSheet(userName, formatTime(seconds));
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const saveToGoogleSheet = (name: string, time: string) => {
    console.log(`${name}님 기록 ${time} 저장 중...`);
    // 가상의 데이터 (구글 시트 연동 전 시뮬레이션)
    setTopRank([
      { name: '박주영', time: '00:15' },
      { name: '에이아이', time: '00:22' },
      { name: name, time: time }
    ].sort((a, b) => a.time.localeCompare(b.time)).slice(0, 3));
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
          <h1 className="text-5xl font-bold text-yellow-400">TETRIS</h1>
          <div className="flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="사용자 이름 입력" 
              className="px-4 py-2 text-black rounded"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
            <button 
              onClick={startGame}
              className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold text-xl transition"
            >
              게임 시작
            </button>
          </div>
          <p className="mt-10 text-gray-500">AI코딩을활용한창의적앱개발 / GTS / 박주영</p>
        </div>
      )}

      {/* 2. 메인 게임 화면 (PLAYING) */}
      {stage === 'PLAYING' && (
        <div className="w-full max-w-md space-y-4">
          <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg">
            <div>시간: <span className="text-green-400">{formatTime(seconds)}</span></div>
            <div>줄 제거: <span className="text-yellow-400">{linesCleared} / 3</span></div>
          </div>

          {/* 테트리스 보드 가상 영역 */}
          <div className="aspect-[1/2] w-64 mx-auto border-4 border-gray-700 bg-black relative">
             <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-center px-4">
                {isPaused ? "일시정지 중" : "게임이 진행 중입니다... (3줄 제거 시 종료)"}
             </div>
             {/* 실제 게임 로직은 여기에 Canvas나 Grid로 구현 */}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className="bg-yellow-600 p-2 rounded"
            >
              {isPaused ? "다시 시작" : "일시 정지"}
            </button>
            <button 
              onClick={handleGameOver}
              className="bg-red-600 p-2 rounded"
            >
              중간 종료
            </button>
          </div>
          
          {/* 테스트용 줄 제거 버튼 (실제 게임 로직 대용) */}
          <button 
            onClick={() => setLinesCleared(prev => prev + 1)}
            className="w-full mt-4 py-1 border border-dashed border-gray-600 text-gray-500 text-xs"
          >
            (개발용) 한 줄 지우기 버튼
          </button>
        </div>
      )}

      {/* 3. 결과 화면 (RESULT) */}
      {stage === 'RESULT' && (
        <div className="text-center space-y-6 w-full max-w-sm">
          <h2 className="text-3xl font-bold text-green-400">Game Completed!</h2>
          <div className="bg-gray-800 p-6 rounded-lg">
            <p className="mb-4">최종 소요 시간: <span className="font-bold text-xl">{formatTime(seconds)}</span></p>
            
            <h3 className="text-left text-blue-300 mb-2 border-b border-gray-600 pb-1">Top 3 Ranking</h3>
            <ul className="text-left space-y-2">
              {topRank.map((rank, index) => (
                <li key={index} className="flex justify-between">
                  <span>{index + 1}. {rank.name}</span>
                  <span className="text-yellow-500">{rank.time}</span>
                </li>
              ))}
            </ul>
          </div>
          <button 
            onClick={resetGame}
            className="bg-blue-600 px-6 py-2 rounded font-bold"
          >
            다시 시작 (이름 입력 화면으로)
          </button>
        </div>
      )}
    </div>
  );
};

export default Tetris;
