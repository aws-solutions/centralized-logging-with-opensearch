# Uninstall the Centralized Logging with OpenSearch

!!! Warning "Warning"
    You will encounter IAM role missing error if you delete the Centralized Logging with OpenSearch main stack before you delete the log pipelines. Centralized Logging with OpenSearch console launches additional CloudFormation stacks to ingest logs. If you want to uninstall the Centralized Logging with OpenSearch solution. 
    We recommend you to delete log pipelines (incl. AWS Service log pipelines and application log pipelines) before uninstall the solution. 

## Step 1. Delete Application Log Pipelines

!!! important "Important"
    Please delete all the log ingestion before deleting an application log pipeline.

1. Go to the Centralized Logging with OpenSearch console, in the left sidebar, choose **Application Log**.
2. Click the application log pipeline to view details.
3. In the ingestion tab, delete all the application log ingestion in the pipeline.
4. Uninstall/Disable the Fluent Bit agent.
    - EC2 (Optional): after removing the log ingestion from EC2 instance group. Fluent Bit will automatically stop ship logs, it is optional for you to stop the Fluent Bit in your instances. Here are the command for stopping Fluent Bit agent.
          ```commandline
             sudo service fluent-bit stop
             sudo systemctl disable fluent-bit.service
          ```
    - EKS DaemonSet (Mandatory): if you have chosen to deploy the Fluent Bit agent using DaemonSet, you need to delete your Fluent Bit agent. Otherwise, the agent will continue ship logs to Centralized Logging with OpenSearch pipelines.
          ```commandline
             kubectl delete -f ~/fluent-bit-logging.yaml
          ```
    - EKS SideCar (Mandatory): please remove the fluent-bit agent in your `.yaml` file, and restart your pod.
5. Delete the Application Log pipeline.
6. Repeat step 2 to Step 5 to delete all your application log pipelines.

## Step 2. Delete AWS Service Log Pipelines

1. Go to the Centralized Logging with OpenSearch console, in the left sidebar, choose **AWS Service Log**.
2. Select and delete the AWS Service Log Pipeline one by one.

## Step 3. Clean up imported OpenSearch domains

1. [Delete Access Proxy](domains/proxy.md#delete-a-proxy), if you have created the proxy using Centralized Logging with OpenSearch console.
2. [Delete Alarms](domains/alarms.md#delete-alarms), if you have created alarms using Centralized Logging with OpenSearch console.
3. Delete VPC peering Connection between Centralized Logging with OpenSearch's VPC and OpenSearch's VPC.
    1. Go to [AWS VPC Console](https://console.aws.amazon.com/vpc/).
    2. Choose **Peering connections** in left sidebar.
    3. Find and delete the VPC peering connection between the Centralized Logging with OpenSearch's VPC and OpenSearch's VPC. You may not have Peering Connections if you did not use the "Automatic" mode when importing OpenSearch domains.
4. (Optional) Remove imported OpenSearch Domains. (This will not delete the Amazon OpenSearch domain in the AWS account.)

## Step 4. Delete Centralized Logging with OpenSearch stack

1. Go to the [CloudFormation console](https://console.aws.amazon.com/cloudfromation/).
2. Find CloudFormation Stack of the Centralized Logging with OpenSearch solution.
3. (Optional) Delete S3 buckets created by Centralized Logging with OpenSearch.

    !!! important "Important"
         The S3 bucket whose name contains **LoggingBucket** is the centralized bucket for your AWS service log. You might have enabled AWS Services to send logs to this S3 bucket. Deleting this bucket will cause AWS Services failed to send logs.

    1. Choose the CloudFormation stack of the Centralized Logging with OpenSearch solution, and select the **Resources** tab.
    2. In search bar, enter `AWS::S3::Bucket`. This will show all the S3 buckets created by Centralized Logging with OpenSearch solution, and the **Physical ID** field is the S3 bucket name.
    3. Go to S3 console, and find the S3 bucket using the bucket name. **Empty** and **Delete** the S3 bucket.

4. Delete the CloudFormation Stack of the Centralized Logging with OpenSearch solution