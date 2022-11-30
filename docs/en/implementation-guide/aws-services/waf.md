# AWS WAF Logs
[WAF Access logs](https://docs.aws.amazon.com/waf/latest/developerguide/logging.html) provide detailed information about traffic that is analyzed by your web ACL. Logged information includes the time that AWS WAF received a web request from your AWS resource, detailed information about the request, and details about the rules that the request matched.

## Create log ingestion
You can create a log ingestion into AOS either by using the Log Hub console or by deploying a standalone CloudFormation stack.

!!! important "Important"
    - The WAF logging bucket must be the same as the Log Hub solution.
    - [WAF Classic](https://docs.aws.amazon.com/waf/latest/developerguide/classic-waf-chapter.html) logs are not supported in Log Hub. Learn more about [migrating rules from WAF Classic to the new AWS WAF](https://aws.amazon.com/blogs/security/migrating-rules-from-aws-waf-classic-to-new-aws-waf/).
    - The AOS index is rotated on a daily basis, and cannot be adjusted.

### Using the Log Hub Console

1. Sign in to the Log Hub Console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose the **Create a log ingestion** button.
4. In the **AWS Services** section, choose **AWS WAF**.
5. Choose **Next**.
6. Under **Specify settings**, choose **Automatic** or **Manual**.
    - For **Automatic** mode, choose a Web ACL in the dropdown list. 
    - For **Manual** mode, enter the **Web ACL name**.
    - (Optional) If you are ingesting WAF logs from another account, select a [linked account](../link-account/index.md) from the **Account** dropdown list first.
7. Specify an **Ingest Options**. Choose between **Sampled Request** or **Full Request**.
    - For **Sampled Request**, enter how often you want to ingest sampled requests in minutes.
    - For **Full Request**. If the Web ACL log is not enabled, click **Enable** to enable the access log, or enter **Log location** in Manual mode. Note that, Log Hub will automatically enable logging with a Kinesis Data Firehose stream as destination for your WAF.
8. Choose **Next**.
9. In the **Specify OpenSearch domain** section, select an imported domain for **Amazon OpenSearch domain**.
10. Choose **Yes** for **Sample dashboard** if you want to ingest an associated templated AOS dashboard.
11. You can change the **Index Prefix** of the target AOS index if needed. The default prefix is the `Web ACL Name`.
12. In the **Log Lifecycle** section, input the number of days to manage the AOS index lifecycle. The Log Hub will create the associated [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) policy automatically for this pipeline.
13. Choose **Next**.
14. Add tags if needed.
15. Choose **Create**.

### Using the CloudFormation Stack
This automated AWS CloudFormation template deploys the *Log Hub - WAF Log Ingestion* solution in the AWS Cloud.

|                                         | Launch in AWS Console                                                                                                                                                                                                                                                       | Download Template                                            |
|-----------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| ------------------------------------------------------------ |
| AWS standard regions (Full requests)    | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/template?stackName=LogHub-WAF&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/WAFLog.template){target=_blank}                    | [Template](https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/WAFLog.template) |
| AWS China regions (Full requests)       | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/create/template?stackName=LogHub-WAF&templateURL=https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/WAFLog.template){target=_blank}        | [Template](https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/WAFLog.template) |
| AWS standard regions (Sampled requests) | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/template?stackName=LogHub-WAF&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/WAFSampledLog.template){target=_blank}             | [Template](https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/WAFSampledLog.template) |
| AWS China regions (Sampled requests)    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/create/template?stackName=LogHub-WAF&templateURL=https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/WAFSampledLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/WAFSampledLog.template) |

1. Log in to the AWS Management Console and select above button to launch the AWS CloudFormation template. You can also download the template as a starting point for your own implementation.

2. To launch the stack in a different AWS Region, use the Region selector in the console navigation bar.

3. On the **Create stack** page, verify that the correct template URL shows in the **Amazon S3 URL** text box and choose **Next**.

4. On the **Specify stack details** page, assign a name to your solution stack.

