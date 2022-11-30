# JSON format logs

You can configure Log Hub to ingest JSON logs.

## Prerequisites
{%
include-markdown "include-prerequisites.md"
%}

## Step 1: Create a JSON config

1. Sign in to the Log Hub Console.
2. In the left sidebar, under **Resources**, choose **Log Config**.
3. Click the **Create a log config** button.
4. Specify **Config Name**.
5. Specify **Log Path**. You can use `,` to separate multiple paths.
6. Choose **JSON** in the log type dropdown list.
7. In the **Sample log parsing** section, paste a sample JSON log and click **Parse log** to verify if the log parsing is successful.

    For example:
    ```json
    {"host":"81.95.250.9", "user-identifier":"-", "time":"08/Mar/2022:06:28:03 +0000", "method": "PATCH", "request": "/clicks-and-mortar/24%2f7", "protocol":"HTTP/2.0", "status":502, "bytes":24337, "referer": "http://www.investorturn-key.net/functionalities/innovative/integrated"}
    ```
   
8. Check if each fields type mapping is correct. You can change the type by selecting the dropdown menu in the second column. For all supported types, see [Data Types](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/).

    !!! Note "Note"

        You must specify the datetime of the log using key “time”. If not specified, system time will be added.

9. Specify the **Time format**. The format syntax follows [strptime](https://linux.die.net/man/3/strptime). Check [this](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds) for details.

10. (Optional) In the **Filter** section, you add some conditions to filter logs at the log agent side. The solution will ingest logs that match ALL the specified conditions only.

11. Select **Create**.

## Step 2: Create an application log ingestion

The steps are similar to creating an application log ingestion for single-line text. Refer to [Single-line Text](./single-line-text.md) for details.

## Step 3: View your logs in OpenSearch

1. Open OpenSearch dashboard in your browser.
2. Create an Index Pattern
    {%
    include-markdown "../aws-services/include-index-pattern.md"
    %}
3. Go to **Discover** section in the left sidebar.
4. Change active index pattern to `<Index name>-*`.





