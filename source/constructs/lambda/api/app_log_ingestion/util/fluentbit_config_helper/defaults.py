from typing import List
from .fluentbit_config_helper import InputConfigSection, OutputConfigSection, ParserConfigSection, ServiceConfigSection


def default_parsers() -> List[ParserConfigSection]:
    return [
        ParserConfigSection(
            Name='syslog',
            Format='regex',
            Regex=
            r'^(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\/\.\-]*)(?:\[(?<pid>[0-9]+)\])?(?:[^\:]*\:)? *(?<message>.*)$',
            Time_Key='time',
            Time_Format=r'%b %d %H:%M:%S',
        ),
        ParserConfigSection(
            Name='syslog-rfc5424',
            Format='regex',
            Regex=
            r'^\<(?<pri>[0-9]{1,5})\>1 (?<time>[^ ]+) (?<host>[^ ]+) (?<ident>[^ ]+) (?<pid>[-0-9]+) (?<msgid>[^ ]+) (?<extradata>(\[(.*)\]|-)) (?<message>.+)$',
            Time_Key='time',
            Time_Format=r'%Y-%m-%dT%H:%M:%S.%L',
            Time_Keep='On',
        ),
        ParserConfigSection(
            Name='syslog-rfc3164-local',
            Format='regex',
            Regex=
            r'^\<(?<pri>[0-9]+)\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<ident>[a-zA-Z0-9_\/\.\-]*)(?:\[(?<pid>[0-9]+)\])?(?:[^\:]*\:)? *(?<message>.*)$',
            Time_Key='time',
            Time_Format=r'%b %d %H:%M:%S',
            Time_Keep='On',
        ),
    ]


def default_service() -> ServiceConfigSection:
    return ServiceConfigSection(
        flush=5,
        daemon='off',
        log_level='info',
        log_File='/tmp/log-agent.log',
        http_server='On',
        http_listen='0.0.0.0',
        http_port='2022',
    ).set('storage.path', '/opt/fluent-bit/flb-storage/')


def default_tail_input() -> InputConfigSection:
    return InputConfigSection(
        Name='tail',
        Path_Key='file_name',
        Read_from_head='false',
        Mem_Buf_Limit='30M',
        Buffer_Chunk_Size='512k',
        Buffer_Max_Size='5M',
        Skip_Long_Lines='On',
        Skip_Empty_Lines='On',
        Refresh_Interval='10',
        Rotate_Wait='30',
    ) \
        .set('storage.type', 'filesystem') \
        .set('DB', '/tmp/db-checkpoint') \
        .set('DB.locking', 'true') \
        .set('DB.Sync', 'Normal')


def default_syslog_input() -> InputConfigSection:
    return InputConfigSection(Name='syslog',
                              Mode='tcp',
                              Listen='0.0.0.0',
                              Port='10092')


def default_kinesis_output() -> OutputConfigSection:
    return OutputConfigSection(
        Name='kinesis_streams',
        Retry_Limit='False',
        Auto_retry_requests='True',
    )


def default_s3_output() -> OutputConfigSection:
    return OutputConfigSection(
        Name='s3',
        use_put_object='On',  #Here must be 'On' rather than 'True'
        json_date_key='time',
        json_date_format='iso8601',
        Retry_Limit='False',
    ).set('tls.verify', 'False')


def default_msk_output() -> OutputConfigSection:
    return OutputConfigSection(Name='kafka', )


def default_aos_output() -> OutputConfigSection:
    return OutputConfigSection(
        Name='opensearch',
        Port='443',
        Retry_Limit='False',
        AWS_Auth='On',
        TLS='On',
        Suppress_Type_Name='On',
        Buffer_Size='20M',
        Generate_ID='On',
        Logstash_Format='Off',
        Time_Key_Nanos='Off',
        Write_Operation='create',
        Workers='1',
    )