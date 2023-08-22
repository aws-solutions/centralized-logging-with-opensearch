# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest

from util import log_parser
from util.log_parser import Counter, counter_iter


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


def test_log_entry():
    log = log_parser.LogEntry(time="2023-01-01 19:00:00", a=1, b=2)
    log.set_time("time", "%Y-%m-%d %H:%M:%S", "0800")

    assert log["a"] == 1
    assert log["b"] == 2
    assert log.dict()["time"] == "2023-01-01T19:00:00+08:00"

    log.set_time("time", "%Y-%m-%d %H:%M:%S", "+0830")
    assert log.dict()["time"] == "2023-01-01T19:00:00+08:30"

    log.set_time("time", "%Y-%m-%d %H:%M:%S", "-0630")
    assert log.dict()["time"] == "2023-01-01T19:00:00-06:30"


def test_parse_json():
    for each in log_parser.parse_by_json(
        [
            '{"a": 1, "b": 1}',
            '{"a": 1, "b": 1}',
        ]
    ):
        assert each["a"] == 1
        assert each["b"] == 1

    for each in log_parser.parse_by_json(
        [
            '{"t": "2023-01-01 19:00:00", "a": 1, "b": 1}',
            '{"t": "2023-01-01 19:00:00", "a": 1, "b": 1}',
        ],
        "t",
        "%Y-%m-%d %H:%M:%S",
    ):
        assert each.dict("t") == {"t": "2023-01-01T19:00:00", "a": 1, "b": 1}


def test_parse_regex():
    log = """\
NOT A JAVA LOG 0
NOT A JAVA LOG 1
2023-03-16 15:02:35 INFO [com.example.app.MyClass] - Request processed successfully0
NOT A JAVA LOG 2
2023-03-16 15:02:30 INFO [com.example.app.MyClass] - Processing request
        Request ID: 123456
        User ID: 7890
        Timestamp: 2023-03-16T15:02:30.123Z
        Data: {"name": "John Doe", "age": 30}

2023-03-16 15:02:35 INFO [com.example.app.MyClass] - Request processed successfully
        Request ID: 123456
        User ID: 7890
        Timestamp: 2023-03-16T15:02:35.456Z
        Response: {"status": "success", "message": "Request processed successfully"}
2023-03-16 15:02:35 WARN [com.example.app.MyClass] - Request processed successfully1
2023-03-16 15:02:35 ERROR [com.example.app.MyClass] - Request processed successfully2
NOT A JAVA LOG
2023-03-16 15:02:35 ERROR [com.example.app.MyClass] - Request processed successfully3
       BLA BLA
2023-03-16 15:02:35 INFO [com.example.app.MyClass] - Request processed successfully4
NOT A JAVA LOG 3"""

    lst = list(
        log_parser.parse_by_regex(
            log.splitlines(),
            r"^(?P<time>\d+-\d+-\d+ \d+:\d+:\d+) (?P<level>\w+) \[(?P<class>[^\]]+)\] - (?P<message>.*)",
            "time",
            "%Y-%m-%d %H:%M:%S",
        )
    )

    assert lst == [
        {"log": "NOT A JAVA LOG 0"},
        {"log": "NOT A JAVA LOG 1"},
        {
            "time": "2023-03-16 15:02:35",
            "level": "INFO",
            "class": "com.example.app.MyClass",
            "message": "Request processed successfully0NOT A JAVA LOG 2",
        },
        {
            "time": "2023-03-16 15:02:30",
            "level": "INFO",
            "class": "com.example.app.MyClass",
            "message": 'Processing request        Request ID: 123456        User ID: 7890        Timestamp: 2023-03-16T15:02:30.123Z        Data: {"name": "John Doe", "age": 30}',
        },
        {
            "time": "2023-03-16 15:02:35",
            "level": "INFO",
            "class": "com.example.app.MyClass",
            "message": 'Request processed successfully        Request ID: 123456        User ID: 7890        Timestamp: 2023-03-16T15:02:35.456Z        Response: {"status": "success", "message": "Request processed successfully"}',
        },
        {
            "time": "2023-03-16 15:02:35",
            "level": "WARN",
            "class": "com.example.app.MyClass",
            "message": "Request processed successfully1",
        },
        {
            "time": "2023-03-16 15:02:35",
            "level": "ERROR",
            "class": "com.example.app.MyClass",
            "message": "Request processed successfully2NOT A JAVA LOG",
        },
        {
            "time": "2023-03-16 15:02:35",
            "level": "ERROR",
            "class": "com.example.app.MyClass",
            "message": "Request processed successfully3       BLA BLA",
        },
        {
            "time": "2023-03-16 15:02:35",
            "level": "INFO",
            "class": "com.example.app.MyClass",
            "message": "Request processed successfully4NOT A JAVA LOG 3",
        },
    ]


def test_counter():
    c = Counter()
    assert c.value == 0

    c.increment()
    assert c.value == 1

    c.decrement()
    assert c.value == 0

    c.set_value(100)
    assert c.value == 100


def test_counter_iter():
    it = range(100)
    c = Counter()

    list(counter_iter(it, c))

    assert c.value == 100
