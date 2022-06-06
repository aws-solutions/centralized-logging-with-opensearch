# Frequently Asked Questions

## Q. How to ingest the logs of AWS managed services in a region different from the Log Hub deployed region?

You can leverage [S3 cross-region replication](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html) to copy the logs to the Log Hub deployed region, and set a proper [object lifecycle management](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html) to delete the original data.  


## Q. My CloudFormation stack is stuck on deleting an `AWS::Lambda::Function` resource when I update the stack. How to resolve it?

The Lambda function resides in a VPC, and you need to wait for the associated ENI resource to be deleted.

![](../images/faq/cloudformation-stuck.png)

## Q. What are the limitations of this solution?

- Log Hub only supports AOS domains with fine-grained access control enabled. As described in the [best practice](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/aes-bp.html), you can create a domain within a VPC. AOS using public access is not supported. 
- Log Hub must be deployed in the same AWS account and same region as the AOS domains to be used. 


## Logging Agent

### Q. The agent status is offline after I restart the EC2 instance, how can I make it auto start on instance restart?

This usually happens if you have installed the logging agent, but restart the instance before you create any Log Ingestion. The Logging
Agent will auto restart if there is at least one Log Ingestion. If you have a log ingestion, but the problem still exists, you can use `systemctl status fluent-bit` 
to check its status inside the instance.


## Log Ingestion

### Q. I have created an application log ingestion, however there are duplicated records in OpenSearch.

This is usually because there is no enough Kinesis Shards to handle the incoming requests. When threshold error occurs 
in Kinesis, the Fluent Bit agent will [retry](https://docs.fluentbit.io/manual/administration/scheduling-and-retries) that [chunk](https://docs.fluentbit.io/manual/administration/buffering-and-storage). 