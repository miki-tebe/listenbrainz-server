import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  BrainzPlayerProvider,
  useBrainzPlayerContext,
  useBrainzPlayerDispatch,
  initialValue,
} from '../../../src/common/brainzplayer/BrainzPlayerContext';
import { listenOrJSPFTrackToQueueItem } from '../../../src/common/brainzplayer/utils';

// Mock JSPFTrack and Listen types for creating queue items
// These are simplified versions for testing purposes.
type MockJSPFTrack = {
  extension: {
    track_mbid: string;
    media_player_track_id?: string;
  };
  title: string;
  creator: string;
  album?: string;
  identifier: string; // Corresponds to MSID
};

type MockListen = {
  track_metadata: {
    track_name: string;
    artist_name: string;
    release_name?: string;
    mbid_mapping?: {
      recording_mbid?: string;
      recording_msid?: string; // MSID is often here in real Listen objects
    };
  };
  // Add other Listen properties if needed by listenOrJSPFTrackToQueueItem's key generation
  listened_at: number; // Changed from optional to required
  inserted_at?: number;
};

// Helper to create mock Listen items more easily
const createMockListen = (
  name: string,
  idSuffix: string,
  msid?: string,
  releaseName?: string // Added releaseName parameter
): MockListen => ({
  track_metadata: {
    track_name: name,
    artist_name: `Artist for ${name}`,
    release_name: releaseName || `Test Album ${idSuffix}`, // Use provided or default
    mbid_mapping: {
      recording_mbid: `mbid-${idSuffix}`,
      ...(msid && { recording_msid: msid }), // Ensure MSID is present for key generation
    },
  },
  listened_at: Date.now(), // Ensure listened_at is always a number
  inserted_at: Date.now(), // for unique key generation
});

// Helper Test Component
const TestComponent = () => {
  const context = useBrainzPlayerContext();
  const dispatch = useBrainzPlayerDispatch();

  return (
    <div>
      <button onClick={() => dispatch({ type: 'SHUFFLE_QUEUE' })}>
        Shuffle
      </button>
      <div data-testid="queue-state">{JSON.stringify(context.queue)}</div>
      <div data-testid="current-index">{context.currentListenIndex}</div>
      <div data-testid="current-listen">
        {JSON.stringify(context.currentListen)}
      </div>
    </div>
  );
};

