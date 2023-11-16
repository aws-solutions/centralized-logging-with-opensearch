# Application Load Balancing (ALB) Logs
[ALB Access logs](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html) provide access logs that capture detailed information about requests sent to your load balancer. ALB publishes a log file for each load
balancer node every 5 minutes.

You can create a log ingestion into Amazon OpenSearch Service or Light Engine either by using the Centralized Logging with OpenSearch console or by deploying a standalone CloudFormation stack.

!!! important "Important"

    - The ELB logging bucket's region must be the same as the Centralized Logging with OpenSearch solution.
    - The Amazon OpenSearch Service index is rotated on a daily basis by default, and you can adjust the index in the Additional Settings.

## Create log ingestion (Amazon OpenSearch for log analytics)

### Using the Console

1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose the **Create a log ingestion** button.
4. In the **AWS Services** section, choose **Elastic Load Balancer**.
5. Choose **Amazon OpenSearch**, Choose **Next**.
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

### View dashboard

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


#### Sample Dashboard

## Create log ingestion (Light Engine for log analytics)

### Using the Console

1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose the **Create a log ingestion** button.
4. In the **AWS Services** section, choose **Elastic Load Balancer**.
5. Choose ** Light Engine**, Choose **Next**.
6. Under **Specify settings**, choose **Automatic** or **Manual**.
    - For **Automatic** mode, choose an application load balancer in the dropdown list. (If the selected ALB access log is not enabled, click **Enable** to enable the ALB access log.)
    - For **Manual** mode, enter the **Application Load Balancer identifier** and **Log location**.
    - (Optional) If you are ingesting logs from another account, select a [linked account](../link-account/index.md) from the **Account** dropdown first.
7. Choose **Next**.
8. **Log Processing** **Enriched fields**，The available plugins to choose from are **location** and **OS/User Agent**. Enabling rich fields will increase data processing latency and processing costs, it is not selected by default.
9. In the **Specify Light Engine Configuration** section, if you want to ingest associated templated Grafana dashboards, select **Yes** for the sample dashboard.
10. You can choose an existing Grafana, or if you need to import a new one, you can go to Grafana for configuration.
12. Select an S3 bucket to store partitioned logs and define a name for the log table. We have provided a predefined table name, but you can modify it according to your business needs.
13. The log processing frequency is set to **5** minutes by default, with a minimum processing frequency of **1** minute.
14. In the **Log Lifecycle** section, enter the log merge time and log archive time. We have provided default values, but you can adjust them based on your business requirements.
15. Select **Next**.
16. If desired, add tags.
17. Select **Create**.

### Using the CloudFormation Stack
This automated AWS CloudFormation template deploys the *Centralized Logging with OpenSearch - ELB Log Ingestion* solution in the AWS Cloud.

|                      | Launch in AWS Console                                        | Download Template                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS Regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesAlbPipeline.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesAlbPipeline.template) |
| AWS China Regions    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesAlbPipeline.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesAlbPipeline.template) |

1. Log in to the AWS Management Console and select the button to launch the AWS CloudFormation template. You can also download the template as a starting point for your own implementation.

2. To launch the stack in a different AWS Region, use the Region selector in the console navigation bar.

3. On the **Create stack** page, verify that the correct template URL shows in the **Amazon S3 URL** text box and choose **Next**.

4. On the **Specify stack details** page, assign a name to your solution stack.

