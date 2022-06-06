# Nginx
Nginx is capable of writing [error and access log][nginx-logs] files to a local directory. You can configure Log Hub to ingest Nginx logs.

## Prerequisites
{%
include-markdown "include-prerequisites.md"
%}
## Step 1: Create a Nginx log config

1. Sign in to the Log Hub Console.
2. In the left sidebar, under **Resources**, choose **Log Config**.
3. Click the **Create a log config** button.
4. Specify **Config Name**.
5. Specify **Log Path**. You can use `, ` to separate multiple paths.
6. Choose **Nginx** in the log type dropdown menu.
7. In the **Nginx Log Format** section, paste your Nginx log format configuration It is in the format of `/etc/nginx/nginx.conf` and starts with `log_format`.

    For example:
       ```
       log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
       '$status $body_bytes_sent "$http_referer" '
       '"$http_user_agent" "$http_x_forwarded_for"';
       ```

8. (Optional) In the **Sample log parsing** section, paste a sample Nginx log to verify if the log parsing is successful.

    For example:
       ```
       127.0.0.1 - - [24/Dec/2021:01:27:11 +0000] "GET / HTTP/1.1" 200 3520 "-" "curl/7.79.1" "-"
       ```

9. Choose **Create**.

## Step 2: Create an application log ingestion

{%
   include-markdown "create-log-ingestion.md"
   start="<!--ig-start-->"
   end="<!--eks-end-->"
%}

## Step 3: Check built-in Nginx dashboard in OpenSearch

For Nginx logs, Log Hub creates a built-in sample dashboard.

1. Open OpenSearch dashboard in your browser.
2. Go to **Dashboard** section in the left sidebar.
3. Find the dashboard which name starts with `<the application pipeline>`.

## Sample Dashboard

[![nginx-1]][nginx-1]
[![nginx-2]][nginx-2]


[nginx-1]: ../../images/dashboards/nginx-1.png
[nginx-2]: ../../images/dashboards/nginx-2.png


[nginx-logs]: https://docs.nginx.com/nginx/admin-guide/monitoring/logging/