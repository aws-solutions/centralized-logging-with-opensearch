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
    - For **Manual mode**, enter the **DB identifier**, select the **Database type** and input the CloudWatch log location in **Log type and location**.
    - (Optional) If you are ingesting RDS/Aurora logs from another account, select a [linked account](../link-account/index.md) from the **Account** dropdown first.
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

|                      | Launch in AWS Console                                        | Download Template                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS standard regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/template?stackName=LogHub-RDS&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/RDSLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/RDSLog.template) |
| AWS China regions    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/create/template?stackName=LogHub-RDS&templateURL=https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/RDSLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/RDSLog.template) |

{%
include-markdown "include-cw-cfn-common.md"
%}

## Sample Dashboards
{%
include-markdown "include-dashboard.md"
%}

### RDS/Aurora MySQL

[![rds-dashboard]][rds-dashboard]

[rds-dashboard]: ../../images/dashboards/rds-db.png