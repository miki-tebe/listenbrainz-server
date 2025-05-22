import { cloneDeep, has, shuffle } from "lodash";
import { JSPFTrackToListen } from "../../playlists/utils";
import {
  getArtistMBIDs,
  getArtistName,
  getRecordingMBID,
  getRecordingMSID,
  getReleaseGroupMBID,
  getReleaseMBID,
  getReleaseName,
  getTrackName,
} from "../../utils/utils";

// Define BrainzPlayerQueueItem based on its observed structure from BrainzPlayerContext.tsx
// and the return type of listenOrJSPFTrackToQueueItem.
// Listen type is assumed to be available in this scope or imported elsewhere,
// for this task we will assume 'any' for listen properties if Listen is not directly importable.
// A more robust solution would be to ensure Listen is an exported type.
type BrainzPlayerQueueItem = Listen & { id: string };
type BrainzPlayerQueue = BrainzPlayerQueueItem[];

const getBrainzPlayerQueueItemKey = (listen: Listen): string =>
  `${getRecordingMSID(listen)}-${getTrackName(listen)}-${getArtistName(
    listen
  )}-${getReleaseName(listen)}-${
    listen.track_metadata?.mbid_mapping?.release_group_name
  }-${getRecordingMBID(listen)}-${getArtistMBIDs(listen)?.join(
    ","
  )}-${getReleaseMBID(listen)}-${getReleaseGroupMBID(listen)}-${
    listen.track_metadata?.mbid_mapping?.caa_id
  }-${listen.track_metadata?.mbid_mapping?.caa_release_mbid}-${
    listen.listened_at
  }-${listen.inserted_at}`;

export function listenOrJSPFTrackToQueueItem(
  track: Listen | JSPFTrack
): BrainzPlayerQueueItem {
  let listenTrack: Listen;
  if (has(track, "title")) {
    listenTrack = JSPFTrackToListen(track as JSPFTrack);
  } else {
    // Assuming track is already compatible with Listen or is a BrainzPlayerQueueItem
    listenTrack = cloneDeep(track as Listen);
  }
  const queueItem: BrainzPlayerQueueItem = {
    ...listenTrack,
    id: `queue-item-${getBrainzPlayerQueueItemKey(listenTrack)}`,
  };
  return queueItem;
}

export function shuffleQueue(
  queue: BrainzPlayerQueue,
  currentListenIndex: number
): BrainzPlayerQueue {
  if (!queue || queue.length === 0) {
    return [];
  }

  // Ensure currentListenIndex is within valid bounds for slicing
  // If currentListenIndex is -1 (nothing playing), or beyond the array, treat as shuffling the whole queue from start (or end respectively)
  // However, the requirement is to shuffle *after* currentListenIndex.
  // If currentListenIndex is the last item or beyond, or if there's nothing to shuffle, return a copy.
  if (currentListenIndex >= queue.length - 1) {
    return [...queue];
  }

  const newQueue = [...queue]; // Create a shallow copy to not modify the original
  
  // Part of the queue to shuffle starts after currentListenIndex
  // If currentListenIndex is -1, we shuffle from index 0.
  const shuffleStartIndex = currentListenIndex + 1;
  
  if (shuffleStartIndex >= newQueue.length) {
    // Nothing to shuffle after the current index
    return newQueue;
  }

  const partToKeep = newQueue.slice(0, shuffleStartIndex);
  const partToShuffle = newQueue.slice(shuffleStartIndex);

  const shuffledPart = shuffle(partToShuffle); // Lodash shuffle returns a new shuffled array

  return [...partToKeep, ...shuffledPart];
}
