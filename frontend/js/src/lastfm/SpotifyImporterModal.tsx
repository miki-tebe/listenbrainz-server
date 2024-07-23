import * as React from "react";

import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faHeart } from "@fortawesome/free-regular-svg-icons";
import {
  faCalendar,
  faCheck,
  faInfoCircle,
  faSpinner,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { capitalize, set } from "lodash";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { parseSpotifyExtendedHistory } from "@kellnerd/listenbrainz/parser/spotify";
import { formatListen } from "@kellnerd/listenbrainz/listen";
import NiceModal, { useModal } from "@ebay/nice-modal-react";
import DateTimePicker from "react-datetime-picker/dist/entry.nostyle";
import { format } from "date-fns";
import ReactTooltip from "react-tooltip";
import Pill from "../components/Pill";
import GlobalAppContext from "../utils/GlobalAppContext";
import { ToastMsg } from "../notifications/Notifications";

export const LASTFM_RETRIES = 3;

export type ImporterProps = {
  user: {
    id?: string;
    name: string;
    auth_token: string;
  };
  profileUrl?: string;
  apiUrl?: string;
  lastfmApiUrl: string;
  lastfmApiKey: string;
  librefmApiUrl: string;
  librefmApiKey: string;
};

export type ImporterState = {
  show: boolean;
  canClose: boolean;
  lastfmUsername: string;
  msg?: React.ReactElement;
  service: ImportService;
};

export default NiceModal.create(() => {
  const modal = useModal();
  // const navigate = useNavigate();

  const closeModal = React.useCallback(() => {
    modal.hide();
    document?.body?.classList?.remove("modal-open");
    setTimeout(modal.remove, 200);
  }, [modal]);

  const { APIService, currentUser } = React.useContext(GlobalAppContext);

  const [startDatetime, setStartDatetime] = React.useState<Date | null>(null);
  const [endDatetime, setEndDatetime] = React.useState<Date | null>(null);

  const submitSpotifyStreams = async (text: string) => {
    if (!currentUser.auth_token) {
      toast.warning("You must be logged in to import your Spotify history");
      return;
    }
    let listensToSubmit = [];
    // const streams: Array<SpotifyStream> = JSON.parse(text);
    try {
      const history = parseSpotifyExtendedHistory(text, {
        includeDebugInfo: true,
      });
      // eslint-disable-next-line no-restricted-syntax
      for (const listen of history) {
        set(
          listen,
          "track_metadata.additional_info?.submission_client",
          "ListenBrainz web + @kellnerd/listenbrainz parser"
        );
        console.debug(formatListen(listen));
        listensToSubmit.push(listen);
      }
      if (startDatetime || endDatetime) {
        listensToSubmit = listensToSubmit.filter(
          (listen) => {
            if (
              startDatetime &&
              listen.listened_at <= startDatetime.getTime() / 1000
            ) {
              return false;
            }
            if (
              endDatetime &&
              listen.listened_at >= endDatetime.getTime() / 1000
            ) {
              return false;
            }
            return true;
          }
          //     listen.track_metadata.additional_info?.duration_ms &&
          //     listen.track_metadata.additional_info?.duration_ms > 18e4 // 3 minutes played
        );
      }
      console.debug(`Submitting ${listensToSubmit.length} listens`);
      try {
        await APIService.submitListens(
          currentUser.auth_token,
          "import",
          listensToSubmit
        );
      } catch (error) {
        toast.error(
          <ToastMsg
            title="An error occured while importing Spotify history"
            message={error.toString()}
          />
        );
      }
    } catch (error) {
      toast.error(
        <ToastMsg
          title="An error occured while parsing the Spotify history file"
          message={error.toString()}
        />
      );
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fr = new FileReader();
    fr.onload = (e) => {
      submitSpotifyStreams(e?.target?.result as string);
    };
    if (
      !event ||
      !event.target ||
      !event.target.files ||
      !event.target.files[0]
    ) {
      // eslint-disable-next-line no-console
      console.error("Invalid file!");
      toast.error("The file you submitted is invalid. Please try again.");
      return;
    }
    fr.readAsText(event.target.files[0]);
  };

  return (
    <>
      <div
        className={`modal fade ${modal.visible ? "in" : ""}`}
        id="SpotifyImporter"
        tabIndex={-1}
        role="dialog"
        aria-labelledby="SpotifyImporterLabel"
        data-backdrop="true"
      >
        <div className="modal-dialog" role="document">
          <form className="modal-content" onSubmit={(e) => e.preventDefault()}>
            <div className="modal-header">
              <button
                type="button"
                className="close"
                data-dismiss="modal"
                aria-label="Close"
                onClick={closeModal}
              >
                <span aria-hidden="true">&times;</span>
              </button>
              <h4 className="modal-title" id="SpotifyImporterLabel">
                Spotify Extended Streaming History
              </h4>
            </div>

            <div
              style={{
                height: 0,
                position: "sticky",
                top: "30%",
                zIndex: 1,
              }}
            >
              {/* <Loader isLoading={loading} /> */}
            </div>

            <div
              className="modal-body"
              // style={{ opacity: loading ? "0.2" : "1" }}
            >
              <h3>
                Select a spotify extended history .json file to get started
              </h3>
              <input
                id="spotify-import-file"
                type="file"
                onChange={handleImportFile}
              />
              <hr />
              <h4>Only import listens...</h4>
              <p>
                Avoid potential duplicates by setting the date you first
                connected Spotify to ListenBrainz as the &quot;before
                date&quot;&nbsp;
                <span data-tip data-for="date-selection-info">
                  <FontAwesomeIcon icon={faInfoCircle} />
                </span>
                <ReactTooltip
                  id="date-selection-info"
                  place="bottom"
                  type="warning"
                  effect="solid"
                >
                  <p>
                    Please note that due to limitations with Spotify&apos;s
                    timestamp precision, importing your history may create
                    duplicates if you have already been tracking your Spotify
                    listening history with ListenBrainz. To avoid bad surprises,
                    you can specify start and end dates to limit your import to
                    a specific window of time.
                  </p>
                </ReactTooltip>
              </p>
              <label htmlFor="startDatetime">After date:&nbsp;</label>
              <input
                aria-label="After date"
                id="startDatetime"
                type="datetime-local"
                onChange={(e) => setStartDatetime(e.currentTarget.valueAsDate)}
              />
              {/* <DateTimePicker
                id="startDatetime"
                value={startDatetime}
                onChange={setStartDatetime}
                calendarIcon={<FontAwesomeIcon icon={faCalendar} />}
                maxDate={new Date()}
                clearIcon={null}
                format="yyyy-MM-dd h:mm:ss a"
                label
              /> */}
              <br />
              <label htmlFor="endDatetime">Before date:&nbsp;</label>
              <input
                aria-label="Before date"
                id="endDatetime"
                type="datetime-local"
                onChange={(e) => setEndDatetime(e.currentTarget.valueAsDate)}
              />
              {/* <DateTimePicker
                id="endDatetime"
                value={endDatetime}
                onChange={setEndDatetime}
                calendarIcon={<FontAwesomeIcon icon={faCalendar} />}
                maxDate={new Date()}
                clearIcon={null}
                format="yyyy-MM-dd h:mm:ss a"
              /> */}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-default"
                data-dismiss="modal"
                onClick={closeModal}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className={`modal-backdrop fade ${modal.visible ? "in" : ""}`} />
    </>
  );
});
