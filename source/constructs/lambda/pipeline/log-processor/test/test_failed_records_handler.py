# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest


class TestRestorerWriteToCsv:
    """Tests for Restorer.write_to_csv fieldname handling.

    Regression coverage for GitHub issue #356 (WAF log
    requestBodySize / requestBodySizeInspectedByWAF) and the earlier
    issue #126 (ALB geo_city): records carrying keys absent from the
    first record must not raise "dict contains fields not in fieldnames".
    """

    @pytest.fixture
    def restorer(self):
        from event.failed_records_handler import Restorer
        return Restorer()

    def test_write_to_csv_uniform_records(self, restorer):
        records = [
            {"a": "1", "b": "2"},
            {"a": "3", "b": "4"},
        ]
        body = restorer.write_to_csv(records)
        header = body.splitlines()[0]
        assert header == "a,b"
        assert "1,2" in body
        assert "3,4" in body

    def test_write_to_csv_later_record_has_extra_fields(self, restorer):
        # First record lacks the new WAF fields; a later record has them.
        # Previously raised ValueError because fieldnames came from records[0].
        records = [
            {"action": "ALLOW", "httpMethod": "GET"},
            {
                "action": "BLOCK",
                "httpMethod": "POST",
                "requestBodySize": "1024",
                "requestBodySizeInspectedByWAF": "8192",
            },
        ]
        body = restorer.write_to_csv(records)
        header = body.splitlines()[0]
        assert "requestBodySize" in header
        assert "requestBodySizeInspectedByWAF" in header
        # Rows are still written for both records.
        assert len(body.splitlines()) == 3

    def test_write_to_csv_preserves_first_seen_column_order(self, restorer):
        records = [
            {"a": "1", "b": "2"},
            {"a": "3", "c": "4"},
        ]
        body = restorer.write_to_csv(records)
        header = body.splitlines()[0]
        # First-seen order: a, b (from record 0), then c (new in record 1).
        assert header == "a,b,c"

    def test_write_to_csv_unions_plugin_mapping_keys(self, restorer):
        class FakePlugin:
            def __init__(self, mapping):
                self._mapping = mapping

            def get_mapping(self):
                return self._mapping

        records = [{"a": "1"}]
        plugins = [FakePlugin({"geo_city": None}), FakePlugin({"geo_country": None})]
        body = restorer.write_to_csv(records, plugins)
        header = body.splitlines()[0]
        # Both plugins' keys are present (the old loop kept only the last).
        assert "geo_city" in header
        assert "geo_country" in header