5. Under **Parameters**, review the parameters for the template and modify them as necessary. This solution uses the following parameters.

    - **Full Request** only parameters

    | Parameter         | Default            | Description                                      |
    | ----------------- | ------------------ | ------------------------------------------------ |
    | Log Bucket Name   | `<Requires input>` | The S3 bucket name which stores the logs.        |
    | Log Bucket Prefix | `<Requires input>` | The S3 bucket path prefix which stores the logs. |

    - **Sampled Request** only parameters

    | Parameter    | Default            | Description                                             |
    | ------------ | ------------------ | ------------------------------------------------------- |
    | WebACL Names | `<Requires input>` | The list of WebACL names, delimited by comma.           |
    | Interval     | `1`                | The default internval (in minutes) to get sampled logs. |

    - Common parameters

    | Parameter                      | Default          | Description                                                                                                                                                                                                         |
    | --------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
    | Log Source Account ID          | `<Optional input>`  | The AWS Account ID of the S3 bucket. Required for cross-account log ingestion (Please [add a member account](../link-account/index.md) first). By default, the Account ID you logged in at **Step 1** will be used. |
    | Log Source Region              | `<Optional input>` | The AWS Region of the S3 bucket. By default, the Region you selected at **Step 2** will be used.                                                                                                                    |
    | Log Source Account Assume Role | `<Optional input>` | The IAM Role ARN used for cross-account log ingestion. Required for cross-account log ingestion (Please [add a member account](../link-account/index.md) first).                                                    |
    | Engine Type                    | OpenSearch | The engine type of the OpenSearch. Select OpenSearch or Elasticsearch.                                                                                                                                              |
    | OpenSearch Domain Name         | `<Requires input>` | The domain name of the Amazon OpenSearch cluster.                                                                                                                                                                   |
    | OpenSearch Endpoint            | `<Requires input>` | The OpenSearch endpoint URL. For example, `vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com`                                                                                   |
    | Index Prefix                   | `<Requires input>` | The common prefix of OpenSearch index for the log. The index name will be `<Index Prefix>-<log-type>-<YYYY-MM-DD>`.                                                                                                 |
    | Create Sample Dashboard        | Yes | Whether to create a sample OpenSearch dashboard.                                                                                                                                                                    |
    | VPC ID                         | `<Requires input>` | Select a VPC which has access to the OpenSearch domain. The log processing Lambda will reside in the selected VPC.                                                                                                  |
    | Subnet IDs                     | `<Requires input>` | Select at least two subnets which have access to the OpenSearch domain. The log processing Lambda will reside in the subnets. Make sure the subnets have access to the Amazon S3 service.                           |
    | Security Group ID              | `<Requires input>` | Select a Security Group which will be associated with the log processing Lambda. Make sure the Security Group has access to the OpenSearch domain.                                                                  |
    | S3 Backup Bucket               | `<Requires input>` | The S3 backup bucket name to store the failed ingestion logs.                                                                                                                                                       |
    | KMS-CMK ARN               | `<Optional input>` | The KMS-CMK ARN for encryption. Leave empty to create a new KMS CMK.                                                                                                                                                |
    | Number Of Shards               | 5 | Number of shards to distribute the index evenly across all data nodes. Keep the size of each shard between 10-50 GiB.                                                                                               |
    | Number of Replicas             | 1 | Number of replicas for OpenSearch Index. Each replica is a full copy of an index.                                                                                                                                   |
    | Days to Warm Storage           | 0 | The number of days required to move the index into warm storage. This takes effect only when the value is larger than 0 and warm storage is enabled in OpenSearch.                                                  |
    | Days to Cold Storage           | 0 | The number of days required to move the index into cold storage. This takes effect only when the value is larger than 0 and cold storage is enabled in OpenSearch.                                                  |
    | Days to Retain                 | 0 | The total number of days to retain the index. If value is 0, the index will not be deleted.                                                                                                                         |

6. Choose **Next**.

7. On the **Configure stack options** page, choose **Next**.

8. On the **Review** page, review and confirm the settings. Check the box acknowledging that the template creates AWS Identity and Access Management (IAM) resources.

9. Choose **Create** stack to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive
a **CREATE_COMPLETE** status in approximately 10 minutes.


## Sample Dashboard
{%
include-markdown "include-dashboard.md"
%}

[![waf-db]][waf-db]

[waf-db]: ../../images/dashboards/waf-db.png

