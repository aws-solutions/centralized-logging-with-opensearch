# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest

from util import log_parser


class TestELB:
    def setup(self):
        with open("./test/datafile/elb.log", encoding="utf-8") as f:
            self.data = f.readlines()
            self.elb = log_parser.ELB()

    def test_parse(self):
        for line in self.data:
            record = self.elb.parse(line)
            assert isinstance(record, dict)
            assert "client_ip" in record.keys()

    def test_fields(self):
        assert "client_ip" in self.elb.fields

    def test_parse_error(self):
        record = self.elb.parse("invalid data")
        assert record == {}


class TestCloudTrail:
    def setup(self):
        with open("./test/datafile/cloudtrail.log", encoding="utf-8") as f:
            self.data = f.readlines()
        self.ct = log_parser.CloudTrail()
        assert len(self.data) == 1

    def test_parse(self):
        for line in self.data:
            records = self.ct.parse(line)
            assert isinstance(records, list)
        assert len(records) == 4

    def test_fields(self):
        pass

    def test_parse_error(self):
        record = self.ct.parse("invalid data")
        assert record == []


class TestS3:
    def setup(self):
        with open("./test/datafile/s3.log", encoding="utf-8") as f:
            self.data = f.readlines()
        self.s3 = log_parser.S3()
        assert len(self.data) == 6

    def test_parse(self):
        result = []
        for line in self.data:
            record = self.s3.parse(line)
            assert isinstance(record, dict)
            result.append(record)
        assert len(result) == 6

    def test_fields(self):
        assert "bucket" in self.s3.fields

    def test_parse_error(self):
        record = self.s3.parse("invalid data")
        assert record == {}


class TestCloudFront:
    def setup(self):
        with open("./test/datafile/cloudfront.log", encoding="utf-8") as f:
            self.data = f.readlines()
            assert len(self.data) == 4
        self.cf = log_parser.CloudFront()

    def test_parse(self):
        result = []
        for line in self.data:
            record = self.cf.parse(line)
            assert isinstance(record, dict)
            if record:
                result.append(record)
        assert len(result) == 2

    def test_fields(self):
        assert "c-ip" in self.cf.fields

    def test_parse_error(self):
        record = self.cf.parse("invalid data")
        assert record == {}


class TestWAF:
    def setup(self):
        with open("./test/datafile/waf.log", encoding="utf-8") as f:
            self.data = f.readlines()
            assert len(self.data) == 2
        self.waf = log_parser.WAF()

    def test_parse(self):
        for line in self.data:
            record = self.waf.parse(line)
            assert isinstance(record, dict)
            print(record)
            assert "action" in record

    def test_parse_error(self):
        record = self.waf.parse("invalid data")
        assert record == {}


class TestVPCFlow:
    def setup(self):
        with open("./test/datafile/vpcflow.log", encoding="utf-8") as f:
            self.data = f.readlines()

            assert len(self.data) == 18
        self.vpcf = log_parser.VPCFlow()

    def test_parse(self):
        records = []
        for line in self.data:
            record = self.vpcf.parse(line)
            assert isinstance(record, dict)
            if record:
                records.append(record)

        assert len(records) == 10

        example = records[0]
        assert "bytes" in example
        assert "start" in example
        assert example["start"].isnumeric()
        assert example["bytes"].isnumeric()

    def test_parse_error(self):
        record = self.vpcf.parse("invalid data")
        assert record == {}


class TestConfig:
    def setup(self):
        self.cfg = log_parser.Config()

    def test_parse_history(self):

        with open("./test/datafile/config-history.log", encoding="utf-8") as f:
            history_data = f.readlines()
            assert len(history_data) == 1
            records = []
            for line in history_data:
                records = self.cfg.parse(line)
                assert isinstance(records, list)
                assert len(records) == 2

    def test_parse_snapshot(self):
        with open("./test/datafile/config-snapshot.log", encoding="utf-8") as f:
            snapshot_data = f.readlines()
            assert len(snapshot_data) == 1
            for line in snapshot_data:
                records = self.cfg.parse(line)
                # snapshot data will be ignored
                assert len(records) == 0

    def test_parse_error(self):
        record = self.cfg.parse("invalid data")
        assert record == []


class TestRDS:
    def setup(self):
        self.rds = log_parser.RDS()

    def test_parse(self):
        # TODO: Break into different sub types
        with open("./test/datafile/rds.log", encoding="utf-8") as f:
            data = f.readlines()
            assert len(data) == 1

        for line in data:
            records = self.rds.parse(line)
            assert isinstance(records, list)
            print(records)
            assert len(records) == 159
            rec = records[0]
            assert rec["db-identifier"] == "myaudb-instance-1"

    def test_parse_error(self):
        record = self.rds.parse("invalid data")
        assert record == []


class TestLogParser:
    def test_init(self):
        with pytest.raises(RuntimeError):
            log_parser.LogParser("unknown")
