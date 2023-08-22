# Nginx
Nginx is capable of writing [error and access log][nginx-logs] files to a local directory. You can configure Centralized Logging with OpenSearch to ingest Nginx logs.

## Prerequisites
{%
include-markdown "include-prerequisites.md"
%}
## Step 1: Create a Nginx log config

1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the left sidebar, under **Resources**, choose **Log Config**.
3. Click the **Create a log config** button.
4. Specify **Config Name**.
5. Specify **Log Path**. You can use `, ` to separate multiple paths.
6. Choose **Nginx** in the log type dropdown menu.
7. In the **Nginx Log Format** section, paste your Nginx log format configuration. It is in the format of `/etc/nginx/nginx.conf` and starts with `log_format`.

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

9. (Optional) In the **Filter** section, you add some conditions to filter logs at the log agent side. The solution will ingest logs that match ALL the specified conditions only. 

10. Select **Create**.

## Step 2: Create an application log ingestion

{%
   include-markdown "create-log-ingestion.md"
   start="<!--ig-start-->"
   end="<!--eks-end-->"
%}

## Step 3: Check built-in Nginx dashboard in OpenSearch

For Nginx logs, Centralized Logging with OpenSearch creates a built-in sample dashboard.

1. Open OpenSearch dashboard in your browser.
2. Go to **Dashboard** section in the left sidebar.
3. Find the dashboard whose name starts with `<the application pipeline>`.

## View dashboard

The dashboard includes the following visualizations.

| Visualization Name | Source Field                                                                                                                                                                                   | Description                                                                                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Total Requests     | <ul><li> log event </li></ul>                                                                                                                                                                  | Displays aggregated events based on a specified time interval.                                                                                                                  |
| Http Method        | <ul><li> request_method </li></ul>                                                                                                                                                             | Presents a pipe chart that shows the distribution of request methods handled by Nginx during a selected time period.                                                            |
| Request History    | <ul><li> log event</li></ul>                                                                                                                                                                   | Shows a historical log of all requests handled by Nginx, visualized using a bar chart. This allows administrators to analyze traffic volumes and patterns over time.            |
| Unique Visitors     | <ul><li> remote_addr</li></ul>                                                                                                                                                                 | Shows the number of distinct IP addresses that have made requests to the application over a given time period.                                                                  |
| Bandwidth          | <ul><li> body_bytes_sent</li></ul>                                                                                                                                                             | The bandwidth metric tracks the total amount of data transferred to clients by the Nginx server over time.                                                                      |
| Status Code Metric | <ul><li> status</li></ul>                                                                                                                                                                      | Displays the distribution of HTTP response codes served by the Nginx server over a period of time.                                                                              |
| Status Code        | <ul><li>status</li></ul>                                                                                                                                                                       | The proportion of each status code relative to the total number of responses is also displayed as a percentage. This allows easy identification of the dominant response types. |
| Bandwidth History  | <ul><li> body_bytes_sent</li></ul>                                                                                                                                                             | Shows the historical trend of the data transfer activities by the Nginx server to clients.                                                                                      |
| Top IPs            | <ul><li>body_bytes_sent</li><li>remote_addr</li></ul>                                                                                                                                          | Displays the 10 client IP addresses generating the most requests to the application during a specified time period.                                                             |
| Top Referers        | <ul><li> http_referer</li></ul>                                                                                                                                                                | Referers are the URLs of pages that link to requests for the application. Tracking referers reveal the primary external sources of visits and engagement.                      |
| Top User Agents    | <ul><li> http_user_agent</li></ul>                                                                                                                                                             | Shows the breakdown of client browser and device types generating traffic.                                                                                                      |
| Top Access URL     | <ul><li> remote</li><li> method </li></ul>                                                                                                                                                     | Shows the most frequently requested URLs on the application during a specified time period.                                                                                     |
| Nginx Error Log    | <ul><li> @timestamp</li><li> status </li><li> remote_addr </li><li> request_uri </li><li> request_method </li><li> http_referer </li><li> body_bytes_sent </li><li> http_user_agent </li></ul> | Provides a detailed record of errors encountered by the web server.                                                                                                             |

### Sample Dashboard

{%
include-markdown "../include-dashboard.md"
%}

[![nginx-1]][nginx-1]

[nginx-1]: ../../images/dashboards/nginx-1.png

[![nginx-2]][nginx-2]

[nginx-2]: ../../images/dashboards/nginx-2.png


[nginx-logs]: https://docs.nginx.com/nginx/admin-guide/monitoring/logging/