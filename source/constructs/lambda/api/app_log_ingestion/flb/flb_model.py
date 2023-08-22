# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from commonlib.model import LogSourceTypeEnum


class FluentBitDataPipeline(object):
    def __init__(
        self,
        env: LogSourceTypeEnum.EC2,
        log_type: str,
        tag: str,
        region_name: str,
        role_arn: str,
        input_name: str,
        output_name: str,
        ingestion_id: str,
        time_key: str = "time",
        mem_buf_limit="30M",
    ):
        self._env = env
        self._log_type = log_type
        self._tag = tag
        self._region_name = region_name
        self._role_arn = role_arn
        self._input_name = input_name
        self._output_name = output_name
        self._ingestion_id = ingestion_id
        self._time_key = time_key
        self._mem_buf_limit = mem_buf_limit

    @property
    def env(self):
        return self._env

    @env.setter
    def env(self, env: str):
        self._env = env

    @property
    def log_type(self):
        return self._log_type

    @log_type.setter
    def log_type(self, log_type: str):
        self._log_type = log_type

    @property
    def tag(self):
        return self._tag

    @tag.setter
    def tag(self, tag: str):
        self._tag = tag

    @property
    def region_name(self):
        return self._region_name

    @region_name.setter
    def region_name(self, region_name: str):
        self._region_name = region_name

    @property
    def role_arn(self):
        return self._role_arn

    @role_arn.setter
    def role_arn(self, role_arn):
        self._role_arn = role_arn

    @property
    def ingestion_id(self):
        return self._ingestion_id

    @ingestion_id.setter
    def ingestion_id(self, ingestion_id):
        self._ingestion_id = ingestion_id

    @property
    def input_name(self):
        return self._input_name

    @input_name.setter
    def input_name(self, input_name):
        self._input_name = input_name

    @property
    def output_name(self):
        return self._output_name

    @output_name.setter
    def output_name(self, output_name):
        self._output_name = output_name

    @property
    def time_key(self):
        return self._time_key

    @time_key.setter
    def time_key(self, time_key):
        self._time_key = time_key

    @property
    def grep_filters(self):
        return self._grep_filters

    @grep_filters.setter
    def grep_filters(self, grep_filters):
        self._grep_filters = grep_filters

    @property
    def multiline_filter(self):
        return self._multiline_filter

    @multiline_filter.setter
    def multiline_filter(self, multiline_filter):
        self._multiline_filter = multiline_filter

    @property
    def multiline_parser(self):
        return self._multiline_parser

    @multiline_parser.setter
    def multiline_parser(self, multiline_parser):
        self._multiline_parser = multiline_parser

    @property
    def parser_filter(self):
        return self._parser_filter

    @parser_filter.setter
    def parser_filter(self, parser_filter):
        self._parser_filter = parser_filter

    @property
    def parser(self):
        return self._parser

    @parser.setter
    def parser(self, parser):
        self._parser = parser

    @property
    def duplicated_parser(self):
        return self._duplicated_parser

    @duplicated_parser.setter
    def duplicated_parser(self, duplicated_parser):
        self._duplicated_parser = duplicated_parser

    @property
    def tail(self):
        return self._tail

    @tail.setter
    def tail(self, tail: str):
        self._tail = tail

    @property
    def syslog(self):
        return self._syslog

    @syslog.setter
    def syslog(self, syslog: str):
        self._syslog = syslog

    @property
    def kds(self):
        return self._kds

    @kds.setter
    def kds(self, kds):
        self._kds = kds

    @property
    def s3(self):
        return self._s3

    @s3.setter
    def s3(self, s3):
        self._s3 = s3

    @property
    def msk(self):
        return self._msk

    @msk.setter
    def msk(self, msk):
        self._msk = msk

    @property
    def aos(self):
        return self._aos

    @aos.setter
    def aos(self, aos):
        self._aos = aos

    @property
    def mem_buf_limit(self):
        return self._mem_buf_limit

    @mem_buf_limit.setter
    def mem_buf_limit(self, mem_buf_limit: str):
        self._mem_buf_limit = mem_buf_limit
