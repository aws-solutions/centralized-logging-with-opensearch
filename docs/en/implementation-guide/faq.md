# Frequently Asked Questions

## General

**Q:  What is Centralized Logging with OpenSearch solution?**<br>
Centralized Logging with OpenSearch is an AWS Solution that simplifies the building of log analytics pipelines. It provides
to customers, as complementary of Amazon OpenSearch Service, capabilities to ingest and process both application logs
and AWS service logs without writing code, and create visualization dashboards from out-of-the-box templates. Centralized Logging with OpenSearch automatically
assembles the underlying AWS services, and provides you a web console to manage log analytics pipelines.

**Q: What are the supported logs in this solution?**</br>
Centralized Logging with OpenSearch supports both AWS service logs and EC2/EKS application logs. Refer to the [supported AWS services](./aws-services/index.md#supported-aws-services),
and the [supported application log formats and sources](./applications/index.md#supported-log-formats-and-sources) for more details.

**Q: Does Centralized Logging with OpenSearch support ingesting logs from multiple AWS accounts?**<br>
Yes. Centralized Logging with OpenSearch supports ingesting AWS service logs and application logs from a different AWS account
in the same region. For more information, see [cross-account ingestion](./link-account/index.md).

**Q: Does Centralized Logging with OpenSearch support ingesting logs from multiple AWS Regions?**</br>
Currently, Centralized Logging with OpenSearch does not automate the log ingestion from a different AWS Region. You need to ingest logs from other
regions into pipelines provisioned by Centralized Logging with OpenSearch. For AWS services which store the logs in S3 bucket, you can leverage
the [S3 Cross-Region Replication](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html)
to copy the logs to the Centralized Logging with OpenSearch deployed region, and import incremental logs using the [manual mode](./aws-services/cloudfront.md#using-the-centralized-logging-with-opensearch-console) by specifying the
log location in the S3 bucket. For application logs on EC2 and EKS, you need to set up the networking (for example, Kinesis VPC endpoint, VPC Peering),
install agents, and configure the agents to ingest logs to Centralized Logging with OpenSearch pipelines.

**Q: What is the license of this solution?**</br>
This solution is provided under the [Apache-2.0 license](https://www.apache.org/licenses/LICENSE-2.0). It is a permissive free
software license written by the Apache Software Foundation. It allows users to use the software for any purpose, to distribute
it, to modify it, and to distribute modified versions of the software under the terms of the license, without concern for royalties.

**Q: How can I find the roadmap of this solution?**</br>
This solution uses GitHub project to manage the roadmap. You can find the roadmap [here](https://github.com/orgs/awslabs/projects/58){target='_blank'}.

**Q: How can I submit a feature request or bug report?**</br>
You can submit feature requests and bug report through the GitHub issues. Here are the templates for [feature request][github-fr]{target='_blank'}, [bug report][github-br]{target='_blank'}.

**Q: How can I use stronger TLS Protocols to secure traffic, namely TLS 1.2 and above?**</br>
By default, CloudFront uses the TLSv1 security policy along with a default certificate.
Changing the TLS settings for CloudFront depends on the presence of your SSL certificates. If you don't have your own SSL certificates, you won't be able to alter the TLS setting for CloudFront.

In order to configure TLS 1.2 or above, you will need a custom domain. This setup will enable you to enforce stronger TLS protocols for your traffic.

To learn how to configure a custom domain and enable TLS 1.2+ for your service, you can follow the guide provided here: [Use a Custom Domain with AWS AppSync, Amazon CloudFront, and Amazon Route 53](https://aws.amazon.com/blogs/mobile/use-a-custom-domain-with-aws-appsync-amazon-cloudfront-and-amazon-route-53/).

## Setup and configuration

**Q: Can I deploy Centralized Logging with OpenSearch on AWS in any AWS Region?**</br>
Centralized Logging with OpenSearch provides two deployment options: option 1 with Cognito User Pool, and option 2 with OpenID Connect. For
option 1, customers can deploy the solution in AWS Regions where Amazon Cognito User Pool, AWS AppSync, Amazon Kinesis Data Firehose (optional) are available.
For option 2, customers can deploy the solution in AWS Regions where AWS AppSync, Amazon Kinesis Data Firehose (optional) are available.
Refer to [supported regions for deployment](./plan-deployment/considerations.md#regional-deployments) for more information.

**Q: What are the prerequisites of deploying this solution?**</br>
Centralized Logging with OpenSearch does not provision Amazon OpenSearch clusters, and you need to import existing OpenSearch clusters through the web console. The clusters
must meet the requirements specified in [prerequisites](./domains/import.md#prerequisite).

**Q: Why do I need a domain name with ICP recordal when deploying the solution in AWS China Regions?**</br>
The Centralized Logging with OpenSearch console is served via CloudFront distribution which is considered as an Internet information service. According
to the local regulations, any Internet information service must bind to a domain name with [ICP recordal](https://www.amazonaws.cn/en/support/icp/?nc2=h_l2_su).

**Q: What versions of OpenSearch does the solution work with?**</br>
Centralized Logging with OpenSearch supports Amazon OpenSearch Service, with engine version Elasticsearch 7.10 and later, Amazon OpenSearch 1.0 and later.

**Q: What are the index name rules for OpenSearch created by the Log Analytics Pipeline?**</br>

You can change the index name if needed when using the Centralized Logging with OpenSearch console to create a log analytics pipeline.

If the log analytics pipeline is created for service logs, the index name is composed of `<Index Prefix>`-`<service-type>`-`<Index Suffix>`-<00000x>, where you can define a name for Index Prefix and service-type is automatically generated by the solution according to the service type you have chosen. Moreover,  you can choose different index suffix types to adjust index rollover time window.

- YYYY-MM-DD-HH: Amazon OpenSearch will roll the index by hour.
- YYYY-MM-DD: Amazon OpenSearch will roll the index by 24 hours.
- YYYY-MM: Amazon OpenSearch will roll the index by 30 days.
- YYYY: Amazon OpenSearch will roll the index by 365 days.

It should be noted that in OpenSearch, the time is in UTC 0 time zone.

Regarding the 00000x part, Amazon OpenSearch will automatically append a 6-digit suffix to the index name, where the first index rule is 000001, rollover according to the index, and increment backwards, such as 000002, 000003.

If the log analytics pipeline is created for application log, the index name is composed of `<Index Prefix>`-`<Index Suffix>`-<00000x>. The rules for index prefix and index suffix, 00000x are the same as those for service logs.

**Q: What are the index rollover rules for OpenSearch created by the Log Analytics Pipeline?**</br>

Index rollover is determined by two factors. One is the Index Suffix in the index name. If you enable the index rollover by capacity, Amazon OpenSearch will roll your index when the index capacity equals or exceeds the specified size, regardless of the rollover time window. Note that if one of these two factors matches, index rollover can be triggered.

For example, we created an application log pipeline on January 1, 2023, deleted the application log pipeline at 9:00 on January 4, 2023, and the index name is nginx-YYYY-MM-DD-<00000x>. At the same time, we enabled the index rollover by capacity and entered 300GB. If the log data volume increases suddenly after creation, it can reach 300GB every hour, and the duration is 2 hours and 10 minutes. After that, it returns to normal, and the daily data volume is 90GB. Then OpenSearch creates three indexes on January 1, the index names are nginx-2023-01-01-000001, nginx-2023-01-01-000002, nginx-2023-01-01-000003, and then creates one every day Indexes respectively: nginx-2023-01-02-000004, nginx-2023-01-03-000005, nginx-2023-01-04-000006.

**Q: Can I deploy the solution in an existing VPC?**</br>
Yes. You can either launch the solution with a new VPC or launch the solution with an existing VPC. When using an existing
VPC, you need to select the VPC and the corresponding subnets. Refer to [launch with Cognito User Pool](./deployment/with-cognito.md) or
[launch with OpenID Connect](./deployment/with-oidc.md) for more details.

**Q: I did not receive the email containing the temporary password when launching the solution with Cognito User Pool. How can I resend the password?**</br>
Your account is managed by the Cognito User Pool. To resend the temporary password, you can find the user pool
created by the solution, delete and recreate the user using the same email address. If you still have the same issue,
try with another email address.

**Q: How can I create more users for this solution?**</br>
If you launched the solution with Cognito User Pool, go to the AWS console, find the user pool created by the solution,
and you can create more users. If you launched the solution with OpenID Connect (OIDC), you should add more users in the
user pool managed by the OIDC provider. Note that all users have the same privileges.

## Pricing

**Q: How will I be charged and billed for the use of this solution?**</br>
The solution is free to use, and you are responsible for the cost of AWS services used while running this solution.
You pay only for what you use, and there are no minimum or setup fees. Refer to the Centralized Logging with OpenSearch [Cost](./plan-deployment/cost.md) section for detailed cost estimation.

**Q: Will there be additional cost for cross-account ingestion?**</br>
No. The cost will be same as ingesting logs within the same AWS account.

## Log Ingestion

**Q: What is the log agent used in the Centralized Logging with OpenSearch solution?**</br>
Centralized Logging with OpenSearch uses [AWS for Fluent Bit](https://github.com/aws/aws-for-fluent-bit), a distribution of [Fluent Bit](https://fluentbit.io/) maintained by AWS.
The solution uses this distribution to ingest logs from Amazon EC2 and Amazon EKS.

**Q: I have already stored the AWS service logs of member accounts in a centralized logging account. How should I create service log ingestion for member accounts?**</br>
In this case, you need to deploy the Centralized Logging with OpenSearch solution in the centralized logging account, and ingest AWS service logs
using the *Manual* mode from the logging account. Refer to this [guide](./aws-services/elb.md) for ingesting Application
Load Balancer logs with *Manual* mode. You can do the same with other supported AWS services which output logs to S3.

**Q: Why there are some duplicated records in OpenSearch when ingesting logs via Kinesis Data Streams?**</br>
This is usually because there is no enough Kinesis Shards to handle the incoming requests. When threshold error occurs
in Kinesis, the Fluent Bit agent will [retry](https://docs.fluentbit.io/manual/administration/scheduling-and-retries)
that [chunk](https://docs.fluentbit.io/manual/administration/buffering-and-storage). To avoid this issue, you need to estimate your log throughput and set a proper Kinesis shard number. Please refer to the
[Kinesis Data Streams quotas and limits](https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html).
Centralized Logging with OpenSearch provides a built-in feature to scale-out and scale-in the Kinesis shards, and it would take a couple of minutes
to scale out to the desired number.

**Q: How to install log agent on CentOS 7?**</br>

1. Log in to your CentOS 7 machine and install SSM Agent manually.

    ```bash
    sudo yum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm
    sudo systemctl enable amazon-ssm-agent
    sudo systemctl start amazon-ssm-agent
    ```

2. Go to the **Instance Group** panel of Centralized Logging with OpenSearch console, create **Instance Group**, select the CentOS 7 machine, choose **Install log agent** and wait for its status to be **offline**.

3. Log in to CentOS 7 and install fluent-bit 1.9.3 manually.

    ```bash
    export RELEASE_URL=${FLUENT_BIT_PACKAGES_URL:-https://packages.fluentbit.io}
    export RELEASE_KEY=${FLUENT_BIT_PACKAGES_KEY:-https://packages.fluentbit.io/fluentbit.key}

    sudo rpm --import $RELEASE_KEY
    cat << EOF | sudo tee /etc/yum.repos.d/fluent-bit.repo
    [fluent-bit]
    name = Fluent Bit
    baseurl = $RELEASE_URL/centos/VERSION_ARCH_SUBSTR
    gpgcheck=1
    repo_gpgcheck=1
    gpgkey=$RELEASE_KEY
    enabled=1
    EOF
    sudo sed -i 's|VERSION_ARCH_SUBSTR|\$releasever/\$basearch/|g' /etc/yum.repos.d/fluent-bit.repo
    sudo yum install -y fluent-bit-1.9.3-1

    # Modify the configuration file
    sudo sed -i 's/ExecStart.*/ExecStart=\/opt\/fluent-bit\/bin\/fluent-bit -c \/opt\/fluent-bit\/etc\/fluent-bit.conf/g' /usr/lib/systemd/system/fluent-bit.service
    sudo systemctl daemon-reload
    sudo systemctl enable fluent-bit
    sudo systemctl start fluent-bit
    ```
4. Go back to the **Instance Groups** panel of the Centralized Logging with OpenSearch console and wait for the CentOS 7 machine status to be **Online** and proceed to create the instance group.

**Q: How can I consume CloudWatch custom logs?**</br>
You can use Firehose to subscribe CloudWatch logs and transfer logs into Amazon S3. Firstly, create subscription filters with Amazon Kinesis Data Firehose based on this [guide](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CrossAccountSubscriptions-Firehose.html). Next, follow the [instructions](https://docs.aws.amazon.com/firehose/latest/dev/what-is-this-service.html) to learn how to transfer logs to Amazon S3. Then, you can use Centralized Logging with OpenSearch to ingest logs from Amazon S3 to OpenSearch.

## Log Visualization

**Q: How can I find the built-in dashboards in OpenSearch?**</br>
Please refer to the [AWS Service Logs](./aws-services/index.md#supported-aws-services) and [Application Logs](./applications/index.md#supported-log-formats-and-sources) to
find out if there is a built-in dashboard supported. You also need to turn on the *Sample Dashboard* option when creating
a log analytics pipeline. The dashboard will be inserted into the Amazon OpenSearch Service under **Global Tenant**. You can switch to the
Global Tenant from the top right coder of the OpenSearch Dashboards.



[github-fr]: https://github.com/aws-solutions/centralized-logging-with-opensearch/issues/new?assignees=&labels=feature-request%2Cneeds-triage&template=feature-request.yml&title=%28module+name%29%3A+%28short+issue+description%29
[github-br]: https://github.com/aws-solutions/centralized-logging-with-opensearch/issues/new?assignees=&labels=bug%2Cneeds-triage&template=bug-report.yml&title=%28module+name%29%3A+%28short+issue+description%29