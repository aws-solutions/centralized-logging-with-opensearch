# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import pytest


class TestCloudFrontWithRT:
    def setup(self):
        from log_processor.log_parser import CloudFrontWithRT

        self.cf_with_rt = CloudFrontWithRT()

    def test_parse(self):
        line = "12345\ttest.com\tGET\t200\t/home\tFirefox\t1.2.3.4"
        result = self.cf_with_rt.parse(line)
        assert result["timestamp"] == "12345"

    # @pytest.mark.parametrize(
    #     "line, err_msg",
    #     [
    #         ('12345\ttest\tGET', 'missing fields'),
    #         ('{1234: "test"}', 'invalid format'),
    #     ]
    # )
    # def test_parse_invalid(self,line, err_msg):
    #     with pytest.raises(ValueError) as excinfo:
    #         self.cf_with_rt.parse(line)
    #     assert err_msg in str(excinfo.value)

    def test_comma_delimited_list(self):
        s = "timestamp,domain,method"
        expected = ["timestamp", "domain", "method"]
        result = self.cf_with_rt.comma_delimited_list_string(s)
        assert result == expected


class TestELBWithS3:
    def setup(self):
        with open("./test/datafile/elb.log", encoding="utf-8") as f:
            self.data = f.readlines()
            from log_processor.log_parser import ELBWithS3

            self.elb = ELBWithS3()

    def test_parse(self):
        # for line in self.data:
        records = self.elb.parse(self.data)
        for record in records:
            assert isinstance(record, dict)
            assert "client_ip" in record.keys()

    def test_fields(self):
        assert "client_ip" in self.elb.fields




class TestCloudTrailWithS3:
    def setup(self):
        with open("./test/datafile/cloudtrail.log", encoding="utf-8") as f:
            self.data = f.readlines()
        from log_processor.log_parser import CloudTrailWithS3

        self.ct = CloudTrailWithS3()
        assert len(self.data) == 1

    def test_parse(self):

        records = self.ct.parse(self.data)
        i=0
        for record in records:
            assert isinstance(record, dict)
            i+=1
            # assert record.
        assert i==4



class TestS3:
    def setup(self):
        with open("./test/datafile/s3.log", encoding="utf-8") as f:
            self.data = f.readlines()
        from log_processor.log_parser import S3WithS3

        self.s3 = S3WithS3()
        assert len(self.data) == 6

    def test_parse(self):
        result = []
        records = self.s3.parse(self.data)
        for record in records:
            assert isinstance(record, dict)
            result.append(record)
        assert len(result) == 6

    def test_fields(self):
        assert "bucket" in self.s3.fields




class TestCloudFront:
    def setup(self):
        with open("./test/datafile/cloudfront.log", encoding="utf-8") as f:
            self.data = f.readlines()
            assert len(self.data) == 4
        from log_processor.log_parser import CloudFrontWithS3

        self.cf = CloudFrontWithS3()

    def test_parse(self):
        result = []
        records = self.cf.parse(self.data)
        for record in records:
            assert isinstance(record, dict)
            if record:
                result.append(record)
        assert len(result) == 2

    def test_fields(self):
        assert "c-ip" in self.cf.fields




class TestWAF:
    def setup(self):
        with open("./test/datafile/waf.log", encoding="utf-8") as f:
            self.data = f.readlines()
            assert len(self.data) == 2
        from log_processor.log_parser import WAFWithS3

        self.waf = WAFWithS3()

    def test_parse(self):
        records = self.waf.parse(self.data)
        for record in records:
            assert isinstance(record, dict)
            assert "action" in record




class TestVPCFlow:
    def setup(self):
        with open("./test/datafile/vpcflow.log", encoding="utf-8") as f:
            self.data = f.readlines()

            assert len(self.data) == 18
        from log_processor.log_parser import VPCFlowWithS3

        self.vpcf = VPCFlowWithS3()

    def test_parse(self):
        recs = []

        records = self.vpcf.parse(self.data)
        for record in records:
            assert isinstance(record, dict)
            if record:
                recs.append(record)

        assert len(recs) == 10

        example = recs[0]
        assert "bytes" in example
        assert "start" in example
        assert example["start"].isnumeric()
        assert example["bytes"].isnumeric()




class TestConfig:
    def setup(self):
        from log_processor.log_parser import ConfigWithS3

        self.cfg = ConfigWithS3()

    # def test_parse_history(self):
    #     with open("./test/datafile/config-history.log", encoding="utf-8") as f:
    #         history_data = f.readlines()
    #         assert len(history_data) == 1
    #         records = []
    #         for line in history_data:
    #             records = self.cfg.parse(line)
    #             assert isinstance(records, list)
    #             assert len(records) == 2

    def test_parse_snapshot(self):
        with open("./test/datafile/config-snapshot.log", encoding="utf-8") as f:
            snapshot_data = f.readlines()
            assert len(snapshot_data) == 1
            records = self.cfg.parse(snapshot_data)
            recs=[]
            for record in records:
                # snapshot data will be ignored
                assert isinstance(record, dict)
                if record:
                    recs.append(record)
            assert len(recs) == 0



class TestRDS:
    def setup(self):
        from log_processor.log_parser import RDSWithS3

        self.rds = RDSWithS3()

    def test_parse(self):
        with open("./test/datafile/rds.log", encoding="utf-8") as f:
            self.data = f.readlines()
            assert len( self.data) == 1
            for record in self.rds.parse(self.data):
                assert isinstance(record,dict)

