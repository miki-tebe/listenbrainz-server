import * as React from "react";

import { useLoaderData } from "react-router-dom";
import { Helmet } from "react-helmet";
import NiceModal from "@ebay/nice-modal-react";
import LastFmImporter from "../../lastfm/LastFMImporter";
import GlobalAppContext from "../../utils/GlobalAppContext";
import SpotifyImporterModal from "../../lastfm/SpotifyImporterModal";

type ImportLoaderData = {
  user_has_email: boolean;
  profile_url?: string;
  lastfm_api_url: string;
  lastfm_api_key: string;
  librefm_api_url: string;
  librefm_api_key: string;
};

export default function Import() {
  const { currentUser, APIService } = React.useContext(GlobalAppContext);
  const { name } = currentUser;
  const data = useLoaderData() as ImportLoaderData;
  const {
    user_has_email: userHasEmail,
    profile_url: profileUrl,
    lastfm_api_url: lastfmApiUrl,
    lastfm_api_key: lastfmApiKey,
    librefm_api_url: librefmApiUrl,
    librefm_api_key: librefmApiKey,
  } = data;
  const apiUrl = APIService.APIBaseURI;

  return (
    <>
      <Helmet>
        <title>Import for {name}</title>
      </Helmet>
      <h2 className="page-title">Import to user {name}</h2>
      {!userHasEmail && (
        <div className="alert alert-danger">
          You have not provided an email address. Please provide an{" "}
          <a href="https://musicbrainz.org/account/edit">email address</a> and{" "}
          <em>verify it</em> to submit listens. Read this{" "}
          <a href="https://blog.metabrainz.org/?p=8915">blog post</a> to
          understand why we need your email. You can provide us with an email on
          your{" "}
          <a href="https://musicbrainz.org/account/edit">MusicBrainz account</a>{" "}
          page.
        </div>
      )}
      <p>
        Import your existing listen history from other databases. To submit{" "}
        <em>new</em> listens, please visit the{" "}
        <a href="https://listenbrainz.org/add-data/">Connect services</a> and{" "}
        <a href="https://listenbrainz.org/settings/music-services/details/">
          Submitting data
        </a>{" "}
        pages.
        <br />
        Fun Fact: The term <strong>scrobble</strong> is a trademarked term by
        Last.fm, and we cannot use it. Instead, we use the term{" "}
        <strong>listen</strong> for our data.
      </p>

      <h3>Import from Last.fm and Libre.fm</h3>
      <p>
        The importer manually steps through your listen history and imports the
        listens one page at a time.
      </p>

      <ul>
        <li>
          In order for this to work, you must disable the &#34;Hide recent
          listening information&#34; setting in your Last.fm{" "}
          <a
            href="https://www.last.fm/settings/privacy"
            target="_blank"
            rel="noreferrer"
          >
            Privacy Settings
          </a>
          .
        </li>
        <li>
          Should it fail for whatever reason, it is safe to restart the import
          process.
        </li>
        <li>
          Running the import process multiple times <strong>does not</strong>{" "}
          create duplicates in your ListenBrainz listen history.
        </li>
        <li>
          Clicking the &quot;Import listens&quot; button will import your
          profile without the need to open Last.fm.
        </li>
        <li>
          Your listen counts may not be accurate for up to 24 hours after you
          import your data.{" "}
          <a
            href="https://listenbrainz.readthedocs.io/en/latest/general/data-update-intervals.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            See more details here.
          </a>
        </li>
      </ul>

      <p>
        You need to keep this page open while it is importing, which may take a
        while.
      </p>

      {userHasEmail && (
        <LastFmImporter
          user={{
            id: currentUser.id?.toString(),
            name: currentUser.name,
            auth_token: currentUser.auth_token!,
          }}
          profileUrl={profileUrl}
          apiUrl={apiUrl}
          lastfmApiUrl={lastfmApiUrl}
          lastfmApiKey={lastfmApiKey}
          librefmApiUrl={librefmApiUrl}
          librefmApiKey={librefmApiKey}
        />
      )}

      {userHasEmail && (
        <div className="Importer">
          <h4>Spotify extended streaming history</h4>
          <p>
            Spotify allows you to download you lifetime music history, but it
            will take a few steps and a bit of time:
            <ol>
              <li>
                You can request your lifetime streaming history in{" "}
                <a href="https://www.spotify.com/us/account/privacy/">
                  your Spotify account privacy settings
                </a>{" "}
                under <b>&quot;Extended streaming history&quot;</b>
              </li>
              <li>
                You will receive a confirmation email from Spotify and need to
                click a link to confirm your request to download your data
              </li>
              <li>
                The request may take up to 30 days to prepare, after which
                Spotify will send you an email with a download link
              </li>
              <li>
                Once you have downloaded the archive file (.zip), extract it
              </li>
              <li>Upload the .json files</li>
            </ol>
          </p>
          <div className="alert alert-warning">
            Please note that due to limitations with Spotify&apos;s timestamp
            precision, importing your history may create duplicates if you have
            already been tracking your Spotify listening history with
            ListenBrainz. To avoid bad surprises, you can specify start and end
            dates to limit your import to a specific window of time.
          </div>
          <button
            className="btn btn-default"
            type="button"
            onClick={() => {
              NiceModal.show(SpotifyImporterModal);
            }}
            data-toggle="modal"
            data-target="#SpotifyImporter"
          >
            Open the Spotify importer
          </button>
        </div>
      )}
    </>
  );
}
