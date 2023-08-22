1. Log in to the AWS Management Console and select the button to launch the AWS CloudFormation template. You can also download the template as a starting point for your own implementation.

2. To launch the Centralized Logging with OpenSearch in a different AWS Region, use the Region selector in the console navigation bar.

3. On the **Create stack** page, verify that the correct template URL shows in the **Amazon S3 URL** text box and choose **Next**.

4. On the **Specify stack details** page, assign a name to your solution stack.

5. Under **Parameters**, review the parameters for the template and modify them as necessary. This solution uses the following parameters.

    | Parameter                      | Default          | Description                                                                                                                                                                                                                                 |
    | --------------------------------| --------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
    | Log Bucket Name                | `<Requires input>` | The S3 bucket name to export the logs.                                                                                                                                                                                                      |
    | Log Bucket Prefix              | `<Requires input>` | The S3 bucket path prefix which stores the the logs.                                                                                                                                                                                        |
    | Log Source Account ID          | `<Optional>`  | The AWS Account ID of the CloudWatch log group. Required for cross-account log ingestion (Please [add a member account](../link-account/index.md) first). By default, the Account ID you logged in at **Step 1** will be used.              |
    | Log Source Region              | `<Optional input>` | The AWS Region of the CloudWatch log group. By default, the Region you selected at **Step 2** will be used.                                                                                                                                 |
    | Log Source Account Assume Role | `<Optional input>` | The IAM Role ARN used for cross-account log ingestion. Required for cross-account log ingestion (Please [add a member account](../link-account/index.md) first).                                                                            |
    | Log Group Names                | `<Requires input>` | The names of the CloudWatch log group for the logs.                                                                                                                                                                                         |
    | Engine Type                    | OpenSearch | The engine type of the OpenSearch. Select OpenSearch or Elasticsearch.                                                                                                                                                                      |
    | OpenSearch Domain Name         | `<Requires input>` | The domain name of the Amazon OpenSearch cluster.                                                                                                                                                                                           |
    | OpenSearch Endpoint            | `<Requires input>` | The OpenSearch endpoint URL. For example, `vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com`                                                                                                           |
    | Index Prefix                   | `<requires input>` | The common prefix of OpenSearch index for the log. The index name will be `<Index Prefix>-<Log Type>-<Other Suffix>`.                                                                                                                       |
    | Create Sample Dashboard        | Yes | Whether to create a sample OpenSearch dashboard.                                                                                                                                                                                            |
    | VPC ID                         | `<requires input>` | Select a VPC which has access to the OpenSearch domain. The log processing Lambda will be resides in the selected VPC.                                                                                                                      |
    | Subnet IDs                     | `<requires input>` | Select at least two subnets which has access to the OpenSearch domain. The log processing Lambda will resides in the subnets. Please make sure the subnets has access to the Amazon S3 service.                                             |
    | Security Group ID              | `<requires input>` | Select a Security Group which will be associated to the log processing Lambda. Please make sure the Security Group has access to the OpenSearch domain.                                                                                     |
    | S3 Backup Bucket               | `<Requires input>` | The S3 backup bucket name to store the failed ingestion logs.                                                                                                                                                                               |
    | KMS-CMK ARN                    | `<Optional input>` | The KMS-CMK ARN for SQS encryption. Leave it blank to create a new KMS CMK.                                                                                                                                                                 |
    | Number Of Shards               | 5 | Number of shards to distribute the index evenly across all data nodes. Keep the size of each shard between 10-50 GiB.                                                                                                                       |
    | Number of Replicas            | 1 | Number of replicas for OpenSearch Index. Each replica is a full copy of an index.                                                                                                                                                           |
    | Age to Warm Storage           | `<Optional>` | The age required to move the index into warm storage (e.g. 7d). Index age is the time between its creation and the present. Supported units are d (days) and h (hours). This is only effective when warm storage is enabled in OpenSearch.  |
    | Age to Cold Storage           | `<Optional>` | The age required to move the index into cold storage (e.g. 30d). Index age is the time between its creation and the present. Supported units are d (days) and h (hours). This is only effective when cold storage is enabled in OpenSearch. |
    | Age to Retain                 | `<Optional>` | The age to retain the index (e.g. 180d). Index age is the time between its creation and the present. Supported units are d (days) and h (hours). If value is "", the index will not be deleted.                                             |
    | Rollover Index Size                 | `<Optional>` | The minimum size of the shard storage required to roll over the index (e.g. 30GB).                                                                                                                                                          |
    | Index Suffix                 | yyyy-MM-dd | The common suffix format of OpenSearch index for the log(Example: yyyy-MM-dd, yyyy-MM-dd-HH). The index name will be `<Index Prefix>-<Log Type>-<Index Suffix>-000001`.                                                                     |
    | Compression type                 | best_compression | The compression type to use to compress stored data. Available values are best_compression and default.                                                                                                                                     |
    | Refresh Interval                 | 1s | How often the index should refresh, which publishes its most recent changes and makes them available for searching. Can be set to -1 to disable refreshing. Default is 1s.                                                                  |

6. Choose **Next**.

7. On the **Configure stack options** page, choose **Next**.

8. On the **Review** page, review and confirm the settings. Check the box acknowledging that the template creates AWS Identity and Access Management (IAM) resources.

9. Choose **Create** stack to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive
a **CREATE_COMPLETE** status in approximately 15 minutes.