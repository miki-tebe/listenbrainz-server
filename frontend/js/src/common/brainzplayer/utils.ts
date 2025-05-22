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

// eslint-disable-next-line import/prefer-default-export
export function listenOrJSPFTrackToQueueItem(
  track: Listen | JSPFTrack
): BrainzPlayerQueueItem {
  let listenTrack: Listen;
  if (has(track, "title")) {
    listenTrack = JSPFTrackToListen(track as JSPFTrack);
  } else {
    listenTrack = cloneDeep(track as Listen);
  }
  const queueItem: BrainzPlayerQueueItem = {
    ...listenTrack,
    id: `queue-item-${getBrainzPlayerQueueItemKey(listenTrack)}`,
  };
  return queueItem;
}

// eslint-disable-next-line import/prefer-default-export
export function shuffleQueue(
  queue: BrainzPlayerQueue,
  currentListenIndex: number
): BrainzPlayerQueue {
  if (!queue || queue.length === 0) {
    return [];
  }
  if (currentListenIndex >= queue.length - 1) {
    return [...queue];
  }

  const newQueue = [...queue];
  const shuffleStartIndex = currentListenIndex + 1;
  if (shuffleStartIndex >= newQueue.length) {
    return newQueue;
  }

  const partToKeep = newQueue.slice(0, shuffleStartIndex);
  const partToShuffle = newQueue.slice(shuffleStartIndex);
  const shuffledPart = shuffle(partToShuffle);
  return [...partToKeep, ...shuffledPart];
}
