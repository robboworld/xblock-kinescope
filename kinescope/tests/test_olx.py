# Copyright (C) 2026 Robbo <https://robbo.ru>
# SPDX-License-Identifier: AGPL-3.0-only

"""OLX export/import roundtrip tests for KinescopeXBlock."""

from unittest import TestCase
from xml.etree import ElementTree as ET

from xblock.fields import ScopeIds
from xblock.runtime import DictKeyValueStore, KvsFieldData
from xblock.test.tools import TestRuntime

from kinescope.kinescope import KinescopeXBlock


class KinescopeOlxTests(TestCase):
    """Verify force_export fields survive default add_xml_to_node."""

    def _make_block(self, video_link='', display_name=None):
        runtime = TestRuntime()
        field_data = KvsFieldData(DictKeyValueStore())
        scope_ids = ScopeIds('user', 'kinescope', 'def', 'usage')
        block = KinescopeXBlock(runtime, field_data, scope_ids)
        block.video_link = video_link
        if display_name is not None:
            block.display_name = display_name
        return block

    def test_exports_video_link(self):
        block = self._make_block(video_link='https://kinescope.io/example')
        node = ET.Element('kinescope')
        block.add_xml_to_node(node)
        self.assertEqual(node.get('video_link'), 'https://kinescope.io/example')

    def test_default_display_name(self):
        block = self._make_block()
        self.assertEqual(block.display_name, 'Kinescope')

    def test_exports_display_name(self):
        block = self._make_block(
            video_link='https://kinescope.io/example',
            display_name='Intro video',
        )
        node = ET.Element('kinescope')
        block.add_xml_to_node(node)
        self.assertEqual(node.get('display_name'), 'Intro video')

    def test_force_export_includes_video_link_when_set(self):
        self.assertTrue(KinescopeXBlock.fields['video_link'].force_export)
        self.assertTrue(KinescopeXBlock.fields['header_text'].force_export)

    def test_roundtrip_video_link_from_xml_attribute(self):
        source = self._make_block(video_link='https://kinescope.io/example')
        node = ET.Element('kinescope')
        source.add_xml_to_node(node)

        imported = self._make_block()
        imported.video_link = node.get('video_link')
        self.assertEqual(imported.video_link, 'https://kinescope.io/example')

    def test_exports_header_text_fields(self):
        block = self._make_block(video_link='https://kinescope.io/example')
        block.show_header_text = True
        block.header_text = 'Watch the intro'
        node = ET.Element('kinescope')
        block.add_xml_to_node(node)
        self.assertIn(node.get('show_header_text'), ('true', 'True', '1'))
        self.assertEqual(node.get('header_text'), 'Watch the intro')
