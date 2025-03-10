import unittest
from unittest.mock import patch, call

from listenbrainz_spark import config
from listenbrainz_spark.dump import DumpType
from listenbrainz_spark.exceptions import DumpNotFoundException
from listenbrainz_spark.ftp.download import ListenbrainzDataDownloader


class FTPDownloaderTestCase(unittest.TestCase):

    @patch('ftplib.FTP')
    def test_get_dump_name_to_download(self, mock_ftp_cons):
        dump = ['listenbrainz-01-00000', 'listenbrainz-02-00000']
        req_dump = ListenbrainzDataDownloader().get_dump_name_to_download(dump, 1, 1)
        self.assertEqual(req_dump, 'listenbrainz-01-00000')

        req_dump = ListenbrainzDataDownloader().get_dump_name_to_download(dump, None, 1)
        self.assertEqual(req_dump, 'listenbrainz-02-00000')

        with self.assertRaises(DumpNotFoundException):
            ListenbrainzDataDownloader().get_dump_name_to_download(dump, 3, 1)

    @patch('ftplib.FTP')
    def test_get_listens_dump_file_name(self, mock_ftp_cons):
        filename = ListenbrainzDataDownloader().get_listens_dump_file_name('listenbrainz-dump-17-20190101-000001-full/')
        self.assertEqual('listenbrainz-spark-dump-17-20190101-000001-full.tar', filename)

        filename = ListenbrainzDataDownloader().get_listens_dump_file_name('listenbrainz-dump-17-20190101-000001-incremental/')
        self.assertEqual('listenbrainz-spark-dump-17-20190101-000001-incremental.tar', filename)

    @patch('listenbrainz_spark.ftp.ListenBrainzFTPDownloader.download_dump')
    @patch('listenbrainz_spark.ftp.download.ListenbrainzDataDownloader.get_listens_dump_file_name')
    @patch('listenbrainz_spark.ftp.ListenBrainzFTPDownloader.list_dir')
    @patch('ftplib.FTP')
    def test_download_listens_full_dump(self, mock_ftp, mock_list_dir, mock_get_f_name, mock_download_dump):
        mock_list_dir.return_value = ['listenbrainz-dump-123-20190101-000000/', 'listenbrainz-dump-45-20190201-000000']
        mock_get_f_name.return_value = 'listenbrainz-spark-dump-123-20190101-000000-full.tar'
        dest_path, filename, dump_id = ListenbrainzDataDownloader().download_listens('fakedir', None, dump_type=DumpType.FULL)
        mock_list_dir.assert_called_once()
        mock_ftp.return_value.cwd.assert_has_calls(
            [call(config.FTP_LISTENS_DIR + 'fullexport/'), call('listenbrainz-dump-123-20190101-000000/')])
        self.assertEqual('listenbrainz-spark-dump-123-20190101-000000-full.tar', filename)

        mock_get_f_name.assert_called_once()
        mock_download_dump.assert_called_once_with(mock_get_f_name.return_value, 'fakedir')
        self.assertEqual(dest_path, mock_download_dump.return_value)
        self.assertEqual(dump_id, 123)

    @patch('listenbrainz_spark.ftp.ListenBrainzFTPDownloader.download_dump')
    @patch('listenbrainz_spark.ftp.download.ListenbrainzDataDownloader.get_listens_dump_file_name')
    @patch('listenbrainz_spark.ftp.ListenBrainzFTPDownloader.list_dir')
    @patch('ftplib.FTP')
    def test_download_listens_full_dump_by_id(self, mock_ftp, mock_list_dir, mock_get_f_name, mock_download_dump):
        mock_list_dir.return_value = ['listenbrainz-dump-123-20190101-000000/', 'listenbrainz-dump-45-20190201-000000']
        mock_get_f_name.return_value = 'listenbrainz-spark-dump-45-20190201-000000-full.tar'
        dest_path, filename, dump_id = ListenbrainzDataDownloader().download_listens('fakedir',
                                                                                     listens_dump_id=45,
                                                                                     dump_type=DumpType.FULL)
        mock_list_dir.assert_called_once()
        mock_ftp.return_value.cwd.assert_has_calls([
            call(config.FTP_LISTENS_DIR + 'fullexport/'),
            call('listenbrainz-dump-45-20190201-000000')
        ])
        self.assertEqual('listenbrainz-spark-dump-45-20190201-000000-full.tar', filename)

        mock_get_f_name.assert_called_once()
        mock_download_dump.assert_called_once_with(mock_get_f_name.return_value, 'fakedir')
        self.assertEqual(dest_path, mock_download_dump.return_value)
        self.assertEqual(dump_id, 45)

    @patch('listenbrainz_spark.ftp.ListenBrainzFTPDownloader.download_dump')
    @patch('listenbrainz_spark.ftp.download.ListenbrainzDataDownloader.get_listens_dump_file_name')
    @patch('listenbrainz_spark.ftp.ListenBrainzFTPDownloader.list_dir')
    @patch('ftplib.FTP')
    def test_download_listens_incremental_dump(self, mock_ftp, mock_list_dir, mock_get_f_name, mock_download_dump):
        mock_list_dir.return_value = ['listenbrainz-dump-123-20190101-000000/', 'listenbrainz-dump-45-20190201-000000']
        mock_get_f_name.return_value = 'listenbrainz-spark-dump-123-20190101-000000-incremental.tar'
        dest_path, filename, dump_id = ListenbrainzDataDownloader().download_listens('fakedir', None, dump_type=DumpType.INCREMENTAL)
        mock_list_dir.assert_called_once()
        mock_ftp.return_value.cwd.assert_has_calls(
            [call(config.FTP_LISTENS_DIR + 'incremental/'), call('listenbrainz-dump-123-20190101-000000/')])
        self.assertEqual('listenbrainz-spark-dump-123-20190101-000000-incremental.tar', filename)

        mock_get_f_name.assert_called_once()
        mock_download_dump.assert_called_once_with(mock_get_f_name.return_value, 'fakedir')
        self.assertEqual(dest_path, mock_download_dump.return_value)
        self.assertEqual(dump_id, 123)

    @patch('listenbrainz_spark.ftp.ListenBrainzFTPDownloader.download_dump')
    @patch('listenbrainz_spark.ftp.download.ListenbrainzDataDownloader.get_listens_dump_file_name')
    @patch('listenbrainz_spark.ftp.ListenBrainzFTPDownloader.list_dir')
    @patch('ftplib.FTP')
    def test_download_listens_incremental_dump_by_id(self, mock_ftp, mock_list_dir, mock_get_f_name, mock_download_dump):
        mock_list_dir.return_value = ['listenbrainz-dump-123-20190101-000000', 'listenbrainz-dump-45-20190201-000000']
        mock_get_f_name.return_value = 'listenbrainz-spark-dump-45-20190201-000000-incremental.tar'
        dest_path, filename, dump_id = ListenbrainzDataDownloader().download_listens('fakedir', listens_dump_id=45,
                                                                                     dump_type=DumpType.INCREMENTAL)
        mock_list_dir.assert_called_once()
        mock_ftp.return_value.cwd.assert_has_calls([
            call(config.FTP_LISTENS_DIR + 'incremental/'),
            call('listenbrainz-dump-45-20190201-000000')
        ])
        self.assertEqual('listenbrainz-spark-dump-45-20190201-000000-incremental.tar', filename)

        mock_get_f_name.assert_called_once()
        mock_download_dump.assert_called_once_with(mock_get_f_name.return_value, 'fakedir')
        self.assertEqual(dest_path, mock_download_dump.return_value)
        self.assertEqual(dump_id, 45)
