# Amazon CloudFront Logs
[CloudFront standard logs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html) provide detailed records about every request made to a distribution.

You can create a log ingestion into Amazon OpenSearch Service either by using the Centralized Logging with OpenSearch console or by deploying a standalone CloudFormation stack.

!!! important "Important"
    - The CloudFront logging bucket must be the same region as the Centralized Logging with OpenSearch solution.
    - The Amazon OpenSearch Service index is rotated on a daily basis by default, and you can adjust the index in the Additional Settings.

## Create log ingestion (Amazon OpenSearch for log analytics)


### Using the Console
1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose the **Create a log ingestion** button.
4. In the **AWS Services** section, choose **Amazon CloudFront**.
5. Choose **Amazon OpenSearch**, and choose **Next**.
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
12. In the **Log processor settings** section, choose **Log processor type**, and then **Next**.
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

### View dashboard

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

#### Sample dashboard

{%
include-markdown "../include-dashboard.md"
%}

[![cloudfront-db]][cloudfront-db]

[cloudfront-db]: ../../images/dashboards/cloudfront-db.png

## Create log ingestion (Light Engine for log analytics)

### Using the Console
1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose the **Create a log ingestion** button.
4. In the **AWS Services** section, choose **Amazon CloudFront**.
5. Choose **Light Engine**, Choose **Next**.
6. Under **Specify settings**, choose **Automatic** or **Manual** for **CloudFront logs enabling**. The automatic mode will detect the CloudFront log location automatically.
    - For **Automatic mode**, choose the CloudFront distribution and Log Type from the dropdown lists.
      * For Standard Log, the solution will automatically detect the log location  if logging is enabled.
    - For **Manual mode**, enter the **CloudFront Distribution ID** and **CloudFront Standard Log location**. (Note that CloudFront real-time log is not supported in Manual mode)
    - (Optional) If you are ingesting CloudFront logs from another account, select a [linked account](../link-account/index.md) from the **Account** dropdown list first.
7. Choose **Next**.
8. Choose **Log Processing Enriched fields** if needed. The available plugins are **location** and **OS/User Agent**. Enabling rich fields increases data processing latency and processing costs. By default, it is not selected.
9. In the **Specify Light Engine Configuration** section, if you want to ingest associated templated Grafana dashboards, select **Yes** for the sample dashboard.
10. You can choose an existing Grafana, or if you need to import a new one, you can go to Grafana for configuration.
12. Select an S3 bucket to store partitioned logs and define a name for the log table. We have provided a predefined table name, but you can modify it according to your business needs.
13. The log processing frequency is set to **5** minutes by default, with a minimum processing frequency of **1** minute.
14. In the **Log Lifecycle** section, enter the log merge time and log archive time. We have provided default values, but you can adjust them based on your business requirements.
15. Select **Next**.
16. If desired, add tags.
17. Select **Create**.

### Using the CloudFormation Stack
This automated AWS CloudFormation template deploys the *Centralized Logging with OpenSearch - CloudFront Standard Log Ingestion* template in the AWS Cloud.

|                      | Launch in AWS Console                                        | Download Template                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS Regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesCloudFrontPipeline.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesCloudFrontPipeline.template) |
| AWS China Regions    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesCloudFrontPipeline.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesCloudFrontPipeline.template) |

1. Log in to the AWS Management Console and select the button to launch the AWS CloudFormation template. You can also download the template as a starting point for your own implementation.

2. To launch the stack in a different AWS Region, use the Region selector in the console navigation bar.

3. On the **Create stack** page, verify that the correct template URL shows in the **Amazon S3 URL** text box and choose **Next**.

4. On the **Specify stack details** page, assign a name to your solution stack.

