# VPC Flow Logs
[VPC Flow Logs](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html) enable you to capture information about the IP traffic going to and from network interfaces in your VPC.

You can create a log ingestion into Amazon OpenSearch Service either by using the Centralized Logging with OpenSearch console or by deploying a standalone CloudFormation stack.

!!! important "Important"
    - Centralized Logging with OpenSearch supports VPCs who publish the flow log data to an Amazon S3 bucket or a CloudWatch log group. When publishing to S3, The S3 Bucket region must be the same as the Centralized Logging with OpenSearch solution region.
    - The Amazon OpenSearch Service index is rotated on a daily basis by default, and you can adjust the index in the Additional Settings.

## Create log ingestion (OpenSearch Engine)

### Using the Centralized Logging with OpenSearch Console
1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose the **Create a log ingestion** button.
4. In the **AWS Services** section, choose **VPC Flow Logs**.
5. Choose **Next**.
6. Under **Specify settings**, choose **Automatic** or **Manual** for **VPC Flow Log enabling**. The automatic mode will enable the VPC Flow Log and save the logs to a centralized S3 bucket if logging is not enabled yet.
    - For **Automatic mode**, choose the VPC from the dropdown list.
    - For **Manual mode**, enter the **VPC Name** and **VPC Flow Logs location**.
    - (Optional) If you are ingesting VPC Flow logs from another account, select a [linked account](../link-account/index.md) from the **Account** dropdown list first.
 7. Under **Log Source**, select **S3** or **CloudWatch** as the source.
 8. Choose **Next**.
 9. In the **Specify OpenSearch domain** section, select an imported domain for **Amazon OpenSearch domain**.
 10. Choose **Yes** for **Sample dashboard** if you want to ingest an associated built-in Amazon OpenSearch Service dashboard.
 11. You can change the **Index Prefix** of the target Amazon OpenSearch Service index if needed. The default prefix is your VPC name.
 12. In the **Log Lifecycle** section, enter the number of days to manage the Amazon OpenSearch Service index lifecycle. The Centralized Logging with OpenSearch will create the associated [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) policy automatically for this pipeline.
13. In the **Select log processor** section, please choose the log processor.
    - When selecting Lambda as log processor, you can configure the Lambda concurrency if needed.
    - (Optional) OSI as log processor is now supported in these [regions](https://aws.amazon.com/about-aws/whats-new/2023/04/amazon-opensearch-service-ingestion/). When OSI is selected, please type in the minimum and maximum number of OCU. See more information [here](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ingestion.html#ingestion-scaling).
14. Choose **Next**.
 14. Add tags if needed.
 15. Choose **Create**.

### Using the CloudFormation Stack
This automated AWS CloudFormation template deploys the *Centralized Logging with OpenSearch - VPC Flow Logs Ingestion* solution in the AWS Cloud.

|                      | Launch in AWS Console                                        | Download Template                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS Standard Regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/VPCFlowLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/VPCFlowLog.template) |
| AWS China Regions    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/VPCFlowLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/VPCFlowLog.template) |

{%
include-markdown "include-cfn-common.md"
%}

### View dashboard

The dashboard includes the following visualizations.

