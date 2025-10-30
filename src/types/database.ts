/**
 * Supabase データベース型定義
 *
 * このファイルは将来的にSupabase CLIで自動生成されます。
 * 現時点では手動で基本構造を定義しています。
 *
 * 自動生成コマンド (Supabaseプロジェクト作成後):
 * npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
 */

import type { Faction } from './game';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      decks: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          faction: Faction;
          cards: string[];
          core_card_ids: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          faction: Faction;
          cards: string[];
          core_card_ids?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          faction?: Faction;
          cards?: string[];
          core_card_ids?: string[];
          is_active?: boolean;
          updated_at?: string;
        };
      };
      match_queue: {
        Row: {
          id: string;
          user_id: string;
          deck_id: string;
          status: 'waiting' | 'matched' | 'cancelled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          deck_id: string;
          status?: 'waiting' | 'matched' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'waiting' | 'matched' | 'cancelled';
          updated_at?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          player1_id: string;
          player2_id: string;
          player1_deck_id: string | null;
          player2_deck_id: string | null;
          winner_id: string | null;
          result_reason: string | null;
          total_turns: number | null;
          duration_seconds: number | null;
          replay_log: Json;
          status: 'pending' | 'completed' | 'error';
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          player1_id: string;
          player2_id: string;
          player1_deck_id?: string | null;
          player2_deck_id?: string | null;
          winner_id?: string | null;
          result_reason?: string | null;
          total_turns?: number | null;
          duration_seconds?: number | null;
          replay_log: Json;
          status?: 'pending' | 'completed' | 'error';
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          winner_id?: string | null;
          result_reason?: string | null;
          total_turns?: number | null;
          duration_seconds?: number | null;
          replay_log?: Json;
          status?: 'pending' | 'completed' | 'error';
          completed_at?: string | null;
        };
      };
      user_stats: {
        Row: {
          user_id: string;
          total_games: number;
          total_wins: number;
          faction_stats: Json;
          last_played_at: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          total_games?: number;
          total_wins?: number;
          faction_stats?: Json;
          last_played_at?: string | null;
          updated_at?: string;
        };
        Update: {
          total_games?: number;
          total_wins?: number;
          faction_stats?: Json;
          last_played_at?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
