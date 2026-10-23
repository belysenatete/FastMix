import unittest

from app import direction
from app.audio import local_mix_graph
from app.direction import refine, settings_from_prompt
from app.vocals import VOCAL_CATEGORIES


class DirectionTests(unittest.TestCase):
    def test_genre_maps_to_each_endpoint_enum(self):
        def style(prompt, endpoint):
            return direction.style_for(settings_from_prompt(prompt)["genre"], endpoint)

        self.assertEqual(style("Dark drill, heavy 808", "recombine"), "TRAP")
        self.assertEqual(style("Dark drill, heavy 808", "mix"), "HIPHOP_GRIME")
        self.assertEqual(style("afro trap vibe", "recombine"), "AFROBEAT")
        self.assertEqual(style("Reggaeton dembow", "recombine"), "REGGAETON")
        self.assertEqual(style("Reggaeton dembow", "mix"), "OTHER")
        self.assertEqual(style("lofi chill", "recombine"), "LO_FI")
        self.assertEqual(style("big orchestral strings", "mix"), "ORCHESTRAL")
        self.assertEqual(style("big orchestral strings", "master"), "OTHER")
        self.assertEqual(style("cinematic", "master"), "OTHER")
        self.assertEqual(style("something unusual", "recombine"), "OTHER")

    def test_initial_settings_from_direction(self):
        settings = settings_from_prompt("Melodic trap, vocals upfront, lush reverb, hard autotune in A minor, loud for the club")
        self.assertEqual(settings["genre"], "TRAP")
        self.assertEqual(settings["loudness"], "HIGH")
        self.assertEqual(settings["vocal_gain_db"], 2.0)
        self.assertEqual(settings["reverb"], "HIGH")
        self.assertEqual(settings["autotune"], {"strength": 1.0, "scale": [0, 2, 4, 5, 7, 9, 11], "key": "A minor"})

    def test_vocal_level_words_do_not_change_overall_loudness(self):
        self.assertEqual(settings_from_prompt("vocals louder")["loudness"], "MEDIUM")
        self.assertEqual(settings_from_prompt("more vocal reverb")["vocal_gain_db"], 0.0)
        self.assertEqual(settings_from_prompt("vocals blended into the beat")["vocal_gain_db"], -2.0)

    def test_autotune_parsing(self):
        self.assertIsNone(settings_from_prompt("warm trap vocal")["autotune"])
        self.assertIsNone(settings_from_prompt("no autotune please")["autotune"])
        self.assertIsNone(settings_from_prompt("sans autotune")["autotune"])
        self.assertEqual(settings_from_prompt("autotune léger")["autotune"]["strength"], 0.45)
        self.assertEqual(settings_from_prompt("autotune, key of F# major")["autotune"]["scale"], [1, 3, 5, 6, 8, 10, 11])
        self.assertEqual(settings_from_prompt("Bb minor with autotune")["autotune"]["key"], "Bb minor")
        self.assertEqual(settings_from_prompt("autotune en la mineur")["autotune"]["key"], "A minor")


class RefineTests(unittest.TestCase):
    def setUp(self):
        self.base = settings_from_prompt("melodic trap, some reverb, autotune")

    def test_vocal_and_reverb_steps(self):
        settings, changes = refine(self.base, "vocal louder and more reverb")
        self.assertEqual((settings["vocal_gain_db"], settings["reverb"]), (2.0, "HIGH"))
        self.assertEqual(settings["loudness"], self.base["loudness"], "vocal louder must not raise the master")
        self.assertEqual(changes, ["vocal +2 dB", "reverb: high"])

    def test_changes_accumulate_and_clamp(self):
        settings = self.base
        for _ in range(5):
            settings, _ = refine(settings, "turn up the vocals")
        self.assertEqual(settings["vocal_gain_db"], 6.0)
        settings, changes = refine(settings, "vocals up")
        self.assertEqual(changes, [], "a change at the limit is reported as no change")

    def test_autotune_adjustments(self):
        harder, changes = refine(self.base, "harder autotune in C major")
        self.assertEqual((harder["autotune"]["strength"], harder["autotune"]["key"]), (1.0, "C major"))
        self.assertEqual(changes, ["autotune: hard in C major"])
        softer, _ = refine(self.base, "less autotune")
        self.assertEqual(softer["autotune"]["strength"], 0.45)
        off, changes = refine(self.base, "remove the autotune")
        self.assertIsNone(off["autotune"])
        self.assertEqual(changes, ["autotune off"])
        added, _ = refine(settings_from_prompt("pop"), "add autotune")
        self.assertEqual(added["autotune"]["strength"], 0.8)

    def test_loudness_style_and_french(self):
        louder, changes = refine(self.base, "louder, more punch")
        self.assertEqual((louder["loudness"], changes), ("HIGH", ["loudness: high"]))
        drill, changes = refine(self.base, "make it afro instead")
        self.assertEqual((drill["genre"], changes), ("AFROBEAT", ["style: Afrobeat"]))
        french, changes = refine(self.base, "voix plus forte, moins de réverbe")
        self.assertEqual((french["vocal_gain_db"], french["reverb"]), (2.0, "LOW"))

    def test_unrecognized_note_changes_nothing(self):
        settings, changes = refine(self.base, "make it sound amazing")
        self.assertEqual((settings, changes), (self.base, []))

    def test_refine_does_not_mutate_the_source(self):
        before = settings_from_prompt("trap, autotune")
        refine(before, "harder autotune in A minor")
        self.assertEqual(before, settings_from_prompt("trap, autotune"))

    def test_describe(self):
        settings, _ = refine(self.base, "vocal louder, harder autotune in A minor")
        self.assertEqual(direction.describe(settings), "Trap · medium loudness · vocal +2 dB · medium vocal reverb · hard autotune in A minor")
        self.assertIsNone(direction.describe(None))


class LocalMixGraphTests(unittest.TestCase):
    def test_vocal_effects_only_on_vocals(self):
        settings = {**settings_from_prompt("lush reverb"), "vocal_gain_db": 4.0}
        graph = local_mix_graph(["beat", "lead_vocal", "adlibs"], settings, VOCAL_CATEGORIES)
        self.assertIn("[0:a]anull[t0]", graph)
        self.assertIn("[1:a]volume=4.0dB,aecho=", graph)
        self.assertIn("[2:a]volume=4.0dB,aecho=", graph)
        self.assertIn("amix=inputs=3", graph)
        self.assertTrue(graph.endswith("[out]"))

    def test_dry_single_track(self):
        self.assertEqual(local_mix_graph(["master"], settings_from_prompt("pop"), VOCAL_CATEGORIES), "[0:a]anull[t0];[t0]anull[out]")


if __name__ == "__main__":
    unittest.main()
