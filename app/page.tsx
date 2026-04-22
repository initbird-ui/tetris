"use client";

import React, { useState, useEffect, useCallback } from 'react';

const Tetris = () => {
  // --- 상태 관리 ---
  const [stage, setStage] = useState<'INTRO' | 'PLAYING' | 'RESULT'>('INTRO'); // INTRO, PLAYING, RESULT
  const [userName, setUserName] = useState('');
  const [linesCleared, setLinesCleared] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false); // 게임 실행 중 여부
  const [isPaused, setIsPaused] = useState(false); // 일시정지 여부
  const [topRank, setTopRank] = useState<{ name: string; time: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // --- 구글 시트 설정 ---
  // 구글 앱스 스크립트 배포 후 생성된 웹 앱 URL을 여기에 붙여넣으세요.
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwL2njPp4e7vu5r5ProcFOS4pNeGgeeqkEed6Gy29JhPpYn2MyPoN5UOzzrbgQAK71V8A/exec";

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

  // --- 데이터 불러오기 (랭킹) ---
  const fetchRankings = useCallback(async () => {
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL);
      const data = await response.json();
      if (data && data.rankings) {
        setTopRank(data.rankings);
      }
    } catch (error) {
      console.error("랭킹 불러오기 실패:", error);
      // 실패 시 기본 데이터
      setTopRank([
        { name: '박주영', time: '00:15' },
        { name: '에이아이', time: '00:22' },
      ]);
    }
  }, [GOOGLE_SCRIPT_URL]);

  useEffect(() => {
    if (stage === 'INTRO' || stage === 'RESULT') {
      fetchRankings();
    }
  }, [stage, fetchRankings]);

  // --- 주요 함수 ---
  const startGame = () => {
    if (!userName) return alert("이름을 입력해주세요!");
    setLinesCleared(0);
    setSeconds(0);
    setStage('PLAYING');
    setIsActive(true);
    setIsPaused(false);
  };

  const handleGameOver = async () => {
    setIsActive(false);
    setStage('RESULT');
    await saveToGoogleSheet(userName, formatTime(seconds));
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
      timestamp: new Date().toLocaleString('ko-KR'),
      name: name,
      finishtime: time
    };

    try {
      // mode: 'no-cors'를 사용하면 응답을 확인할 수 없으나, 
      // 간단한 구글 앱스 스크립트 POST 요청에는 흔히 사용됩니다.
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      console.log("저장 요청 완료");
      // 저장 후 최신 랭킹 다시 불러오기
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
              className="px-4 py-2 text-black rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none"
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
        <div className="w-full max-w-md space-y-4">
          <div className="flex justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-inner">
            <div className="flex flex-col">
              <span className="text-gray-400 text-xs uppercase tracking-wider">Time</span>
              <span className="text-2xl font-bold text-green-400 tabular-nums">{formatTime(seconds)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-gray-400 text-xs uppercase tracking-wider">Lines</span>
              <span className="text-2xl font-bold text-yellow-400 tabular-nums">{linesCleared} <span className="text-sm text-gray-500">/ 3</span></span>
            </div>
          </div>

          {/* 테트리스 보드 가상 영역 */}
          <div className="aspect-[1/2] w-64 mx-auto border-4 border-gray-700 bg-black relative rounded-sm shadow-2xl overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:20px_20px]"></div>
             <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-center px-4 font-bold animate-pulse">
                {isPaused ? "PAUSED" : "PLAYING..."}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className="bg-zinc-700 hover:bg-zinc-600 p-3 rounded-lg font-bold transition-colors border-b-4 border-zinc-900"
            >
              {isPaused ? "RESUME" : "PAUSE"}
            </button>
            <button 
              onClick={handleGameOver}
              className="bg-red-700 hover:bg-red-600 p-3 rounded-lg font-bold transition-colors border-b-4 border-red-950"
            >
              GIVE UP
            </button>
          </div>
          
          <button 
            onClick={() => setLinesCleared(prev => prev + 1)}
            className="w-full mt-4 py-2 border border-dashed border-gray-700 text-gray-600 text-xs hover:text-gray-400 hover:border-gray-500 transition-colors"
          >
            (DEBUG) Clear Line
          </button>
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
                  <p className="text-gray-600 text-xs text-center py-4">불러오는 중...</p>
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

