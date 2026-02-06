import React, { useState } from 'react';
import { useExperienceStore } from '@/store/core/experienceStore';
import { useGenreOrchestrationStore, GenrePhase } from '@/store/genre/genreOrchestrationStore';
import { GAME_PHASES } from '@/lib/gameTypes';
import { Bug, ChevronDown } from 'lucide-react';

export const DebugControls = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentPhase, startRatingGame, startGenreGame, resetExperience } = useExperienceStore();
  const { phase: genrePhase, setPhase: setGenrePhase } = useGenreOrchestrationStore();

  const ensureDebugState = () => {
    const state = useExperienceStore.getState();
    if (!state.username) {
      useExperienceStore.setState({
        username: 'debug-user',
        backgroundStatus: 'ready',
      });
    }
  };

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 left-4 z-[100] font-mono text-xs">
      <div
        className="bg-black/80 text-white rounded-md overflow-hidden shadow-xl border border-white/10 backdrop-blur-sm transition-all duration-300"
        style={{ width: isOpen ? '280px' : '40px', height: isOpen ? 'auto' : '40px' }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-10 flex items-center justify-center hover:bg-white/10"
        >
          {isOpen ? <ChevronDown size={16} /> : <Bug size={16} />}
        </button>

        {isOpen && (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-gray-400 mb-2 font-bold uppercase">Game Phase</h3>
              <div className="flex flex-col gap-1">
                <div className="text-[10px] text-gray-500 mb-1">Current: {currentPhase}</div>
                <button
                  onClick={() => {
                    useGenreOrchestrationStore.getState().resetGenreGame();
                    resetExperience();
                  }}
                  className="px-2 py-1 bg-red-900/50 hover:bg-red-900/80 rounded text-left"
                >
                  Reset Experience
                </button>
                <button
                  onClick={startRatingGame}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-left"
                >
                  Go to Rating Game
                </button>
                <button
                  onClick={() => {
                    useGenreOrchestrationStore.getState().resetGenreGame();
                    startGenreGame();
                  }}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-left"
                >
                  Go to Genre Game
                </button>
              </div>
            </div>

            {currentPhase === GAME_PHASES.GENRE && (
              <div>
                <h3 className="text-gray-400 mb-2 font-bold uppercase">Genre Phase</h3>
                <div className="flex flex-col gap-1">
                  <div className="text-[10px] text-gray-500 mb-1">Current: {genrePhase}</div>
                  {(['ranking', 'matching', 'post-game'] as GenrePhase[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        ensureDebugState();
                        setGenrePhase(p);
                      }}
                      className={`px-2 py-1 rounded text-left ${
                        genrePhase === p
                          ? 'bg-green-900/50 text-green-200'
                          : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      Jump to {p}
                    </button>
                  ))}

                  {genrePhase === 'post-game' && (
                    <div className="mt-2 pl-2 border-l border-gray-700 space-y-1">
                      <div className="text-[10px] text-gray-500">Post-Game View</div>
                      <button
                        onClick={() => {
                          setGenrePhase('post-game');
                          useGenreOrchestrationStore.getState().setPostGameStep(0);
                        }}
                        className="w-full px-2 py-1 bg-blue-900/40 hover:bg-blue-900/60 rounded text-left text-xs"
                      >
                        ↳ Bubbles
                      </button>
                      <button
                        onClick={() => {
                          setGenrePhase('post-game');
                          useGenreOrchestrationStore.getState().setPostGameStep(1);
                        }}
                        className="w-full px-2 py-1 bg-blue-900/40 hover:bg-blue-900/60 rounded text-left text-xs"
                      >
                        ↳ Taste Gap
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
