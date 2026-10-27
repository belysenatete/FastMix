import unittest

from fastapi import HTTPException

from app.jobs import delivery_format


class DeliveryFormatTest(unittest.TestCase):
    def test_previews_download_as_rendered(self):
        self.assertEqual(delivery_format("wav", "preview", (), None), "wav")
        self.assertEqual(delivery_format("mp3", "preview", ("mp3", "wav"), "wav"), "mp3")

    def test_artist_defaults_to_wav_and_can_pick_mp3(self):
        self.assertEqual(delivery_format("wav", "full", ("mp3", "wav"), None), "wav")
        self.assertEqual(delivery_format("wav", "full", ("mp3", "wav"), "mp3"), "mp3")

    def test_pro_gets_mp3_only(self):
        self.assertEqual(delivery_format("wav", "full", ("mp3",), None), "mp3")
        with self.assertRaises(HTTPException) as caught:
            delivery_format("wav", "full", ("mp3",), "wav")
        self.assertEqual(caught.exception.status_code, 403)

    def test_lapsed_plan_keeps_mp3_of_earlier_tracks(self):
        self.assertEqual(delivery_format("wav", "full", (), None), "mp3")


if __name__ == "__main__":
    unittest.main()
