# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import logging

from util.exception import APIException
from util.fluentbit_config_helper.ddb_connect import DDBConnect, SyslogDDBConnect

from util.fluentbit_config_helper.defaults import default_kinesis_output, default_parsers, default_service, \
    default_syslog_input, default_s3_output, default_msk_output, default_aos_output
from util.fluentbit_config_helper.fluentbit_config_helper import FilterConfigSection, ParserConfigSection, FluentBitConfigHelper
from util.distribute_config_helper.distribute_config_helper import DistributeConfigHelper

logger = logging.getLogger()
logger.setLevel(logging.INFO)

class FLBConfigMgr:
    def __init__(self, ddb_connect: DDBConnect) -> None:
        self.ddb_connect = ddb_connect
        self.flb_helper = FluentBitConfigHelper()
        self.pipe_info_list = self.ddb_connect.get_pipe_info_list()

    def set_service(self):
        self.flb_helper.set_service(default_service())

    def set_input(self, tag: str, source_info: dict):
        pass

    def set_parser(self, tag: str, config_info: dict):
        p = ParserConfigSection(
            Name='parser_' + tag,
            Format=config_info.get("parser_format"),
            Regex=config_info.get("regular_expression"),
            Time_Key=config_info.get("time_key"),
            Time_Format=config_info.get("time_format"),
            Time_Keep='On',
            Time_offset=config_info.get("time_offset"),
        )
        self.flb_helper.add_parser(*default_parsers(), p)

    def set_filter(self, tag: str, config_info: dict):
        # Set the grep filter
        if (config_info.get("processorFilterRegex", {"enable": False}).get("enable") is True):
            for filter in config_info.get("processorFilterRegex").get("filters"):
                filter_condition = ("Regex" if filter["condition"] == "Include" else "Exclude")
                filter_key_value = filter["key"] + ' ' + filter["value"]
                f = FilterConfigSection(
                    Name="grep",
                    Match=tag,
                )
                f.set(filter_condition, filter_key_value)
                self.flb_helper.add_filter(f)

    def set_output(self, tag: str, output_info: dict):
        if output_info.get('buffer_type') == "KDS":
            return self._set_output_kds(tag, output_info)
        elif output_info.get('buffer_type') == "S3":
            return self._set_output_s3(tag, output_info)
        elif output_info.get('buffer_type') == "MSK":
            return self._set_output_msk(tag, output_info)
        else:
            return self._set_output_aos(tag, output_info)

    def set_lua_filter(self, tag: str, config_info: dict, output_info: dict):
        # Only add lua script to generate timestamp for KDS buffer
        if output_info.get('buffer_type') != "KDS":
            return

        self.flb_helper.add_filter(FilterConfigSection(
            Name='lua',
            Match=tag,
            time_as_table='on',
            script='uniform-time-format.lua',
            call='cb_print'
        ))

        # we need to compare the time_key with None because front-end will pass None to backend
        # can not just use get("time_key", "time") here
        time_key = "time" if config_info.get("time_key") is None else config_info.get("time_key")

        lua_script = f'''\
function cb_print(tag, timestamp, record)
    -- inject time field in utc time zone in iso8601 format with millisecond
    -- http://www.lua.org/manual/5.2/manual.html#pdf-os.date
    record['{time_key}'] = os.date('!%Y-%m-%dT%H:%M:%S.', timestamp['sec']) .. string.sub(string.format('%06d', timestamp['nsec']), 1, 6) .. 'Z'
    return 2, timestamp, record
end'''
        self.flb_helper.set_config('uniform-time-format.lua', lua_script)

    def generate_agent_config(self):
        """
        Merge service, [{input, parser(include filter), output},...] together
        :return:
        """
        pass

    def get_agent_configs(self) -> dict[str, str]:
        """
        This function will return the agent config files
        :return:
        """
        for file_name, content in self.flb_helper.get_configs().items():
            logger.info('===== FILENAME: %s ======' % file_name)
            logger.info(content)

        return self.flb_helper.get_configs()

    def generate_tag(self, source_id: str, config_id: str, app_pipeline_id: str):
        return source_id.ljust(5, '0')[0: 5] + '-' +\
               config_id.ljust(5, '0')[0: 5] + '-' +\
               app_pipeline_id.ljust(5, '0')[0: 5]

    def _set_output_kds(self, tag: str, output_info: dict):
        cout = default_kinesis_output()
        cout.set('Match', tag)
        cout.set('Stream', output_info.get("buffer_resource_name"))
        cout.set('Region', output_info.get("buffer_region"))
        cout.set('Role_arn', output_info.get("buffer_access_role_arn"))
        self.flb_helper.add_output(cout)

    def _set_output_s3(self, tag: str, output_info: dict):
        cout = default_s3_output()
        cout.set('Match', tag)
        cout.set('bucket', output_info.get("buffer_resource_name"))
        cout.set('region', output_info.get("buffer_region"))
        cout.set('total_file_size', output_info.get("max_file_size", '100') + 'M')
        cout.set('upload_timeout', output_info.get("upload_timeout") + 's')
        suffix = '.gz' if output_info.get("compression_type").lower() == 'gzip' else ''
        cout.set('s3_key_format', os.path.join('/', output_info.get("log_bucket_prefix"), f'%H-%M-%S-$UUID{suffix}'))
        # Fluent bit S3 output only supports compression = gzip or '', note: Gzip will crash the fluent-bit process, must use lower() to parse
        cout.set('compression', '' if output_info.get("compression_type") == "None" else output_info.get("compression_type").lower())
        cout.set('Role_arn', output_info.get("buffer_access_role_arn"))
        self.flb_helper.add_output(cout)

    def _set_output_msk(self, tag: str, output_info: dict):
        cout = default_msk_output()
        cout.set('Match', tag)
        # TODO
        self.flb_helper.add_output(cout)

    def _set_output_aos(self, tag: str, output_info: dict):
        cout = default_aos_output()
        cout.set('Match', tag)
        cout.set('AWS_Region', output_info.get("buffer_region"))
        cout.set('Host', output_info.get("opensearch_endpoint"))
        cout.set('Logstash_Prefix', output_info.get("index_prefix"))
        cout.set('Time_Key', output_info.get("time_key"))
        cout.set('AWS_Role_ARN', output_info.get("buffer_access_role_arn"))
        self.flb_helper.add_output(cout)


