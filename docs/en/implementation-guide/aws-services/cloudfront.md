# Amazon CloudFront Logs
[CloudFront standard logs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html) provide detailed records about every request made to a distribution.

## Create log ingestion
You can create a log ingestion into Amazon OpenSearch Service either by using the Centralized Logging with OpenSearch console or by deploying a standalone CloudFormation stack.

!!! important "Important"
    - The CloudFront logging bucket must be the same region as the Centralized Logging with OpenSearch solution.
    - The Amazon OpenSearch Service index is rotated on a daily basis by default, and you can adjust the index in the Additional Settings.

### Using the Centralized Logging with OpenSearch Console
1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose the **Create a log ingestion** button.
4. In the **AWS Services** section, choose **Amazon CloudFront**.
5. Choose **Next**.
6. Under **Specify settings**, choose **Automatic** or **Manual** for **CloudFront logs enabling**. The automatic mode will detect the CloudFront log location automatically.
    - For **Automatic mode**, choose the CloudFront distribution and Log Type from the dropdown lists.
      * For Standard Log, the solution will automatically detect the log location  if logging is enabled.
      * For Real-time log, the solution will prompt you for confirmation to create or replace CloudFront real-time log configuration.
    - For **Manual mode**, enter the **CloudFront Distribution ID** and **CloudFront Standard Log location**. (Note that CloudFront real-time log is not supported in Manual mode)
    - (Optional) If you are ingesting CloudFront logs from another account, select a [linked account](../link-account/index.md) from the **Account** dropdown list first.
7. Choose **Next**.
8. In the **Specify OpenSearch domain** section, select an imported domain for **Amazon OpenSearch domain**.
9. Choose **Yes** for **Sample dashboard** if you want to ingest an associated templated Amazon OpenSearch Service dashboard.
10. You can change the **Index Prefix** of the target Amazon OpenSearch Service index if needed. The default prefix is the CloudFront distribution ID.
11. In the **Log Lifecycle** section, input the number of days to manage the Amazon OpenSearch Service index lifecycle. The Centralized Logging with OpenSearch will create the associated [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) policy automatically for this pipeline.
12. Choose **Next**.
13. Add tags if needed.
14. Choose **Create**.

### Using the CloudFormation Stack
This automated AWS CloudFormation template deploys the *Centralized Logging with OpenSearch - CloudFront Standard Log Ingestion* template in the AWS Cloud.

|                      | Launch in AWS Console                                        | Download Template                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS Regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudFrontLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudFrontLog.template) |
| AWS China Regions    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudFrontLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudFrontLog.template) |

{%
include-markdown "include-cfn-plugins-common.md"
%}

## View dashboard

The dashboard includes the following visualizations.

