# Amazon RDS/Aurora Logs
 
 You can [publish database instance logs to Amazon CloudWatch Logs](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.Procedural.UploadtoCloudWatch.html). Then, you can perform real-time analysis of the log data, store the data in highly durable storage, and manage the data with the CloudWatch Logs Agent.

## Prerequisites 
Make sure your database logs are enabled. Some databases logs are not enabled by default, and you need to update your database parameters to enable the logs. 

Refer to [How do I enable and monitor logs for an Amazon RDS MySQL DB instance?](https://aws.amazon.com/premiumsupport/knowledge-center/rds-mysql-logs/) to learn how to output logs to CloudWatch Logs.

The table below lists the requirements for RDS/Aurora MySQL parameters.

| Parameter            | Requirement                                                  |
| -------------- | ------------------------------------------------------------ |
| Audit Log      | The database instance must use a custom option group with the `MARIADB_AUDIT_PLUGIN` option. |
| General log    | The database instance must use a custom parameter group with the parameter setting `general_log = 1` to enable the general log. |
| Slow query log | The database instance must use a custom parameter group with the parameter setting `slow_query_log = 1` to enable the slow query log. |
| Log output     | The database instance must use a custom parameter group with the parameter setting `log_output = FILE` to write logs to the file system and publish them to CloudWatch Logs. |

## Create log ingestion
You can create a log ingestion into AOS either by using the Log Hub console or by deploying a standalone CloudFormation stack.

!!! important "Important"

    - The RDS and CloudWatch region must be the same as the Log Hub solution region.
    - The AOS index is rotated on a daily basis, and cannot be adjusted.

### Using the Log Hub Console
1. Sign in to the Log Hub Console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose the **Create a log ingestion** button.
4. In the **AWS Services** section, choose **Amazon RDS**.
5. Choose **Next**.
6. Under **Specify settings**, choose **Automatic** or **Manual** for **RDS log enabling**. The automatic mode will detect your RDS log configurations and ingest logs from CloudWatch.
    - For **Automatic mode**, choose the RDS cluster from the dropdown list.
    - For **Manual mode**, enter
 the **DB identifier**, select the **Database type** and input the CloudWatch log location in **Log type and location**.
7. Choose **Next**.
8. In the **Specify OpenSearch domain** section, select an imported domain for **Amazon OpenSearch domain**.
9. Choose **Yes** for **Sample dashboard** if you want to ingest an associated templated AOS dashboard.
10. You can change the **Index Prefix** of the target AOS index if needed. The default prefix is the `Database identifier`.
11. In the **Log Lifecycle** section, input the number of days to manage the AOS index lifecycle. The Log Hub will create the associated [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) policy automatically for this pipeline.
12. Choose **Next**.
13. Add tags if needed.
14. Choose **Create**.

### Using the CloudFormation Stack
This automated AWS CloudFormation template deploys the *Log Hub - RDS Log Ingestion* solution in the AWS Cloud.

1. Log in to the AWS Management Console and select the button to launch the AWS CloudFormation template. You can also download the template as a starting point for your own implementation.

    |                      | Launch in AWS Console                                        | Download Template                                            |
    | -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
    | AWS standard regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/template?stackName=LogHub-RDS&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/RDSLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/RDSLog.template) |
    | AWS China regions    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/create/template?stackName=LogHub-RDS&templateURL=https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/RDSLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/RDSLog.template) |

2. To launch the Log Hub in a different AWS Region, use the Region selector in the console navigation bar.

3. On the **Create stack** page, verify that the correct template URL shows in the **Amazon S3 URL** text box and choose **Next**.

4. On the **Specify stack details** page, assign a name to your solution stack.

5. Under **Parameters**, review the parameters for the template and modify them as necessary. This solution uses the following default values.

    | Parameter  | Default          | Description                                                  |
    | ---------- | ---------------- | ------------------------------------------------------------ |
    | LogGroupNames | `<Requires input>` | The names of the CloudWatch log group for RDS logs.  |
    | Log Bucket Name | `<Requires input>` | A S3 bucket name to export the RDS logs. |
    | Log Bucket Prefix | `<Requires input>` | The S3 bucket path prefix which stores the RDS logs.  |
    | KDSShardNumber | `1` | The shard number of Kinesis Data Streams which will subscribe to the CloudWatch log groups. |
    | KDSRetentionHours | `48` | The retention hours of Kinesis Data Streams. |
    | Engine Type | OpenSearch | The engine type of the OpenSearch. Select OpenSearch or Elasticsearch. |
    | OpenSearch Domain Name | `<Requires input>` | The domain name of the Amazon OpenSearch cluster. |
    | OpenSearch Endpoint | `<Requires input>` | The OpenSearch endpoint URL. For example, `vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com` |
    | Index Prefix | `<requires input>` | The common prefix of OpenSearch index for the log. The index name will be `<Index Prefix>-<log-type>-<YYYY-MM-DD>`. |
    | Create Sample Dashboard | Yes | Whether to create a sample OpenSearch dashboard. |
    | VPC ID | `<requires input>` | Select a VPC which has access to the OpenSearch domain. The log processing Lambda will be resides in the selected VPC. |
    | Subnet IDs | `<requires input>` | Select at least two subnets which has access to the OpenSearch domain. The log processing Lambda will resides in the subnets. Please make sure the subnets has access to the Amazon S3 service. |
    | Security Group ID | `<requires input>` | Select a Security Group which will be associated to the log processing Lambda. Please make sure the Security Group has access to the OpenSearch domain. |
    | S3 Backup Bucket | `<Requires input>` | The S3 backup bucket name to store the failed ingestion logs.  |
    | Number Of Shards | 5 | Number of shards to distribute the index evenly across all data nodes. Keep the size of each shard between 10-50 GiB. |
    | Number of Replicas | 1 | Number of replicas for OpenSearch Index. Each replica is a full copy of an index. |
    | Days to Warm Storage | 0 | The number of days required to move the index into warm storage. This takes effect only when the value is larger than 0 and warm storage is enabled in OpenSearch. |
    | Days to Cold Storage | 0 | The number of days required to move the index into cold storage. This takes effect only when the value is larger than 0 and cold storage is enabled in OpenSearch. |
    | Days to Retain | 0 | The total number of days to retain the index. If value is 0, the index will not be deleted. |

6. Choose **Next**.

7. On the **Configure stack options** page, choose **Next**.

8. On the **Review** page, review and confirm the settings. Check the box acknowledging that the template creates AWS Identity and Access Management (IAM) resources.

9. Choose **Create** stack to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive
a **CREATE_COMPLETE** status in approximately 15 minutes.

## Sample Dashboards
{%
include-markdown "include-dashboard.md"
%}

### RDS/Aurora MySQL

[![rds-dashboard]][rds-dashboard]

[rds-dashboard]: ../../images/dashboards/rds-db.png