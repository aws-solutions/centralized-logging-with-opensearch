# Apache HTTP server logs
Apache HTTP Server (httpd) is capable of writing [error and access log][apache-http-logs] files to a local directory. You can configure Log Hub to ingest Apache HTTP server logs.

## Prerequisites
{%
include-markdown "include-prerequisites.md"
%}
## Step 1: Create an Apache HTTP server log config

1. Sign in to the Log Hub Console.
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
For Apache HTTP server logs, Log Hub will create a built-in sample dashboard.

1. Open OpenSearch dashboard in your browser.
2. Go to **Dashboard** section in the left sidebar.
3. Find the dashboard whose name starts with `<the application pipeline>`.

## Sample Dashboard

[![nginx-1]][nginx-1]
[![nginx-2]][nginx-2]


[nginx-1]: ../../images/dashboards/nginx-1.png
[nginx-2]: ../../images/dashboards/nginx-2.png


[apache-http-logs]: https://httpd.apache.org/docs/2.4/logs.html