describe('BrainzPlayerContext Shuffle Action', () => {
  // Test Case 1: Shuffle only tracks after the current listen.
  it('should only shuffle tracks after the current listen index', () => {
    const mockListens: MockListen[] = [
      createMockListen('Track 1', '1', 'msid-1', 'Album A'),
      createMockListen('Track 2', '2', 'msid-2', 'Album A'),
      createMockListen('Track 3', '3', 'msid-3', 'Album B'),
      createMockListen('Track 4', '4', 'msid-4', 'Album B'),
      createMockListen('Track 5', '5', 'msid-5', 'Album C'),
    ];
    const initialQueue = mockListens.map(listenOrJSPFTrackToQueueItem);
    const currentListenIndex = 1; // Track 2 is current

    render(
      <BrainzPlayerProvider
        additionalContextValues={{
          queue: initialQueue,
          currentListenIndex,
          currentListen: initialQueue[currentListenIndex],
        }}
      >
        <TestComponent />
      </BrainzPlayerProvider>
    );

    const originalQueueIds = initialQueue.map(item => item.id);
    const partToKeep = originalQueueIds.slice(0, currentListenIndex + 1);
    const partToShuffleOriginalIds = originalQueueIds.slice(currentListenIndex + 1);

    act(() => {
      screen.getByText('Shuffle').click();
    });

    const newQueue = JSON.parse(screen.getByTestId('queue-state').textContent || '[]');
    const newQueueIds = newQueue.map((item: any) => item.id);

    // Assertions
    expect(newQueue.length).toBe(initialQueue.length);
    // Tracks at and before currentListenIndex should remain the same
    expect(newQueueIds.slice(0, currentListenIndex + 1)).toEqual(partToKeep);
    
    // Tracks after currentListenIndex should be different if shuffling occurred
    // (This is probabilistic, but highly likely for 3+ items)
    const newShuffledPartIds = newQueueIds.slice(currentListenIndex + 1);
    if (partToShuffleOriginalIds.length > 1) { // Shuffling only makes sense for 2+ items
        expect(newShuffledPartIds).not.toEqual(partToShuffleOriginalIds);
    } else {
        expect(newShuffledPartIds).toEqual(partToShuffleOriginalIds); // Should be same if 0 or 1 item
    }

    // Overall set of tracks should be the same (check IDs)
    expect(newQueueIds.sort()).toEqual(originalQueueIds.sort());
    // Check currentListen and currentListenIndex are preserved
    expect(screen.getByTestId('current-index').textContent).toBe(String(currentListenIndex));
    expect(JSON.parse(screen.getByTestId('current-listen').textContent || '{}').id).toBe(initialQueue[currentListenIndex].id);
  });

  // Test Case 2: Shuffle when currentListenIndex is -1
  it('should shuffle all tracks when currentListenIndex is -1', () => {
    const mockListens: MockListen[] = [
      createMockListen('Track A', 'A', 'msid-A', 'Album X'),
      createMockListen('Track B', 'B', 'msid-B', 'Album X'),
      createMockListen('Track C', 'C', 'msid-C', 'Album Y'),
      createMockListen('Track D', 'D', 'msid-D', 'Album Y'),
    ];
    const initialQueue = mockListens.map(listenOrJSPFTrackToQueueItem);
    const currentListenIndex = -1;

    render(
      <BrainzPlayerProvider
        additionalContextValues={{
          queue: initialQueue,
          currentListenIndex,
          currentListen: undefined, // No current listen
        }}
      >
        <TestComponent />
      </BrainzPlayerProvider>
    );

    const originalQueueIds = initialQueue.map(item => item.id);

    act(() => {
      screen.getByText('Shuffle').click();
    });

    const newQueue = JSON.parse(screen.getByTestId('queue-state').textContent || '[]');
    const newQueueIds = newQueue.map((item: any) => item.id);

    expect(newQueue.length).toBe(initialQueue.length);
    // All tracks should be reordered (probabilistic for 4 items)
    if (originalQueueIds.length > 1) {
        expect(newQueueIds).not.toEqual(originalQueueIds);
    } else {
        expect(newQueueIds).toEqual(originalQueueIds);
    }
    // Overall set of tracks should be the same
    expect(newQueueIds.sort()).toEqual(originalQueueIds.sort());
    expect(screen.getByTestId('current-index').textContent).toBe(String(currentListenIndex));
  });

  // Test Case 3: Shuffle when currentListenIndex is the last track
  it('should not change the queue if currentListenIndex is the last track', () => {
    const mockListens: MockListen[] = [
      createMockListen('Track X', 'X', 'msid-X', 'Album Q'),
      createMockListen('Track Y', 'Y', 'msid-Y', 'Album Q'),
      createMockListen('Track Z', 'Z', 'msid-Z', 'Album R'),
    ];
    const initialQueue = mockListens.map(listenOrJSPFTrackToQueueItem);
    const currentListenIndex = initialQueue.length - 1;

    render(
      <BrainzPlayerProvider
        additionalContextValues={{
          queue: initialQueue,
          currentListenIndex,
          currentListen: initialQueue[currentListenIndex],
        }}
      >
        <TestComponent />
      </BrainzPlayerProvider>
    );

    const originalQueueIds = initialQueue.map(item => item.id);

    act(() => {
      screen.getByText('Shuffle').click();
    });

    const newQueue = JSON.parse(screen.getByTestId('queue-state').textContent || '[]');
    const newQueueIds = newQueue.map((item: any) => item.id);

    expect(newQueue.length).toBe(initialQueue.length);
    expect(newQueueIds).toEqual(originalQueueIds); // Queue should be unchanged
    expect(screen.getByTestId('current-index').textContent).toBe(String(currentListenIndex));
  });

  // Test Case 4: Shuffle an empty queue
  it('should keep the queue empty if it starts empty', () => {
    const initialQueue: any[] = [];
    const currentListenIndex = -1;

    render(
      <BrainzPlayerProvider
        additionalContextValues={{
          queue: initialQueue,
          currentListenIndex,
          currentListen: undefined,
        }}
      >
        <TestComponent />
      </BrainzPlayerProvider>
    );

    act(() => {
      screen.getByText('Shuffle').click();
    });

    const newQueue = JSON.parse(screen.getByTestId('queue-state').textContent || '[]');
    
    expect(newQueue.length).toBe(0);
    expect(screen.getByTestId('current-index').textContent).toBe(String(currentListenIndex));
  });

  // Test Case 5: Shuffle a queue with only one track
  it('should not change the queue if it has only one track', () => {
    const mockListens: MockListen[] = [createMockListen('Solo Track', 'solo', 'msid-solo', 'Album Solo')];
    const initialQueue = mockListens.map(listenOrJSPFTrackToQueueItem);
    const currentListenIndex = 0;

    render(
      <BrainzPlayerProvider
        additionalContextValues={{
          queue: initialQueue,
          currentListenIndex,
          currentListen: initialQueue[currentListenIndex],
        }}
      >
        <TestComponent />
      </BrainzPlayerProvider>
    );
    
    const originalQueueIds = initialQueue.map(item => item.id);

    act(() => {
      screen.getByText('Shuffle').click();
    });

    const newQueue = JSON.parse(screen.getByTestId('queue-state').textContent || '[]');
    const newQueueIds = newQueue.map((item: any) => item.id);

    expect(newQueue.length).toBe(1);
    expect(newQueueIds).toEqual(originalQueueIds); // Queue should be unchanged
    expect(screen.getByTestId('current-index').textContent).toBe(String(currentListenIndex));
  });
});