class TestLogParser:
    def test_init(self):
        with pytest.raises(RuntimeError):
            from log_processor.log_parser import LogParser

            LogParser("unknown")


def test_log_entry():
    from log_processor.log_parser import LogEntry

    log = LogEntry(time="2023-01-01 19:00:00", a=1, b=2)
    log.set_time("time", "%Y-%m-%d %H:%M:%S", "0800")

    assert log["a"] == 1
    assert log["b"] == 2
    assert log.dict()["time"] == "2023-01-01T19:00:00+08:00"

    log.set_time("time", "%Y-%m-%d %H:%M:%S", "+0830")
    assert log.dict()["time"] == "2023-01-01T19:00:00+08:30"

    log.set_time("time", "%Y-%m-%d %H:%M:%S", "-0630")
    assert log.dict()["time"] == "2023-01-01T19:00:00-06:30"


# def test_parse_json():
#     for each in parse_by_json(
#         [
#             '{"a": 1, "b": 1}',
#             '{"a": 1, "b": 1}',
#         ]
#     ):
#         assert each["a"] == 1
#         assert each["b"] == 1


#     for each in parse_by_json(
#         [
#             '{"t": "2023-01-01 19:00:00", "a": 1, "b": 1}',
#             '{"t": "2023-01-01 19:00:00", "a": 1, "b": 1}',
#         ],
#         "t",
#         "%Y-%m-%d %H:%M:%S",
#     ):
#         assert each.dict("t") == {"t": "2023-01-01T19:00:00", "a": 1, "b": 1}
# class TestRegex:
#     def setup(self):
#         from log_processor.log_parser import Regex
#
#         self.regex = Regex()
#
#     def test_parse_for_s3_event(self):
#         pass


# def test_parse_regex():
#     log = """\
# NOT A JAVA LOG 0
# NOT A JAVA LOG 1
# 2023-03-16 15:02:35 INFO [com.example.app.MyClass] - Request processed successfully0
# NOT A JAVA LOG 2
# 2023-03-16 15:02:30 INFO [com.example.app.MyClass] - Processing request
#         Request ID: 123456
#         User ID: 7890
#         Timestamp: 2023-03-16T15:02:30.123Z
#         Data: {"name": "John Doe", "age": 30}

# 2023-03-16 15:02:35 INFO [com.example.app.MyClass] - Request processed successfully
#         Request ID: 123456
#         User ID: 7890
#         Timestamp: 2023-03-16T15:02:35.456Z
#         Response: {"status": "success", "message": "Request processed successfully"}
# 2023-03-16 15:02:35 WARN [com.example.app.MyClass] - Request processed successfully1
# 2023-03-16 15:02:35 ERROR [com.example.app.MyClass] - Request processed successfully2
# NOT A JAVA LOG
# 2023-03-16 15:02:35 ERROR [com.example.app.MyClass] - Request processed successfully3
#        BLA BLA
# 2023-03-16 15:02:35 INFO [com.example.app.MyClass] - Request processed successfully4
# NOT A JAVA LOG 3"""

#     lst = list(
#         parse_by_regex(
#             log.splitlines(),
#             r"^(?P<time>\d+-\d+-\d+ \d+:\d+:\d+) (?P<level>\w+) \[(?P<class>[^\]]+)\] - (?P<message>.*)",
#             "time",
#             "%Y-%m-%d %H:%M:%S",
#         )
#     )

#     assert lst == [
#         {"log": "NOT A JAVA LOG 0"},
#         {"log": "NOT A JAVA LOG 1"},
#         {
#             "time": "2023-03-16 15:02:35",
#             "level": "INFO",
#             "class": "com.example.app.MyClass",
#             "message": "Request processed successfully0NOT A JAVA LOG 2",
#         },
#         {
#             "time": "2023-03-16 15:02:30",
#             "level": "INFO",
#             "class": "com.example.app.MyClass",
#             "message": 'Processing request        Request ID: 123456        User ID: 7890        Timestamp: 2023-03-16T15:02:30.123Z        Data: {"name": "John Doe", "age": 30}',
#         },
#         {
#             "time": "2023-03-16 15:02:35",
#             "level": "INFO",
#             "class": "com.example.app.MyClass",
#             "message": 'Request processed successfully        Request ID: 123456        User ID: 7890        Timestamp: 2023-03-16T15:02:35.456Z        Response: {"status": "success", "message": "Request processed successfully"}',
#         },
#         {
#             "time": "2023-03-16 15:02:35",
#             "level": "WARN",
#             "class": "com.example.app.MyClass",
#             "message": "Request processed successfully1",
#         },
#         {
#             "time": "2023-03-16 15:02:35",
#             "level": "ERROR",
#             "class": "com.example.app.MyClass",
#             "message": "Request processed successfully2NOT A JAVA LOG",
#         },
#         {
#             "time": "2023-03-16 15:02:35",
#             "level": "ERROR",
#             "class": "com.example.app.MyClass",
#             "message": "Request processed successfully3       BLA BLA",
#         },
#         {
#             "time": "2023-03-16 15:02:35",
#             "level": "INFO",
#             "class": "com.example.app.MyClass",
#             "message": "Request processed successfully4NOT A JAVA LOG 3",
#         },
#     ]


# def test_counter():
#     c = Counter()
#     assert c.value == 0

#     c.increment()
#     assert c.value == 1

#     c.decrement()
#     assert c.value == 0

#     c.set_value(100)
#     assert c.value == 100


# def test_counter_iter():
#     it = range(100)
#     c = Counter()

#     list(counter_iter(it, c))

#     assert c.value == 100