class SyslogFLBConfigMgr(FLBConfigMgr):
    def set_service(self):
        csvc = default_service()
        csvc.set('Parsers_File', '/fluent-bit/etc/applog_parsers.conf')
        csvc.set('storage.path', '/fluent-bit/flb-storage/')
        self.flb_helper.set_service(csvc)

    def set_input(self, tag: str, source_info: dict):
        cin = default_syslog_input()
        cin.set('Tag', tag)
        cin.set('Mode', source_info.get("protocol_type"))
        cin.set('Port', source_info.get("port"))
        cin.set('Parser', 'parser_' + tag)
        cin.set('Mem_Buf_Limit', '30M')
        self.flb_helper.add_input(cin)

    def generate_agent_config(self):
        self.set_service()

        for pipe_info in self.pipe_info_list:
            tag = self.generate_tag(
                pipe_info.source_info.get("source_id"),
                pipe_info.config_info.get("config_id"),
                pipe_info.output_info.get("app_pipeline_id"),
            )
            self.set_input(tag, pipe_info.source_info)
            self.set_parser(tag, pipe_info.config_info)
            self.set_filter(tag, pipe_info.config_info)
            self.set_output(tag, pipe_info.output_info)

            self.set_lua_filter(tag, pipe_info.config_info, pipe_info.output_info)

    def get_port(self):
        """
        This function will return the nlb port of the source
        """
        if len(self.pipe_info_list) == 0:
            raise APIException('Pipe info is empty! Please check the ddb connect data.')
        return self.pipe_info_list[0].source_info.get("port")