| Visualization Name           | Source Field                                                                                                                                                                                                                                 | Description                                                                                                                                                                                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Global Filters               | <ul><li> account-id </li><li> region </li><li> vpc-id </li><li> subnet-id </li><li> action </li><li> flow-direction </li><li> log-status </li><li> protocol-code </li><li> type </li></ul>                                                   | The charts are filtered according to Account ID, Region, VPC ID and other conditions.                                                                                                                                                                     |
| Total Requests               | <ul><li> log event </li></ul>                                                                                                                                                                                                                | Shows the total number of network requests logged by VPC Flow Logs during a selected time period.                                                                                                                                                              |
| Request History              | <ul><li> log event </li></ul>                                                                                                                                                                                                                | Presents a bar chart that displays the distribution of events over time.                                                                                                                                                                                       |
| Requests by VPC ID           | <ul><li> vpc-id </li></ul>                                                                                                                                                                                                                   | Displays the proportional breakdown of network requests by source VPC using a pie chart.                                                                                                                                                                       |
| Total Requests By Action     | <ul><li> action </li></ul>                                                                                                                                                                                                                   | Displays the total volume of requests segmented by action over time.                                                                                                                                                                                           |
| Total Bytes                  | <ul><li> bytes</li></ul>                                                                                                                                                                                                                     | Provides visibility into overall bandwidth usage and traffic patterns across the monitored VPCs, subnets, network interfaces and security groups.                                                                                                              |
| Total Packets                | <ul><li> packets </li></ul>                                                                                                                                                                                                                  | Displays total logged packets over time to visualize trends, surges and dips.                                                                                                                                                                                  |
| Bytes Metric                 | <ul><li> bytes</li><li>flow-direction</li></ul>                                                                                                                                                                                              | Shows the distribution of incoming (Ingress) and outgoing (Egress) network traffic volumes in bytes across the range of flows logged by VPC Flow Logs over a time period.                                                                                      |
| Requests By Direction        | <ul><li> flow-direction</li></ul>                                                                                                                                                                                                            | Provides visibility into the proportional composition of incoming versus outgoing requests.                                                                                                                                                                    |
| Requests By Direction        | <ul><li> flow-direction </li></ul>                                                                                                                                                                                                           | Displays the total number of network flows logged by VPC Flow Logs segmented by traffic direction - Ingress vs Egress.                                                                                                                                         |
| Requests By Type             | <ul><li> type </li></ul>                                                                                                                                                                                                                     | Shows the volume of flows for each type. This provides visibility into the protocol composition of network requests traversing the environment.                                                                                                                |
| Top Source Bytes             | <ul><li> srcaddr</li><li> bytes</li></ul>                                                                                                                                                                                                    | Displays the source IP addresses transmitting the highest outbound volume of data during the selected time period.                                                                                                                                             |
| Top Destination Bytes        | <ul><li> dstaddr</li><li> bytes</li></ul>                                                                                                                                                                                                    | Enables you to monitor and analyze outbound traffic from your VPC to external destinations.                                                                                                                                                                    |
| Top Source Requests          | <ul><li>srcaddr </li></ul>                                                                                                                                                                                                                   | Allows you to see which resources inside your VPC are initiating external requests.                                                                                                                                                                            |
| Top Destination Requests     | <ul><li> dstaddr</li></ul>                                                                                                                                                                                                                   | Allows you to see which external hosts are being contacted most by your VPC resources.                                                                                                                                                                         |
| Requests by Protocol         | <ul><li> protocol-code</li></ul>                                                                                                                                                                                                             | Displays network flows logged by VPC Flow Logs segmented by traffic type - TCP, UDP, ICMP etc.                                                                                                                                                                 |
| Requests by Status           | <ul><li> log-status</li></ul>                                                                                                                                                                                                                | Provides a breakdown of network flows by their traffic status - Accepted, Rejected or Other.                                                                                                                                                                   |
| Top Source AWS Services     | <ul><li> pkt-src-aws-service</li></ul>                                                                                                                                                                                                       | Show the proportional distribution of flows originating from top AWS sources like S3, CloudFront, Lambda, etc. during the selected time period.                                                                                                                |
| Top Destination AWS Services | <ul><li> pkt-dst-aws-service</li></ul>                                                                                                                                                                                                       | Provide visibility into IP traffic going to and from AWS services located outside your VPC. By enabling flow logs on VPC subnets/interfaces and filtering on traffic with an ACCEPT action, you can view outbound flows from your VPC to various AWS services. |
| Network Flow                 | <ul><li>srcaddr</li><li>dstaddr</li></ul>                                                                                                                                                                                                    | Allows you to view information about the IP traffic going to and from network interfaces in your VPC.                                                                                                                                                          |
| Heat Map                     | <ul><li>srcaddr</li><li>dstaddr</li></ul>                                                                                                                                                                                                    | Offers a visual summary of connections between source and destination IPs in your flow log data.                                                                                                                                                               |
| Egress Traffic Path          | <ul><li>traffic-path</li></ul>                                                                                                                                                                                                               | Allows you to enable flow logging on VPC network interfaces to capture information about all IP traffic going to and from that interface.                                                                                                                      |
| Search                       | <ul><li>@timestamp</li><li>account-id</li><li>vpc-id</li><li>	flow-direction</li><li>action</li><li>protocol-code</li><li>srcaddr</li><li>scaport</li><li>dstaddr</li><li>dstport</li><li>bytes</li><li>packets</li><li>log-status</li></ul>| Searching through the detailed flow log data allows pinpoint analysis of traffic around security events, network issues, changes in usage patterns, and more.                                                                                                  |

#### Sample Dashboard

{%
include-markdown "../include-dashboard.md"
%}

[![vpcflow-db]][vpcflow-db]

[vpcflow-db]: ../../images/dashboards/vpcflow-db.png



## Create log ingestion (Light Engine)

