import { useState, useMemo, useCallback } from 'react';
import type { GameState, GameAction } from '@/types/game';
import { 
  formatActionAsText, 
  findDecisiveAction, 
  getTurnNumberForAction,
  getFinalGameState,
  INTERNAL_LOG_TYPES,
} from '@/lib/game-state-utils';
import { calculateTurnSummaries, TurnSummary } from '@/lib/stats-utils';

export function useBattleLog(gameState: GameState) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPlayer, setFilterPlayer] = useState<string>('all');
  const [copySuccess, setCopySuccess] = useState(false);

  const filteredActions = useMemo(() => {
    let filtered = [...gameState.actionLog];

    // Phase 1-A: 内部処理ログを除外
    filtered = filtered.filter(action => !INTERNAL_LOG_TYPES.includes(action.type));

    // Phase 2: phase_change はターン開始のみ表示
    filtered = filtered.filter(action => {
      if (action.type === 'phase_change') {
        return action.data.toPhase === 'draw';
      }
      return true;
    });

    if (filterType !== 'all') {
      filtered = filtered.filter(action => action.type === filterType);
    }

    if (filterPlayer !== 'all') {
      filtered = filtered.filter(action => action.playerId === filterPlayer);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(action => {
        const actionText = formatActionAsText(action, gameState);
        return actionText.toLowerCase().includes(term);
      });
    }

    return filtered;
  }, [gameState, searchTerm, filterType, filterPlayer]);

  const groupedActions = useMemo(() => {
    const groups: Record<number, GameAction[]> = {};
    filteredActions.forEach(action => {
      const turnNumber = getTurnNumberForAction(action, gameState);
      if (!groups[turnNumber]) {
        groups[turnNumber] = [];
      }
      groups[turnNumber].push(action);
    });
    return groups;
  }, [filteredActions, gameState]);

  const decisiveAction = useMemo(() => findDecisiveAction(gameState), [gameState]);

  const formatBattleLogAsText = useCallback((useFiltered: boolean = false): string => {
    const actionsToFormat = useFiltered ? filteredActions : gameState.actionLog;
    
    const startTime = new Date(gameState.startTime).toLocaleString('ja-JP');
    const duration = Math.floor((Date.now() - gameState.startTime) / 1000);
    let text = `=== Ashenhall 戦闘ログ ===\n`;
    text += `ゲームID: ${gameState.gameId}\n`;
    text += `開始時刻: ${startTime}\n`;
    text += `現在ターン: ${gameState.turnNumber}\n`;
    text += `経過時間: ${duration}秒\n`;
    if (gameState.result) {
      const winner = gameState.result.winner ? (gameState.result.winner === 'player1' ? 'あなた' : '相手') : '引き分け';
      const reason = gameState.result.reason === 'life_zero' ? 'ライフ0' : 'その他';
      text += `勝者: ${winner} (${reason}による勝利)\n`;
      text += `総ターン: ${gameState.result.totalTurns}\n`;
    }

    const turnSummaries = calculateTurnSummaries(gameState);
    if (turnSummaries.length > 0) {
      text += `\n=== 戦況サマリー ===\n`;
      turnSummaries.forEach((summary: TurnSummary) => {
        text += `【ターン${summary.turnNumber}】`;
        if (summary.player1Damage > 0) text += ` あなた ${summary.player1LifeBefore}→${summary.player1LifeAfter}HP (-${summary.player1Damage})`;
        if (summary.player2Damage > 0) text += ` 相手 ${summary.player2LifeBefore}→${summary.player2LifeAfter}HP (-${summary.player2Damage})`;
        if (summary.significance) text += ` | ${summary.significance}`;
        text += `\n`;
      });
    }

    text += `\n=== アクション詳細 ===\n`;
    if (actionsToFormat.length < gameState.actionLog.length) {
      text += `※ フィルター適用済み (${actionsToFormat.length}/${gameState.actionLog.length}件表示)\n`;
    }
    const grouped = actionsToFormat.reduce((acc, action) => {
        const turn = getTurnNumberForAction(action, gameState);
        if (!acc[turn]) acc[turn] = [];
        acc[turn].push(action);
        return acc;
    }, {} as Record<number, GameAction[]>);

    Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).forEach(([turn, actions]) => {
        text += `\n【ターン${turn}】\n`;
        actions.forEach(action => {
            text += `  ${formatActionAsText(action, gameState)}\n`;
        });
    });

    if (gameState.result) {
      text += `\n=== ゲーム終了 ===\n`;
      const finalState = getFinalGameState(gameState);
      text += `あなた  - ライフ: ${finalState.player1.life}  場: ${finalState.player1.fieldCards}体  手札: ${finalState.player1.handCards}枚  デッキ: ${finalState.player1.deckCards}枚\n`;
      text += `相手    - ライフ: ${finalState.player2.life}  場: ${finalState.player2.fieldCards}体  手札: ${finalState.player2.handCards}枚  デッキ: ${finalState.player2.deckCards}枚\n`;
    }
    
    return text;
  }, [gameState, filteredActions]);

  const copyToClipboard = useCallback(async (useFiltered: boolean = false) => {
    try {
      const logText = formatBattleLogAsText(useFiltered);
      await navigator.clipboard.writeText(logText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('コピーに失敗しました:', error);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [formatBattleLogAsText]);

  const handleSearchTermChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleFilterTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterType(e.target.value);
  }, []);

  const handleFilterPlayerChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterPlayer(e.target.value);
  }, []);

  return {
    searchTerm,
    filterType,
    filterPlayer,
    copySuccess,
    filteredActions,
    groupedActions,
    decisiveAction,
    handleSearchTermChange,
    handleFilterTypeChange,
    handleFilterPlayerChange,
    copyToClipboard,
  };
}