5. Under **Parameters**, review the parameters for the template and modify them as necessary. This solution uses the following parameters.

    - Parameters for **Pipeline settings** 

    | Parameter                             | Default          | Description                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Pipeline Id                | `<Requires input>` | The unique identifier for the pipeline is essential if you need to create multiple ALB pipelines and write different ALB logs into separate tables. To ensure uniqueness, you can generate a unique pipeline identifier using [uuidgenerator](https://www.uuidgenerator.net/version4).                                                                                         |
    | Staging Bucket Prefix              | AWSLogs/CloudFrontLogs | The storage directory for logs in the temporary storage area should ensure the uniqueness and non-overlapping of the Prefix for different pipelines.                                                                                        |

    - Parameters for **Destination settings** 

    | Parameters                             | Default          | Description                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Centralized Bucket Name | `<Requires input>` | Centralized s3 bucket name. For example, centralized-logging-bucket.           |
    | Centralized Bucket Prefix     |  datalake                | Centralized bucket prefix. By default, the data base location is s3://{Centralized Bucket Name}/{Centralized Bucket Prefix}/amazon_cl_centralized. |
    | Centralized Table Name              | CloudFront | Table name for writing data to the centralized database. You can modify it if needed.                                                                                        |
    | Enrichment Plugins              | `<Optional input>`  | The available plugins to choose from are **location** and **OS/User Agent**. Enabling rich fields will increase data processing latency and processing costs, it is not selected by default.                                                                                        |

    - Parameters for **Scheduler settings** 

    | Parameters                             | Default          | Description                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | LogProcessor Schedule Expression | rate(5 minutes) | Task scheduling expression for performing log processing, with a default value of executing the LogProcessor every 5 minutes. Configuration [for reference](https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html)。           |
    | LogMerger Schedule Expression   |  cron(0 1 * * ? *)                | 执ask scheduling expression for performing log merging, with a default value of executing the LogMerger at 1 AM every day. Configuration [for reference](https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html)。 |
    | LogArchive Schedule Expression              | cron(0 2 * * ? *) | Task scheduling expression for performing log archiving, with a default value of executing the LogArchive at 2 AM every day. Configuration [for reference](https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html)。  
    | Age to Merge              | 7 | Small file retention days, with a default value of 7, indicates that logs older than 7 days will be merged into small files. It can be adjusted as needed.
     | Age to Archive              | 30 | Log retention days, with a default value of 30, indicates that data older than 30 days will be archived and deleted. It can be adjusted as needed.

                                                                                          
    - Parameters for **Notification settings** 

    | Parameters                             | Default          | Description                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Notification Service | SNS | Notification method for alerts. If your main stack is using China, you can only choose the SNS method. If your main stack is using Global, you can choose either the SNS or SES method.           |
    | Recipients   |  `<Requires Input>`               | Alert notification: If the Notification Service is SNS, enter the SNS Topic ARN here, ensuring that you have the necessary permissions. If the Notification Service is SES, enter the email addresses separated by commas here, ensuring that the email addresses are already Verified Identities in SES. The adminEmail provided during the creation of the main stack will receive a verification email by default. |
   
    - Parameters for **Dashboard settings** 

    | Parameters                             | Default          | Description                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Import Dashboards | FALSE | Whether to import the Dashboard into Grafana, with a default value of false. If set to true, you must provide the Grafana URL and Grafana Service Account Token.。           |
    | Grafana URL   |  `<Requires Input>`                | Grafana access URL，for example: https://alb-72277319.us-west-2.elb.amazonaws.com。 |
    | Grafana Service Account Token              | `<Requires Input>` | Grafana Service Account Token：Service Account Token created in Grafana。  
                                                                                          |

   


6. Choose **Next**.

7. On the **Configure stack options** page, choose **Next**.

8. On the **Review** page, review and confirm the settings. Check the box acknowledging that the template creates AWS Identity and Access Management (IAM) resources.

9. Choose **Create** stack to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive
a **CREATE_COMPLETE** status in approximately 10 minutes.


### View Dashboard
The dashboard includes the following visualizations.

| Visualization Name                               | Source Field                         | Description                                                                                                                                                                                                                                        |
|--------------------------------------------------|--------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Filters                                          | Filters                              | The following data can be filtered by query filter conditions.                                                                                                                                                                                    |
| Total Requests                                   | log event                            | Displays the total number of viewer requests received by the Amazon CloudFront, for all HTTP methods and for both HTTP and HTTPS requests.                                                                                                          |
| Unique Visitors                                  | c-ip                                 | Displays unique visitors identified by client IP address.                                                                                                                                                                                         |
| Requests History                                 | log event                            | Presents a bar chart that displays the distribution of events over time.                                                                                                                                                                           |
| Request By Edge Location                         | x-edge-location                      | Shows a pie chart representing the proportion of the locations of CloudFront edge servers.                                                                                                                                                        |
| HTTP Status Code                                 | sc-status                            | Displays the count of requests made to the Amazon CloudFront, grouped by HTTP status codes (e.g., 200, 404, 403, etc.).                                                                                                                            |
| Status Code History                              | sc-status                            | Shows the historical trend of HTTP status codes returned by the Amazon CloudFront over a specific period of time.                                                                                                                                 |
| Status Code Pie                                  | sc-status                            | Represents the distribution of requests based on different HTTP status codes using a pie chart.                                                                                                                                                   |
| Average Processing Time                          | time-taken<br/>time-to-first-byte     | This visualization calculates and presents the average time taken for various operations in the Amazon CloudFront (e.g., average time for GET, PUT requests, etc.).                                                                               |
| Avg. Processing Time History                     | time-taken<br/>time-to-first-byte      | Shows the historical trend of the average time taken for various operations in the Amazon CloudFront.                                                                                                                                            |
| Avg. Processing Time History                     | time-taken<br/>time-to-first-byte      | Shows the historical trend of the average time taken for various operations in the Amazon CloudFront.                                                                                                                                            |
| HTTP Method                                      | cs-method                            | Displays the count of requests made to the Amazon CloudFront using a pie chart, grouped by HTTP request method names (e.g., POST, GET, HEAD, etc.).                                                                                               |
| Total Bytes                                      | cs-bytes<br/>sc-bytes                  | Provides insights into data transfer activities, including the total bytes transferred.                                                                                                                                                           |
| Response Bytes History                           | cs-bytes<br/>sc-bytes                  | Displays the historical trend of the received bytes, send bytes.                                                                                                                                                                                  |
| Edge Response Type                               | x-edge-response-result-type          | Shows the percentage of hits, misses, and errors to the total viewer requests for the selected CloudFront distribution:<br>- Hit – A viewer request for which the object is served from a CloudFront edge cache. In access logs, these are requests for which the value of x-edge-response-result-type is Hit.<br>- Miss – A viewer request for which the object isn't currently in an edge cache, so CloudFront must get the object from your origin. In access logs, these are requests for which the value of x-edge-response-result-type is Miss.<br>- Error – A viewer request that resulted in an error, so CloudFront didn't serve the object. In access logs, these are requests for which the value of x-edge-response-result-type is Error, LimitExceeded, or CapacityExceeded.<br>The chart does not include refresh hits—requests for objects that are in the edge cache but that have expired. In access logs, refresh hits are requests for which the value of x-edge-response-result-type is RefreshHit. |
| Requests / Origin Requests                       | log event                            | Displays the number of requests made to CloudFront and the number of requests back to the origin.                                                                                                                                                 |
| Requests / Origin Requests Latency               | log event<br/> time-taken               | Displays the request latency from the client to CloudFront and the request latency back to the origin.                                                                                                                                           |
| Top 20 URLs with most requests                   | log event                            | Top 20 URLs based on the number of requests.                                                                                                                                                                                                      |
| Requests 3xx / 4xx / 5xx error rate              | log event<br/> sc-status                | Displays the ratio of 3xx/4xx/5xx status codes from the client to CloudFront.                                                                                                                                                                    |
| Origin Requests 3xx / 4xx / 5xx error rate       | log event sc-status <br/>x-edge-detailed-result-type | Display the proportion of 3xx/4xx/5xx status codes returned to the origin.                                                                                                                                                                   |
| Requests 3xx / 4xx / 5xx error latency           | log event sc-status <br/>time-taken    | Displays the latency from the client to CloudFront for 3xx/4xx/5xx status codes.                                                                                                                                                                |
| Origin Requests 3xx / 4xx / 5xx error latency    | log event<br/> sc-status<br/> x-edge-detailed-result-type time-taken | Displays the delay in returning to the source 3xx/4xx/5xx status code.                                                                                                                                                                      |
| Response Latency (>= 1sec) rate         | log event <br/>time-taken              | Display the proportion of delay above 1s.                                                                                                                                                                                                         |
| Bandwidth                                        | sc-bytes                             | Displays the bandwidth from the client to CloudFront and the bandwidth back to the origin.                                                                                                                                                      |
| Data transfer                                    | sc-bytes                             | Display the response traffic.                                                                                                                                                                                                                    |
| Top 20 URLs with most traffic                    | cs-uri-stem<br/> sc-bytes               | Top 20 URLs calculated by traffic.                                                                                                                                                                                                               |
| Cache hit rate (calculated using requests)       | log event <br/>x-edge-result-type       | Displays the cache hit ratio calculated by the number of requests.                                                                                                                                                                               |
| Cache hit rate (calculated using bandwidth)      | log event<br/> sc-bytes x-edge-result-type | Displays the cache hit ratio calculated by bandwidth.                                                                                                                                                                                            |
| Cache Result                                     | log event <br/>x-edge-result-type       | Displays the number of requests of various x-edge-result-types, such as the number of requests that hit the cache and the number of requests that missed the cache.                                                                            |
| Cache Result Latency                             | log event <br/>sc-bytes <br/>x-edge-result-type | Displays the request latency of various x-edge-result-types, such as the request latency that hits the cache and the request latency that misses the cache.                                                                                   |
| Requests by OS                                   | ua_os                                | Displays the count of requests made to the ALB, grouped by user agent OS.                                                                                                                                                                        |
| Requests by Device                               | ua_device                            | Displays the count of requests made to the ALB, grouped by user agent device.                                                                                                                                                                    |
| Requests by Browser                              | ua_browser                           | Displays the count of requests made to the ALB, grouped by user agent browser.                                                                                                                                                                   |
| Requests by Category                             | ua_category                          | Displays the count of category made to the ALB, grouped by user agent category (e.g., PC, Mobile, Tablet, etc.).                                                                                                                                |
| Requests by Countries or Regions                 | geo_iso_code                         | Displays the count of requests made to the ALB (grouped by the corresponding country or region resolved by the client IP).                                                                                                                      |
| Top Countries or Regions                         | geo_country                          | Top 10 countries with the ALB Access.                                                                                                                                                                                                            |
| Top Cities                                       | geo_city                             | Top 10 cities with ALB Access.                                                                                                                                                                                                                   |