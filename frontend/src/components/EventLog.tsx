import React from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { Terminal } from 'lucide-react';

export const EventLog: React.FC = () => {
  const { recentEvents } = useSimulatorStore();

  const getBadgeStyle = (severity: string) => {
    switch (severity) {
      case 'danger':
        return 'bg-[#FF1E56]/15 text-[#FF1E56] border-[#FF1E56]/40';
      case 'warning':
        return 'bg-[#FFB703]/15 text-[#FFB703] border-[#FFB703]/40';
      case 'success':
        return 'bg-[#00FF88]/15 text-[#00FF88] border-[#00FF88]/40';
      default:
        return 'bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF]/40';
    }
  };

  return (
    <div className="h-16 bg-[#06080B] border-t border-[#243042] flex flex-col flex-shrink-0 px-3 py-1.5 select-none z-10 font-mono">
      <div className="flex items-center justify-between pb-0.5 border-b border-[#243042]/60 mb-1">
        <div className="flex items-center space-x-1.5 text-[10px] font-bold text-[#E6EDF5] font-display uppercase tracking-widest">
          <Terminal className="w-3 h-3 text-[#00E5FF]" />
          <span>COMBAT AUDIT TRAIL</span>
        </div>
        <div className="text-[9px] text-[#5D728E] font-mono">
          NEONDB CLUSTER AUDIT
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-0.5 text-xs">
        {recentEvents.slice(0, 3).map((evt) => {
          const date = new Date(evt.timestamp);
          const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
          return (
            <div key={evt.id} className="flex items-center space-x-2 text-[10px]">
              <span className="text-[#5D728E] font-mono">{timeStr}</span>
              <span className={`px-1 py-0.1 text-[9px] font-mono font-bold border ${getBadgeStyle(evt.severity)}`}>
                {evt.type}
              </span>
              <span className="text-[#E6EDF5] truncate font-mono">
                {evt.description}
              </span>
            </div>
          );
        })}
        {recentEvents.length === 0 && (
          <div className="text-[#5D728E] text-[10px] font-mono">Telemetry sensor feed idle...</div>
        )}
      </div>
    </div>
  );
};