5. Under **Parameters**, review the parameters for the template and modify them as necessary. This solution uses the following parameters.

    - Parameters for **Pipeline settings** 

    | Parameter                             | Defaul          | Description                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Pipeline Id                | `<Requires input>` | The unique identifier for the pipeline is essential if you need to create multiple ALB pipelines and write different ALB logs into separate tables. To ensure uniqueness, you can generate a unique pipeline identifier using [uuidgenerator](https://www.uuidgenerator.net/version4).                                                                                         |
    | Staging Bucket Prefix              | AWSLogs/ALBLogs | The storage directory for logs in the temporary storage area should ensure the uniqueness and non-overlapping of the Prefix for different pipelines.                                                                                        |

    - Parameters for **Destination settings** 

    | Parameters                             | Default          | Description                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Centralized Bucket Name | `<Requires input>` | Input centralized s3 bucket name，for expample:centralized-logging-bucket。           |
    | Centralized Bucket Prefix     |  datalake                | Input centralized bucket prefix，default is datalake which means your data base's location is s3://{Centralized Bucket Name}/{Centralized Bucket Prefix}/amazon_cl_centralized。 |
    | Centralized Table Name              | ALB | Table name for writing data to the centralized database, can be defined as needed, default value is 'ALB'.                                                                                        |
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

| Visualization Name                        | Source Field                                  | Description                                                                                                                                         |
|-------------------------------------------|-----------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| Filters                                   | Filters                                       | The following data can be filtered by query filter conditions.                                                                                      |
| Total Requests                            | log event                                     | Displays aggregated events based on a specified time interval.                                                                                      |
| Unique Visitors                           | client_ip                                     | Displays unique visitors identified by client IP address.                                                                                           |
| Requests History                          | log event                                     | Presents a bar chart that displays the distribution of events over time.                                                                             |
| Request By Target                         | log event<br/> target_ip                         | Presents a bar chart that displays the distribution of events over time and IP.                                                                     |
| HTTP Status Code                          | elb_status_code                               | Displays the count of requests made to the ALB, grouped by HTTP status codes (e.g., 200, 404, 403, etc.).                                          |
| Status Code History                       | elb_status_code                               | Shows the historical trend of HTTP status codes returned by the ALB over a specific period of time.                                                 |
| Status Code Pie                           | elb_status_code                               | Represents the distribution of requests based on different HTTP status codes using a pie chart.                                                      |
| Average Processing Time                   | request_processing_time<br/>  response_processing_time<br/>  target_processing_time | This visualization calculates and presents the average time taken for various operations in the ALB.                                              |
| Avg. Processing Time History              | request_processing_time <br/> response_processing_time <br/> target_processing_time | Displays the historical trend of the average time-consuming of each operation returned by the ALB within a specific period of time.                 |
| HTTP Method                               | request_verb                                  | Displays the count of requests made to the ALB using a pie chart, grouped by HTTP request method names (e.g., POST, GET, HEAD, etc.).                 |
| Total Bytes                               | received_bytes <br/> sent_bytes                    | Provides insights into data transfer activities, including the total bytes transferred.                                                              |
| Sent and Received Bytes History           | received_bytes <br/> sent_bytes                    | Displays the historical trend of the received bytes, send bytes.                                                                                     |
| SSL Protocol                              | ssl_protocol                                  | Displays the count of requests made to the ALB, grouped by SSL Protocol.                                                                             |
| Top Request URLs                          | request_url                                   | The web requests view enables you to analyze the top web requests.                                                                                   |
| Top Client IPs                            | client_ip                                     | Provides the top 10 IP addresses accessing your ALB.                                                                                                 |
| Bad Requests                              | type client_ip <br/> target_group_arn <br/> target_ip elb_status_code <br/> request_verb <br/> request_url ssl_protocol<br/>  received_bytes <br/> sent_bytes | Provides a detailed list of log events, including timestamps, client IP, target IP, etc.                                                          |
| Requests by OS                            | ua_os                                         | Displays the count of requests made to the ALB, grouped by user agent OS.                                                                             |
| Requests by Device                        | ua_device                                     | Displays the count of requests made to the ALB, grouped by user agent device.                                                                         |
| Requests by Browser                       | ua_browser                                    | Displays the count of requests made to the ALB, grouped by user agent browser.                                                                        |
| Requests by Category                      | ua_category                                   | Displays the count of category made to the ALB, grouped by user agent category (e.g., PC, Mobile, Tablet, etc.).                                    |
| Requests by Countries or Regions          | geo_iso_code                                  | Displays the count of requests made to the ALB (grouped by the corresponding country or region resolved by the client IP).                          |
| Top Countries or Regions                  | geo_country                                   | Top 10 countries with the ALB Access.                                                                                                                |
| Top Cities                                | geo_city                                      | Top 10 cities with ALB Access.                                                                                                                      |
