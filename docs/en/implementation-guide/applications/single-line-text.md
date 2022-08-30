# Single-line Text
Log Hub uses custom Ruby Regular Expression to parse logs. It supports both single-line log format and multiple input format.

You can configure Log Hub to ingest single-line text logs.

## Prerequisites
{%
include-markdown "include-prerequisites.md"
%}

## Step 1: Create a Single-line text config

1. Sign in to the Log Hub Console.
2. In the left sidebar, under **Resources**, choose **Log Config**.
3. Click the **Create a log config** button.
4. Specify **Config Name**.
5. Specify **Log Path**. You can use `,` to separate multiple paths.
6. Choose **Single-line Text** in the log type dropdown menu.
7. Write the regular expression in [Rubular](https://rubular.com/) to validate first and enter the value. For example:

    ```
    (?<remote_addr>\S+)\s*-\s*(?<remote_user>\S+)\s*\[(?<time_local>\d+/\S+/\d+:\d+:\d+:\d+)\s+\S+\]\s*"(?<request_method>\S+)\s+(?<request_uri>\S+)\s+\S+"\s*(?<status>\S+)\s*(?<body_bytes_sent>\S+)\s*"(?<http_referer>[^"]*)"\s*"(?<http_user_agent>[^"]*)"\s*"(?<http_x_forwarded_for>[^"]*)".*
    ```
   
8. In the **Sample log parsing** section, paste a sample Single-line text log and click **Parse log** to verify if the log parsing is successful. For example:
   
    ```
    127.0.0.1 - - [24/Dec/2021:01:27:11 +0000] "GET / HTTP/1.1" 200 3520 "-" "curl/7.79.1" "-"
    ```

9. Check if each fields type mapping is correct. Change the type by selecting the dropdown menu in the second column. For all supported types, see [Data Types](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/). 

    !!! Note "Note"

        You must specify the datetime of the log using key “time”. If not specified, system time will be added.

10. Specify the **Time format**. The format syntax follows [strptime](https://linux.die.net/man/3/strptime). Check [this](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds) for details.
11. Choose **Create**.

## Step 2: Create an application log ingestion

{%
   include-markdown "create-log-ingestion.md"
%}

## Step 3: View logs in OpenSearch

1. Open OpenSearch console in your browser.
2. Create an Index Pattern
    {%
    include-markdown "../aws-services/include-index-pattern.md"
    %}
3. Go to **Discover** section in the left sidebar.
4. Change active index pattern to `<the application pipeline>-*`.





