# Apache HTTP server logs
Apache HTTP Server (httpd) is capable of writing [error and access log][apache-http-logs] files to a local directory. You can configure Centralized Logging with OpenSearch to ingest Apache HTTP server logs.

## Prerequisites
{%
include-markdown "include-prerequisites.md"
%}
## Step 1: Create an Apache HTTP server log config

1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the left sidebar, under **Resources**, choose **Log Config**.
3. Click the **Create a log config** button.
4. Specify **Config Name**.
5. Specify **Log Path**. You can use `, ` to separate multiple paths.
6. Choose **Apache HTTP server** in the log type dropdown menu.
7. In the **Apache Log Format** section, paste your Apache HTTP server log format configuration. It is in the format of `/etc/httpd/conf/httpd.conf` and starts with `LogFormat`.

    For example:
    ```
    LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined
    ```

8. (Optional) In the **Sample log parsing** section, paste a sample Apache HTTP server log to verify if the log parsing is successful.

    For example:
    ```
    127.0.0.1 - - [22/Dec/2021:06:48:57 +0000] "GET /xxx HTTP/1.1" 404 196 "-" "curl/7.79.1"
    ```

9. Choose **Create**.


## Step 2: Create an application log ingestion

{%
   include-markdown "create-log-ingestion.md"
   start="<!--ig-start-->"
   end="<!--eks-end-->"
%}

## Step 3: Check built-in Apache HTTP server dashboard in OpenSearch
For Apache HTTP server logs, Centralized Logging with OpenSearch will create a built-in sample dashboard.

1. Open OpenSearch dashboard in your browser.
2. Go to **Dashboard** section in the left sidebar.
3. Find the dashboard whose name starts with `<the application pipeline>`.

## View dashboard

The dashboard includes the following visualizations.

| Visualization Name  | Source Field                                                                                                                                                                                                                                                        | Description                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Total Request       |  log event                                                                                                                                                                                                                                       | Displays aggregated events within a specified time interval.                                                                                                                       |
| Status Codes        | status                                                                                                                                                                                                                                            | Displays the distribution of HTTP response codes served by the Apache web server over a selected time period.                                                                        |
| Access History      | log event                                                                                                                                                                                                                                   | Shows a historical log of all requests handled by the Apache web server, visualized using a bar chart. This allows administrators to analyze traffic volumes and patterns over time. |
| Unique Visitors      |  remote_addr                                                                                                                                                                                                  | Provides an estimation of the total number of users or devices accessing the Apache server for repeated visits from the same IP.                                                         |
| Status Code Metric  |  status                                                                                                                                                                                                             | Displays the distribution of HTTP response codes served by the Apache server over a period of time.                                                                                  |
| Top Access Paths    | request_uri                                                                                                                                                                                                  | Shows the most frequently requested URLs on the Apache server over a selected time period.                                                                                           |
| Top Client IPs      | <ul><li>response_size_bytes</li><li>remote_addr</li></ul>                                                                                                                                                                                                           | Displays the 10 source IP addresses generating the highest number of requests received by the Apache server during a selected time period.                                           |
| Bandwidth           | response_size_bytes                                                                                                                                                                                                                    | Tracks the volume of data transferred from the Apache server to clients over a selected time period.                                                                                 |
| Top Agents          | http_user_agent                                                                                                                                                                                           | Provides a snapshot of the visitor profile. The data guides decisions to better serve core audiences.                                                                                 |
| Http Methods        | request_method                                                                                                                                                                                           | Presents a pie chart that shows the distribution of request methods handled by the Apache server during a selected time period.                                                     |
| Top Access URIs     | request_uri                                                                                                                                                                                                    | Shows the most frequently hit URI paths handled by Apache during a selected period.                                                                                                  |
| Top Referers         |  http_referer                                                                                                                                                                                           | Referers are the URLs of pages that link to requests for the application. Tracking referers reveals the primary external sources of visits and engagement.                           |
| Bandwidth History   | response_size_bytes                                                                                                                                                                                   | Shows the historical trend of the data transfer activities by the Apache server to clients.                                                                                          |
| Apache Error Log    | <ul><li> status</li><li>request_uri</li><li>request_method</li><li>http_referer</li><li>response_size_bytes</li><li>http_user_agent</li><li>remote_addr</li></ul>                                                                                                   | Provides a detailed record of errors encountered by the web server.                                                                                                                  |
| Apache Log Examples | <ul><li> @timestamp</li><li>_index</li><li>http_user_agent</li><li>remote_addr</li><li> status</li><li>request_method</li><li>request_uri</li><li>response_size_bytes</li><li>request_protocol</li><li>file_name</li><li>http_referer</li><li>remote_user</li></ul> | A quick entry for interpreting Apache access and error logs.                                                                                                                         |


### Sample Dashboard

{%
include-markdown "../include-dashboard.md"
%}

[![apache]][apache]

[apache]: ../../images/dashboards/apache.png


[apache-http-logs]: https://httpd.apache.org/docs/2.4/logs.html



