# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


from ..util.fluentbit_config_helper.fluentbit_config_helper import (
    ConfigSection,
    FilterConfigSection,
    FluentBitConfigHelper,
    InputConfigSection,
    OutputConfigSection,
    ParserConfigSection,
)
from ..util.fluentbit_config_helper.defaults import (
    default_kinesis_output,
    default_parsers,
    default_service,
    default_tail_input,
)


def indent(s: str, leading: str = "") -> str:
    return "\n".join(map(lambda line: leading + line, s.split("\n")))


def test_ec2_fluentbit_config():
    f = FluentBitConfigHelper()
    f.set_service(default_service())

    p = ParserConfigSection(
        Name="json-123",
        Format="json",
        Time_Key="time",
        Time_Format="%Y-%m-%dT%H:%M:%S.%L",
    )
    f.add_parser(*default_parsers(), p)

    cin = default_tail_input()
    cin.set("Path", "/var/log/json/*.log")
    cin.set("Parser", "json")
    f.add_input(cin)

    cout = default_kinesis_output()
    cout.set("Stream", "kds-stream-name")
    cout.set("Region", "us-west-2")

    f.add_output(cout)

    f.add_filter(
        FilterConfigSection(
            Name="lua",
            Match="*",
            time_as_table="on",
            script="uniform-time-format.lua",
            call="cb_print",
        )
    )
    f.set_config(
        "uniform-time-format.lua",
        """\
function cb_print(tag, timestamp, record)
    -- inject time field in utc time zone in iso8601 format with millisecond
    -- http://www.lua.org/manual/5.2/manual.html#pdf-os.date
    record['$TIME_KEY'] = os.date('!%Y-%m-%dT%H:%M:%S.', timestamp['sec']) .. string.sub(string.format('%06d', timestamp['nsec']), 1, 6) .. 'Z'
    return 2, timestamp, record
end""",
    )

    for filename, content in f.get_configs().items():
        print("===== FILENAME: %s ======" % filename)
        print(content)

        fwrite(filename, content)

    conf = f.get_configs()
    template = f"""\
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: $LOGHUB_NAMESPACE
  labels:
    k8s-app: fluent-bit
data:
  # Configuration files: server, input, filters and output
  # ======================================================
  uniform-time-format.lua: |
{indent(conf['uniform-time-format.lua'], leading='    ')} 
  fluent-bit.conf: |
{indent(conf['fluent-bit.conf'], leading='    ')}

  applog_parsers.conf: |
{indent(conf['applog_parsers.conf'], leading='    ')}
"""
    print()
    print()
    print()
    print("======= k8s configmap ========")
    print(template)


def test_ConfigSection():
    c = ConfigSection("SERVICE")
    c.set("name", "tail").set("tag", "tag").set("tag1", "").set("tag2", "tag2").unset(
        "tag2"
    )

    assert (
        str(c)
        == """\
[SERVICE]
    name    tail
    tag     tag"""
    )


def test_ConfigSection_from_constructor():
    c = ConfigSection(
        "SERVICE",
        name="tail",
        tag="tag",
    )

    assert (
        str(c)
        == """\
[SERVICE]
    name    tail
    tag     tag"""
    )


def test_FluentBit_input_output():
    cin = InputConfigSection()
    cin.set("name", "tail")

    cout = OutputConfigSection()
    cout.set("name", "stdout")

    f = FluentBitConfigHelper()
    f.add_input(cin)
    f.add_output(cout)
    f.add_parser(*default_parsers())

    assert (
        f.fluent_bit_config()
        == """\
[SERVICE]

[INPUT]
    name    tail

[OUTPUT]
    name    stdout

"""
    )


def test_FluentBit_parsers():
    f = FluentBitConfigHelper()
    f.set_service(default_service())
    f.add_parser(*default_parsers())

    assert (
        f.parsers_config()
        == """\
[PARSER]
    Name           syslog
    Format         regex
    Regex          ^(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\/\.\-]*)(?:\[(?<pid>[0-9]+)\])?(?:[^\:]*\:)? *(?<message>.*)$
    Time_Key       time
    Time_Format    %b %d %H:%M:%S
[PARSER]
    Name           syslog-rfc5424
    Format         regex
    Regex          ^\<(?<pri>[0-9]{1,5})\>1 (?<time>[^ ]+) (?<host>[^ ]+) (?<ident>[^ ]+) (?<pid>[-0-9]+) (?<msgid>[^ ]+) (?<extradata>(\[(.*)\]|-)) (?<message>.+)$
    Time_Key       time
    Time_Format    %Y-%m-%dT%H:%M:%S.%L
    Time_Keep      On
[PARSER]
    Name           syslog-rfc3164-local
    Format         regex
    Regex          ^\<(?<pri>[0-9]+)\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<ident>[a-zA-Z0-9_\/\.\-]*)(?:\[(?<pid>[0-9]+)\])?(?:[^\:]*\:)? *(?<message>.*)$
    Time_Key       time
    Time_Format    %b %d %H:%M:%S
    Time_Keep      On"""
    )

    assert (
        f.fluent_bit_config()
        == """\
[SERVICE]
    flush           5
    daemon          off
    log_level       info
    log_File        /tmp/log-agent.log
    http_server     On
    http_listen     0.0.0.0
    http_port       2022
    storage.path    /opt/fluent-bit/flb-storage/

"""
    )


def test_FluentBit_set_config():
    f = FluentBitConfigHelper()
    f.set_config("test.lua", "test.lua script")

    assert f.get_configs()["test.lua"] == "test.lua script"


def fwrite(filename, content):
    # write content to filename
    pass
