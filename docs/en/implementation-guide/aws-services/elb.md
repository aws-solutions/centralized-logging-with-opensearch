# Application Load Balancing (ALB) Logs
[ALB Access logs](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html) provide access logs that capture detailed information about requests sent to your load balancer. ALB publishes a log file for each load
balancer node every 5 minutes.

## Create log ingestion
You can create a log ingestion into Amazon OpenSearch Service either by using the Centralized Logging with OpenSearch console or by deploying a standalone CloudFormation stack.

!!! important "Important"

    - The ELB logging bucket must be the same as the Centralized Logging with OpenSearch solution.
    - The Amazon OpenSearch Service index is rotated on a daily basis by default, and you can adjust the index in the Additional Settings.
### Using the Centralized Logging with OpenSearch Console

1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose the **Create a log ingestion** button.
4. In the **AWS Services** section, choose **Elastic Load Balancer**.
5. Choose **Next**.
6. Under **Specify settings**, choose **Automatic** or **Manual**.
    - For **Automatic** mode, choose an application load balancer in the dropdown list. (If the selected ALB access log is not enabled, click **Enable** to enable the ALB access log.)
    - For **Manual** mode, enter the **Application Load Balancer identifier** and **Log location**.
    - (Optional) If you are ingesting logs from another account, select a [linked account](../link-account/index.md) from the **Account** dropdown first.
7. Choose **Next**.
8. In the **Specify OpenSearch domain** section, select an imported domain for **Amazon OpenSearch domain**.
9. Choose **Yes** for **Sample dashboard** if you want to ingest an associated templated Amazon OpenSearch Service dashboard.
10. You can change the **Index Prefix** of the target Amazon OpenSearch Service index if needed. The default prefix is the `Load Balancer Name`.
11. In the **Log Lifecycle** section, input the number of days to manage the Amazon OpenSearch Service index lifecycle. The Centralized Logging with OpenSearch will create the associated [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) policy automatically for this pipeline.
12. Choose **Next**.
13. Add tags if needed.
14. Choose **Create**.

### Using the CloudFormation Stack
This automated AWS CloudFormation template deploys the *Centralized Logging with OpenSearch - ELB Log Ingestion* solution in the AWS Cloud.

|                      | Launch in AWS Console                                        | Download Template                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS Regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/ELBLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/ELBLog.template) |
| AWS China Regions    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/ELBLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/ELBLog.template) |

{%
include-markdown "include-cfn-plugins-common.md"
%}

## View dashboard

The dashboard includes the following visualizations.

