# Cross-Account Ingestion

Centralized Logging with OpenSearch supports ingesting AWS Service logs and Application logs in different AWS accounts within the same region. After deploying Centralized Logging with OpenSearch in one account (main account), you can launch the CloudFormation stack in a different account (member account), and associate the two accounts (main account and member account) to implement cross-account ingestion.

## Concepts

- **Main account**: One account in which you deployed the Centralized Logging with OpenSearch console. The OpenSearch cluster(s) must also be in the same account.
- **Member account**: Another account from which you want to ingest AWS Service logs or application logs.

The CloudFormation stack in the member account has the least privileges. Centralized Logging with OpenSearch need to provision some AWS resources in the member account to collect logs, and will assume an IAM role provisioned in the member account to list or create resources.

For more information, refer to the [Architecture](../architecture.md) section.

## Add a member account

### Step 1. Launch a CloudFormation stack in the member account

1. Sign in to the Centralized Logging with OpenSearch console.

2. In the navigation pane, under **Resources**, choose **Member Accounts**.

3. Choose the **Link an Account** button. It displays the steps to deploy the CloudFormation stack in the member account.

    !!! Important "Important"
        You need to copy the template URL, which will be used later.

4. Go to the CloudFormation console of the member account.

5. Choose the **Create stack** button and choose **With new resources (standard)**.

6. In the **Create stack** page, enter the template URL you have copied in **Amazon S3 URL**.

7. Follow the steps to create the CloudFormation stack and wait until the CloudFormation stack is provisioned.

8. Go to the **Outputs** tab to check the parameters which will be used in **Step 2**.

### Step 2. Add a member account

1. Go back to the Centralized Logging with OpenSearch console.
2. (Optional) In the navigation panel, under **Resources**, choose **Member Accounts**.
3. In **Step 2. Link an account**, enter the parameters using the Outputs parameters from **Step 1**.

    | Parameter                              | CloudFormation Outputs | Description                                                                                                                                                        |
    |----------------------------------------|------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
    | Account Name                           | N/A                    | Name of the member account.                                                                                                                                        |
    | Account ID                             | N/A                    | 12-digit AWS account ID.                                                                                                                                           |
    | Cross Account Role ARN                 | CrossAccountRoleARN    | Centralized Logging with OpenSearch will assume this role to operate resources in the member account.                                                              |
    | FluentBit Agent Installation Document  | AgentInstallDocument   | Centralized Logging with OpenSearch will use this SSM Document to install Fluent Bit agent on EC2 instances in the member account.                                 |
    | FluentBit Agent Configuration Document | AgentConfigDocument    | Centralized Logging with OpenSearch will use this SSM Document to deliver Fluent Bit configuration to EC2 instances.                                               |
    | Cross Account S3 Bucket                | CrossAccountS3Bucket   | You can use the Centralized Logging with OpenSearch console to enable some AWS Service logs and output them to Amazon S3. The logs will be stored in this account. |
    | Cross Account Stack ID                 | CrossAccountStackId    | CloudFormation stack ID in the member account.                                                                                                                     |
    | Cross Account KMS Key                  | CrossAccountKMSKeyARN  | Centralized Logging with OpenSearch will use the Key Management Services (KMS) key to encrypt Simple Queue Service (SQS).                                          |

4. Click the **Link** button.
