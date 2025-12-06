// React Hook for Play Page Synchronization
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWatchRoomContextSafe } from '@/components/WatchRoomProvider';
import type { PlayState } from '@/types/watch-room';

interface UsePlaySyncOptions {
  artPlayerRef: React.MutableRefObject<any>;
  videoId: string;
  videoName: string;
  videoYear?: string;
  searchTitle?: string;
  currentEpisode?: number;
  currentSource: string;
  videoUrl: string;
  playerReady: boolean;  // 播放器是否就绪
}

export function usePlaySync({
  artPlayerRef,
  videoId,
  videoName,
  videoYear,
  searchTitle,
  currentEpisode,
  currentSource,
  videoUrl,
  playerReady,
}: UsePlaySyncOptions) {
  const router = useRouter();
  const watchRoom = useWatchRoomContextSafe();
  const syncingRef = useRef(false); // 防止循环同步
  const lastSyncTimeRef = useRef(0); // 上次同步时间

  // 检查是否在房间内
  const isInRoom = !!(watchRoom && watchRoom.currentRoom);
  const isOwner = watchRoom?.isOwner || false;
  const currentRoom = watchRoom?.currentRoom;
  const socket = watchRoom?.socket;

  // 广播播放状态给房间内所有人（任何成员都可以触发同步）
  const broadcastPlayState = useCallback(() => {
    if (!socket || syncingRef.current || !watchRoom || !isInRoom) return;

    const player = artPlayerRef.current;
    if (!player) return;

    const state: PlayState = {
      type: 'play',
      url: videoUrl,
      currentTime: player.currentTime || 0,
      isPlaying: !player.paused,
      videoId,
      videoName,
      videoYear,
      searchTitle,
      episode: currentEpisode,
      source: currentSource,
    };

    // 使用防抖，避免频繁发送
    const now = Date.now();
    if (now - lastSyncTimeRef.current < 1000) return;
    lastSyncTimeRef.current = now;

    watchRoom.updatePlayState(state);
  }, [socket, videoUrl, videoId, videoName, videoYear, searchTitle, currentEpisode, currentSource, watchRoom, artPlayerRef, isInRoom]);

  // 接收并同步其他成员的播放状态
  useEffect(() => {
    if (!socket || !currentRoom || !isInRoom) {
      console.log('[PlaySync] Skip setup:', { hasSocket: !!socket, hasRoom: !!currentRoom, isInRoom });
      return;
    }

    console.log('[PlaySync] Setting up event listeners');

    const handlePlayUpdate = (state: PlayState) => {
      console.log('[PlaySync] Received play:update event:', state);
      const player = artPlayerRef.current;

      if (!player) {
        console.warn('[PlaySync] Player not ready for play:update');
        return;
      }

      if (syncingRef.current) {
        console.log('[PlaySync] Skipping play:update - already syncing');
        return;
      }

      console.log('[PlaySync] Processing play update - current state:', {
        playerPaused: player.paused,
        statePlaying: state.isPlaying,
        playerTime: player.currentTime,
        stateTime: state.currentTime
      });

      syncingRef.current = true;

      try {
        // 同步播放状态
        if (state.isPlaying && player.paused) {
          console.log('[PlaySync] Starting playback');
          player.play().catch((err: any) => console.error('[PlaySync] Play error:', err));
        } else if (!state.isPlaying && !player.paused) {
          console.log('[PlaySync] Pausing playback');
          player.pause();
        }

        // 同步进度（如果差异超过2秒）
        const timeDiff = Math.abs(player.currentTime - state.currentTime);
        if (timeDiff > 2) {
          console.log('[PlaySync] Seeking to:', state.currentTime, '(diff:', timeDiff, 's)');
          player.currentTime = state.currentTime;
        }
      } finally {
        setTimeout(() => {
          syncingRef.current = false;
        }, 500);
      }
    };

    const handlePlayCommand = () => {
      console.log('[PlaySync] Received play:play event');
      const player = artPlayerRef.current;

      if (!player) {
        console.warn('[PlaySync] Player not ready for play:play');
        return;
      }

      if (syncingRef.current) {
        console.log('[PlaySync] Skipping play:play - already syncing');
        return;
      }

      console.log('[PlaySync] Executing play command');
      syncingRef.current = true;
      player.play().catch((err: any) => console.error('[PlaySync] Play error:', err));
      setTimeout(() => {
        syncingRef.current = false;
      }, 500);
    };

    const handlePauseCommand = () => {
      console.log('[PlaySync] Received play:pause event');
      const player = artPlayerRef.current;

      if (!player) {
        console.warn('[PlaySync] Player not ready for play:pause');
        return;
      }

      if (syncingRef.current) {
        console.log('[PlaySync] Skipping play:pause - already syncing');
        return;
      }

      console.log('[PlaySync] Executing pause command');
      syncingRef.current = true;
      player.pause();
      setTimeout(() => {
        syncingRef.current = false;
      }, 500);
    };

    const handleSeekCommand = (currentTime: number) => {
      console.log('[PlaySync] Received play:seek event:', currentTime);
      const player = artPlayerRef.current;

      if (!player) {
        console.warn('[PlaySync] Player not ready for play:seek');
        return;
      }

      if (syncingRef.current) {
        console.log('[PlaySync] Skipping play:seek - already syncing');
        return;
      }

      console.log('[PlaySync] Executing seek command');
      syncingRef.current = true;
      player.currentTime = currentTime;
      setTimeout(() => {
        syncingRef.current = false;
      }, 500);
    };

    const handleChangeCommand = (state: PlayState) => {
      console.log('[PlaySync] Received play:change event:', state);
      if (syncingRef.current) {
        console.log('[PlaySync] Skipping play:change - already syncing');
        return;
      }

      // 跟随切换视频
      // 构建完整的 URL 参数
      const params = new URLSearchParams({
        id: state.videoId,
        source: state.source,
        episode: String(state.episode || 1),
      });

      // 添加可选参数
      if (state.videoName) params.set('title', state.videoName);
      if (state.videoYear) params.set('year', state.videoYear);
      if (state.searchTitle) params.set('stitle', state.searchTitle);

      const url = `/play?${params.toString()}`;
      console.log('[PlaySync] Redirecting to:', url);

      syncingRef.current = true;
      try {
        // 跳转到新的视频页面
        router.push(url);
      } finally {
        setTimeout(() => {
          syncingRef.current = false;
        }, 1000);
      }
    };

    socket.on('play:update', handlePlayUpdate);
    socket.on('play:play', handlePlayCommand);
    socket.on('play:pause', handlePauseCommand);
    socket.on('play:seek', handleSeekCommand);
    socket.on('play:change', handleChangeCommand);

    console.log('[PlaySync] Event listeners registered');

    return () => {
      console.log('[PlaySync] Cleaning up event listeners');
      socket.off('play:update', handlePlayUpdate);
      socket.off('play:play', handlePlayCommand);
      socket.off('play:pause', handlePauseCommand);
      socket.off('play:seek', handleSeekCommand);
      socket.off('play:change', handleChangeCommand);
    };
  }, [socket, currentRoom, artPlayerRef, isInRoom, router]);

  // 监听播放器事件并广播（所有成员都可以触发同步）
  useEffect(() => {
    if (!socket || !currentRoom || !isInRoom || !watchRoom) {
      console.log('[PlaySync] Skip player setup:', { hasSocket: !!socket, hasRoom: !!currentRoom, isInRoom, hasWatchRoom: !!watchRoom });
      return;
    }

    if (!playerReady) {
      console.log('[PlaySync] Player not ready yet, waiting...');
      return;
    }

    const player = artPlayerRef.current;
    if (!player) {
      console.warn('[PlaySync] Player ref is null despite playerReady=true');
      return;
    }

    console.log('[PlaySync] Setting up player event listeners');

    const handlePlay = () => {
      if (syncingRef.current) {
        console.log('[PlaySync] Skipping play event - already syncing');
        return;
      }
      console.log('[PlaySync] Play event detected, broadcasting...');
      watchRoom.play();
      broadcastPlayState();
    };

    const handlePause = () => {
      if (syncingRef.current) {
        console.log('[PlaySync] Skipping pause event - already syncing');
        return;
      }
      console.log('[PlaySync] Pause event detected, broadcasting...');
      watchRoom.pause();
      broadcastPlayState();
    };

    const handleSeeked = () => {
      if (syncingRef.current) {
        console.log('[PlaySync] Skipping seeked event - already syncing');
        return;
      }
      console.log('[PlaySync] Seeked event detected, broadcasting time:', player.currentTime);
      watchRoom.seekPlayback(player.currentTime);
    };

    player.on('play', handlePlay);
    player.on('pause', handlePause);
    player.on('seeked', handleSeeked);

    // 定期同步播放进度（每5秒）
    const syncInterval = setInterval(() => {
      if (syncingRef.current) return;
      if (player.paused) return; // 暂停时不同步

      console.log('[PlaySync] Periodic sync - broadcasting state');
      broadcastPlayState();
    }, 5000);

    console.log('[PlaySync] Player event listeners registered with periodic sync');

    return () => {
      console.log('[PlaySync] Cleaning up player event listeners');
      player.off('play', handlePlay);
      player.off('pause', handlePause);
      player.off('seeked', handleSeeked);
      clearInterval(syncInterval);
    };
  }, [socket, currentRoom, artPlayerRef, watchRoom, broadcastPlayState, isInRoom, playerReady]);

  // 房主：监听视频/集数/源变化并广播
  useEffect(() => {
    if (!isOwner || !socket || !currentRoom || !isInRoom || !watchRoom) return;
    if (!videoId || !videoUrl) return;

    // 延迟广播，避免初始化时触发
    const timer = setTimeout(() => {
      if (syncingRef.current) return;

      const state: PlayState = {
        type: 'play',
        url: videoUrl,
        currentTime: artPlayerRef.current?.currentTime || 0,
        isPlaying: artPlayerRef.current?.paused === false,
        videoId,
        videoName,
        videoYear,
        searchTitle,
        episode: currentEpisode,
        source: currentSource,
      };

      console.log('[PlaySync] Video/episode/source changed, broadcasting:', state);
      watchRoom.changeVideo(state);
    }, 500);

    return () => clearTimeout(timer);
  }, [isOwner, socket, currentRoom, isInRoom, watchRoom, videoId, currentEpisode, currentSource, videoUrl, videoName, videoYear, searchTitle, artPlayerRef]);

  return {
    isInRoom,
    isOwner,
    shouldDisableControls: isInRoom && !isOwner, // 房员禁用某些控制
    broadcastPlayState, // 导出供手动调用
  };
}