// A more specific check for Test Case 1 to ensure the shuffled part is truly shuffled for larger segments.
describe('BrainzPlayerContext Shuffle Action - Detailed Suffix Shuffle Check', () => {
  it('should robustly verify that the suffix of the queue is shuffled', () => {
    const trackCount = 10; // Use enough tracks to make accidental same order unlikely
    const mockListens: MockListen[] = Array.from({ length: trackCount }, (_, i) =>
      createMockListen(`Track ${i + 1}`, `${i + 1}`, `msid-${i + 1}`, `Album ${i % 3}`) // Add some album variety
    );
    const initialQueue = mockListens.map(listenOrJSPFTrackToQueueItem);
    const currentListenIndex = 2; // e.g., Track 3

    render(
      <BrainzPlayerProvider
        additionalContextValues={{
          queue: initialQueue,
          currentListenIndex,
          currentListen: initialQueue[currentListenIndex],
        }}
      >
        <TestComponent />
      </BrainzPlayerProvider>
    );

    const originalQueueSuffixIds = initialQueue.slice(currentListenIndex + 1).map(item => item.id);
    
    // Try multiple times to reduce flakiness if by chance it shuffles to the same order
    let suffixShuffled = false;
    for (let i = 0; i < 5; i++) { // Max 5 attempts
      act(() => {
        screen.getByText('Shuffle').click();
      });
      const newQueue = JSON.parse(screen.getByTestId('queue-state').textContent || '[]');
      const newQueueSuffixIds = newQueue.slice(currentListenIndex + 1).map((item: any) => item.id);
      if (JSON.stringify(newQueueSuffixIds) !== JSON.stringify(originalQueueSuffixIds)) {
        suffixShuffled = true;
        break;
      }
      // If it was the same, and it's not the last attempt, we are here.
      // Note: For very small suffixes (e.g., 2 items), it might flip back and forth.
      // The shuffleQueue function itself is deterministic for a given Math.random sequence,
      // but react re-renders might reset something or Math.random might be seeded.
      // However, with lodash shuffle, this should be okay.
    }
    
    const newQueue = JSON.parse(screen.getByTestId('queue-state').textContent || '[]');
    const newQueueIds = newQueue.map((item: any) => item.id);
    const originalQueueIds = initialQueue.map(item => item.id);

    expect(newQueue.length).toBe(initialQueue.length);
    expect(newQueueIds.slice(0, currentListenIndex + 1)).toEqual(originalQueueIds.slice(0, currentListenIndex + 1));
    
    // For a sufficiently large suffix, it's highly improbable it remains the same across multiple shuffles.
    // If originalQueueSuffixIds.length is small (e.g., 2), this might still be flaky.
    // For 7 items (10 - 3), it's very unlikely to shuffle to the exact same order.
    if (originalQueueSuffixIds.length > 2) { // Only assert difference if there's enough to shuffle meaningfully
        expect(suffixShuffled).toBe(true);
    } else {
        // If 2 or less items in suffix, it might be same or different, just check overall integrity
        expect(newQueueIds.slice(currentListenIndex + 1).sort()).toEqual(originalQueueSuffixIds.sort());
    }
    expect(newQueueIds.sort()).toEqual(originalQueueIds.sort());
    expect(screen.getByTestId('current-index').textContent).toBe(String(currentListenIndex));
  });
});
