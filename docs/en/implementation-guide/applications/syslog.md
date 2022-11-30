# Syslog
Syslog is used as a standard to produce, forward and collect logs produced on a Linux instance, routers or network equipments. You can configure Log Hub to ingest syslogs.

!!! important "Important"

    Please make sure your Syslog generator/sender's subnet is connected to Log Hub' **two** private subnets so that log can be ingested, you need to use VPC [Peering Connection][peering-connection] or [Transit Gateway][tgw] to connect these VPCs.

## Prerequisites
{%
include-markdown "include-prerequisites.md"
%}

## Step 1: Create a Syslog config

1. Sign in to the Log Hub Console.
2. In the left sidebar, under **Resources**, choose **Log Config**.
3. Click the **Create a log config** button.
4. Specify **Config Name**.
6. Here we choose **Syslog** in the log type dropdown menu for example. But Log Hub also support Syslog with [JSON](./json.md) format and [Single-Line test](./single-line-text.md) format, you can refer to the corresponding tutorial to create a log config.

### RFC5424
1. Paste a sample RFC5424 log. For example:

    ```log
    <35>1 2013-10-11T22:14:15Z client_machine su - - - 'su root' failed for joe on /dev/pts/2
    ```

2. Choose **Parse Log**.

3. Check if each fields type mapping is correct. You can change the type by selecting the dropdown menu in the second column. For all supported types, see [Data Types](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/).

    !!! Note "Note"
        You must specify the datetime of the log using key “time”. If not specified, system time will be added.

4. Specify the **Time format**. The format syntax follows [strptime](https://linux.die.net/man/3/strptime). Check [this](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds) for details. For example:

    ```log
    %Y-%m-%dT%H:%M:%SZ
    ```

5. (Optional) In the **Filter** section, you add some conditions to filter logs at the log agent side. The solution will ingest logs that match ALL the specified conditions only.

6. Select **Create**.

### RFC3164
1. Paste a sample RFC3164 log. For example:

    ```log
    <35>Oct 12 22:14:15 client_machine su: 'su root' failed for joe on /dev/pts/2
    ```

2. Choose **Parse Log**.

3. Check if each fields type mapping is correct. You can change the type by selecting the dropdown menu in the second column. For all supported types, see [Data Types](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/).

    !!! Note "Note"
        You must specify the datetime of the log using key “time”. If not specified, system time will be added.

        Since there is no year in the timestamp of RFC3164, it cannot be displayed as a time histogram in the discover interface of Amazon OpenSearch.

4. Specify the **Time format**. The format syntax follows [strptime](https://linux.die.net/man/3/strptime). Check [this](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds) for details. For example:

    ```log
    %b %m %H:%M:%S
    ```

5. (Optional) In the **Filter** section, you add some conditions to filter logs at the log agent side. The solution will ingest logs that match ALL the specified conditions only.

6. Select **Create**.

### Custom
1. In the **Syslog Format** section, paste your Syslog log format configuration. It is in the format of `/etc/rsyslog.conf` and starts with `template` or `$template`. The format syntax follows [Syslog Message Format](https://www.rfc-editor.org/rfc/rfc5424?spm=a2c4g.11186623.0.0.21324a0fUixMd5#:~:text=2009%0A%0A%0A6.-,Syslog%20Message%20Format,-The%20syslog%20message).  For example:

    ```
    <%pri%>1 %timestamp:::date-rfc3339% %HOSTNAME% %app-name% %procid% %msgid% %msg%\n
    ```

2. In the **Sample log parsing** section, paste a sample Nginx log to verify if the log parsing is successful. For example:
    ```
    <35>1 2013-10-11T22:14:15.003Z client_machine su - - 'su root' failed for joe on /dev/pts/2
    ```

3. Check if each fields type mapping is correct. Change the type by selecting the dropdown menu in the second column. For all supported types, see [Data Types](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/). 

    !!! Note "Note"

        You must specify the datetime of the log using key “time”. If not specified, system time will be added.

4. Specify the **Time format**. The format syntax follows [strptime](https://linux.die.net/man/3/strptime). Check [this](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds) for details.

5. (Optional) In the **Filter** section, you add some conditions to filter logs at the log agent side. The solution will ingest logs that match ALL the specified conditions only.

6. Select **Create**.

## Step 2: Create an application log ingestion

{%
   include-markdown "create-log-ingestion.md"
   start="<!--syslog-start-->"
   end="<!--syslog-end-->"
%}

## Step 3: Config the Syslog generator to send the log to Log Hub

1. Click on the Ingestion ID that has been created during the **Step 2**.
2. For [Rsyslog][rsyslog] user, follow the Syslog Configuration Guide to config the Rsyslog agent. You can also get the NLB DNS Name in this page.

## Step 4: View logs in OpenSearch

1. Open OpenSearch console in your browser.
2. Create an Index Pattern
    {%
    include-markdown "../aws-services/include-index-pattern.md"
    %}
3. Go to **Discover** section in the left sidebar.
4. Change active index pattern to `<the application pipeline>-*`.

[peering-connection]: https://docs.aws.amazon.com/vpc/latest/peering/working-with-vpc-peering.html
[tgw]: https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html
[rsyslog]: https://www.rsyslog.com/