| Visualization Name                     | Source Field                                                               | Description                                                                                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Total Requests                         | <ul><li> log event </li></ul>                                              | Displays the total number of viewer requests received by the Amazon CloudFront, for all HTTP methods and for both HTTP and HTTPS requests.                                                                                                      |
| Edge Locations                         | <ul><li> x-edge-location </li></ul>                                        | Shows a pie chart representing the proportion of the locations of CloudFront edge servers.                                                                                            |
| Request History                        | <ul><li> log event </li></ul>                                              | Presents a bar chart that displays the distribution of events over time.                                                                                            |
| Unique Visitors                         | <ul><li> c-ip </li></ul>                                                   | Displays unique visitors identified by client IP address.                                                                                                           |
| Cache Hit Rate                         | <ul><li> sc-bytes </li></ul>                                               | Shows the proportion of your viewer requests that are served directly from the CloudFront cache instead of going to your origin servers for content.     |
| Result Type                            | <ul><li> x-edge-response-result-type </li></ul>                            | Shows the percentage of hits, misses, and errors to the total viewer requests for the selected CloudFront distribution: <ul><li>Hit – A viewer request for which the object is served from a CloudFront edge cache. In access logs, these are requests for which the value of x-edge-response-result-type is Hit</li><li>Miss – A viewer request for which the object isn't currently in an edge cache, so CloudFront must get the object from your origin. In access logs, these are requests for which the value of x-edge-response-result-type is Miss.</li><li>Error – A viewer request that resulted in an error, so CloudFront didn't serve the object. In access logs, these are requests for which the value of x-edge-response-result-type is Error, LimitExceeded, or CapacityExceeded.</li></ul> The chart does not include refresh hits—requests for objects that are in the edge cache but that have expired. In access logs, refresh hits are requests for which the value of x-edge-response-result-type is RefreshHit.                     |
| Top Miss URI                           | <ul><li> cs-uri-stem</li> <li> cs-method </li>  </ul>                      | Shows top 10 of the requested objects that are not in the cache.                           |
| Bandwidth                              | <ul><li> cs-bytes</li><li> sc-bytes</li></ul>                              | Provides insights into data transfer activities from the locations of CloudFront edge.                  |
| Bandwidth History                      | <ul><li> cs-bytes</li><li> sc-bytes </li></ul>                             | Shows the historical trend of the data transfer activities from the locations of CloudFront edge.              |
| Top Client IPs                         | <ul><li> c-ip</li></ul>                                                    | Provides the top 10 IP address accessing your Amazon CloudFront.                                                                                                    |
| Status Code Count                      | <ul><li> sc-status</li></ul>                                               | Displays the count of requests made to the Amazon CloudFront, grouped by HTTP status codes(e.g., 200, 404, 403, etc.).                                              |
| Status History                         | <ul><li> @timestamp</li><li>sc-status </li></ul>                           | Shows the historical trend of HTTP status codes returned by the Amazon CloudFront over a specific period of time.                                                   |
| Status Code                            | <ul><li> sc-status</li></ul>                                               | Identifies the users or IAM roles responsible for changes to EC2 resources, assisting in accountability and tracking of modifications.                              |
| Average Time Taken                     | <ul><li> time-taken</li></ul>                                              | This visualization calculates and presents the average time taken for various operations in the Amazon CloudFront (e.g., average time for GET, PUT requests, etc.). |
| Average Time History                   | <ul><li>time-taken</li><li>time-to-first-byte</li><li>@timestamp</li></ul> | Shows the historical trend of the average time taken for various operations in the Amazon CloudFront.                                                               |
| Http Method                            | <ul><li> cs-method</li></ul>                                               | Displays the count of requests made to the Amazon CloudFront using a pie chart, grouped by http request method names (e.g., POST, GET, HEAD, etc.).                 |
| Average Time To First Byte             | <ul><li> time-to-first-byte</li></ul>                                      | Provides the average time taken in seconds by the origin server to respond back with the first byte of the response.                                                                                                                                                            |
| Top Request URIs                       | <ul><li> cs-uri-stem</li><li>cs-method</li></ul>                           | Provides the top 10 request URIs accessing your CloudFront.                                                                                                                                                                  |
| Top User Agents                        | <ul><li> cs-user-agent</li></ul>                                           | Provides the top 10 user agents accessing your CloudFront.                                                                                                                                                             |
| Edge Location Heatmap                  | <ul><li> x-edge-location</li><li>x-edge-result-type</li></ul>              | Shows a heatmap representing the result type of each edge locations.|
| Top Referers                           | <ul><li> cs-referer</li></ul>                                              | Top 10 referers with the Amazon CloudFront access.                                                                                                                                                               |
| Top Countries or Regions               | <ul><li> c_country</li></ul>                                               | Top 10 countries with the Amazon CloudFront access.                                                                                                                 |

### Sample dashboard

{%
include-markdown "../include-dashboard.md"
%}

[![cloudfront-db]][cloudfront-db]

[cloudfront-db]: ../../images/dashboards/cloudfront-db.png