| Visualization Name               | Source Field                                                                                                                                                                                                                                                     | Description                                                                                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Total Requests                   | <ul><li> log event </li></ul>                                                                                                                                                                                                                                    | Displays aggregated events based on a specified time interval.                                                                                            |
| Request History                  | <ul><li> log event </li></ul>                                                                                                                                                                                                                                    | Presents a bar chart that displays the distribution of events over time.                                                                                  |
| Request By Target                | <ul><li> log event</li><li>target_ip </li></ul>                                                                                                                                                                                                                  | Presents a bar chart that displays the distribution of events over time and IP.                                                                           |
| Unique Visitors                   | <ul><li> client_ip </li></ul>                                                                                                                                                                                                                                    | Displays unique visitors identified by client IP address.                                                                                                 |
| Status Code                      | <ul><li>elb_status_code</li></ul>                                                                                                                                                                                                                                | Displays the count of requests made to the ALB, grouped by HTTP status codes (e.g., 200, 404, 403, etc.).                          |
| Status History                   | <ul><li>elb_status_code </li></ul>                                                                                                                                                                                                                               | Shows the historical trend of HTTP status codes returned by the ALB over a specific period of time.                                                       |
| Status Code Pipe                 | <ul><li>elb_status_code</li></ul>                                                                                                                                                                                                                                | Represents the distribution of requests based on different HTTP status codes using a pie chart.                                                           |
| Average Processing Time          | <ul><li>request_processing_time</li><li>response_processing_time</li><li>target_processing_time</li></ul>                                                                                                                                                        | This visualization calculates and presents the average time taken for various operations in the ALB.                                                      |
| Avg. Processing Time History     | <ul><li>request_processing_time</li><li>response_processing_time</li><li>target_processing_time</li></ul>                                                                                                                                                        | Displays the historical trend of the average time-consuming of each operation returned by the ALB within a specific period of time.                       |
| Request Verb                     | <ul><li> request_verb</li></ul>                                                                                                                                                                                                                                  | Displays the count of requests made to the ALB using a pie chart, grouped by http request method names (e.g., POST, GET, HEAD, etc.). |
| Total Bytes                      | <ul><li>received_bytes</li><li>sent_bytes</li></ul>                                                                                                                                                                                                              | Provides insights into data transfer activities, including the total bytes transferred.                                                                   |
| Sent and Received Bytes History  | <ul><li>received_bytes</li><li>sent_bytes</li></ul>                                                                                                                                                                                                              | Displays the historical trend of the the received bytes, send bytes                                                                                       |
| SSL Protocol                     | <ul><li> ssl_protocol</li></ul>                                                                                                                                                                                                                                  | Displays the count of requests made to the ALB, grouped by SSL Protocol                                                                                   |
| Top Request URLs                 | <ul><li> request_url</li></ul>                                                                                                                                                                                                                                   | The web requests view enables you to analyze the top web requests.                                                                                        |
| Top Client IPs                   | <ul><li>client_ip</li></ul>                                                                                                                                                                                                                                      | Provides the top 10 IP address accessing your ALB.                                                                                                        |
| Top User Agents                  | <ul><li> user_agent</li></ul>                                                                                                                                                                                                                                    | Provides the top 10 user agents accessing your ALB.                                                                                                       |
| Target Status                    | <ul><li> target_ip</li><li>target_status_code</li></ul>                                                                                                                                                                                                          | Displays the http status code request count for targets in ALB target group.                                                                              |
| Abnormal Requests                | <ul><li> @timestamp</li><li> client_ip</li><li> target_ip</li><li> elb_status_code</li><li> error_reason</li><li>request_verb</li><li>target_status_code</li><li>target_status_code_list</li><li> request_url</li><li> request_proto</li><li> trace_id</li></ul> | Provides a detailed list of log events, including timestamps, client ip, target ip, etc.                                                                  |
| Requests by OS                   | <ul><li> ua_os</li></ul>                                                                                                                                                                                                                                         | Displays the count of requests made to the ALB, grouped by user agent OS                                                                                  |
| Request by Device                | <ul><li> ua_device</li></ul>                                                                                                                                                                                                                                     | Displays the count of requests made to the ALB, grouped by user agent device.                                                                             |
| Request by Browser               | <ul><li> ua_browser</li></ul>                                                                                                                                                                                                                                    | Displays the count of requests made to the ALB, grouped by user agent browser.                                                                            |
| Request by Category              | <ul><li> ua_category</li></ul>                                                                                                                                                                                                                                   | Displays the count of category made to the ALB, grouped by user agent category (e.g., PC, Mobile, Tablet,  etc.).                                         |
| Requests by Countries or Regions | <ul><li> geo_iso_code</li></ul>                                                                                                                                                                                                                                  | Displays the count of requests made to the ALB (grouped by the corresponding country or region resolved by the client IP).                                |
| Top Countries or Regions         | <ul><li> geo_country</li></ul>                                                                                                                                                                                                                                   | Top 10 countries with the ALB Access.                                                                                                                         |
| Top Cities                       | <ul><li> geo_city</li></ul>                                                                                                                                                                                                                                      | Top 10 cities with ALB Access                                                                                                                             |


### Sample Dashboard

{%
include-markdown "../include-dashboard.md"
%}

[![elb-db]][elb-db]

[elb-db]: ../../images/dashboards/elb-db.png