### Using the Console
1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose the **Create a log ingestion** button.
4. In the **AWS Services** section, choose **Amazon VPC Flow**.
5. Choose **Light Engine**, Choose **Next**.
6. Under **Specify settings**, choose **Automatic** or **Manual** for **VPC Flow logs enabling**. The automatic mode will detect the VPC Flow log location automatically.
    - For **Automatic mode**, choose the VPC Flow from the dropdown lists.
      * For Standard Log, the solution will automatically detect the log location  if logging is enabled.
    - For **Manual mode**, enter the **VPC Flow ID** and **VPC Flow Log location**.
    - (Optional) If you are ingesting VpcFlow logs from another account, select a [linked account](../link-account/index.md) from the **Account** dropdown list first.
7. Choose **Next**.
9. In the **Specify Light Engine Configuration** section, if you want to ingest associated templated Grafana dashboards, select **Yes** for the sample dashboard.
10. You can choose an existing Grafana, or if you need to import a new one, you can go to Grafana for configuration.
12. Select an S3 bucket to store partitioned logs and define a name for the log table. We have provided a predefined table name, but you can modify it according to your business needs.
13. The log processing frequency is set to **5** minutes by default, with a minimum processing frequency of **1** minute.
14. In the **Log Lifecycle** section, enter the log merge time and log archive time. We have provided default values, but you can adjust them based on your business requirements.
15. Select **Next**.
16. If desired, add tags.
17. Select **Create**.

### Using the CloudFormation Stack
This automated AWS CloudFormation template deploys the *Centralized Logging with OpenSearch - VpcFlow Standard Log Ingestion* template in the AWS Cloud.

|                      | Launch in AWS Console                                        | Download Template                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS Regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesVpcFlowPipeline.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesVpcFlowPipeline.template) |
| AWS China Regions    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesVpcFlowPipeline.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesVpcFlowPipeline.template) |

1. Log in to the AWS Management Console and select the button to launch the AWS CloudFormation template. You can also download the template as a starting point for your own implementation.

2. To launch the stack in a different AWS Region, use the Region selector in the console navigation bar.

3. On the **Create stack** page, verify that the correct template URL shows in the **Amazon S3 URL** text box and choose **Next**.

4. On the **Specify stack details** page, assign a name to your solution stack.

5. Under **Parameters**, review the parameters for the template and modify them as necessary. This solution uses the following parameters.

    - Parameters for **Pipeline settings**

    | Parameter                             | Default          | Description                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Pipeline Id                | `<Requires input>` | The unique identifier for the pipeline is essential if you need to create multiple ALB pipelines and write different ALB logs into separate tables. To ensure uniqueness, you can generate a unique pipeline identifier using [uuidgenerator](https://www.uuidgenerator.net/version4).                                                                                         |
    | Staging Bucket Prefix              | AWSLogs/VpcFlowLogs | The storage directory for logs in the temporary storage area should ensure the uniqueness and non-overlapping of the Prefix for different pipelines.                                                                                        |

    - Parameters for **Destination settings**

    | Parameters                             | Default          | Description                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Centralized Bucket Name | `<Requires input>` | Centralized s3 bucket name. For example, centralized-logging-bucket.           |
    | Centralized Bucket Prefix     |  datalake                | Centralized bucket prefix. By default, the data base location is s3://{Centralized Bucket Name}/{Centralized Bucket Prefix}/amazon_cl_centralized. |
    | Centralized Table Name              | VpcFlow | Table name for writing data to the centralized database. You can modify it if needed.                                                                                        |


    - Parameters for **Scheduler settings**

    | Parameters                             | Default          | Description                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | LogProcessor Schedule Expression | rate(5 minutes) | Task scheduling expression for performing log processing, with a default value of executing the LogProcessor every 5 minutes. Configuration [for reference](https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html).           |
    | LogMerger Schedule Expression   |  cron(0 1 * * ? *)                | Task scheduling expression for performing log merging, with a default value of executing the LogMerger at 1 AM every day. Configuration [for reference](https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html). |
    | LogArchive Schedule Expression              | cron(0 2 * * ? *) | Task scheduling expression for performing log archiving, with a default value of executing the LogArchive at 2 AM every day. Configuration [for reference](https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html).
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
    | Grafana URL   |  `<Requires Input>`                | Grafana access URL，for example: https://alb-72277319.us-west-2.elb.amazonaws.com. |
    | Grafana Service Account Token              | `<Requires Input>` | Grafana Service Account Token：Service Account Token created in Grafana.
                                                                                          |




6. Choose **Next**.

7. On the **Configure stack options** page, choose **Next**.

8. On the **Review** page, review and confirm the settings. Check the box acknowledging that the template creates AWS Identity and Access Management (IAM) resources.

9. Choose **Create** stack to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive
a **CREATE_COMPLETE** status in approximately 10 minutes.
