**Time to upgrade**: Approximately 20 minutes

!!! warning "Warning"

    The following upgrade documentation only supports Centralized Logging with OpenSearch version 2.x and later.

    If you are using older versions, such as v1.x or any version of Log Hub, please refer to the [Discussions on GitHub][github-discussion]{target='\_blank'}.

## Upgrade Overview

Use the following steps to upgrade the solution on AWS console.

- [Step 1. Update the CloudFormation Stack](#step-1-update-the-cloudformation-stack)
- [Step 2. Refresh the web console](#step-2-refresh-the-web-console)

## Step 1. Update the CloudFormation stack

1. Go to the [AWS CloudFormation console](https://console.aws.amazon.com/cloudformation/){target='\_blank'}.

2. Select the Centralized Logging with OpenSearch main stack, and click the **Update** button.

3. Choose **Replace current template**, and enter the specific **Amazon S3 URL** according to your initial deployment type. Refer to [Deployment Overview](./deployment/index.md) for more details.

   **_Cognito User Pool_**

   | Type                        | Link                                                                                                            |
   | --------------------------- | --------------------------------------------------------------------------------------------------------------- |
   | Launch with a new VPC       | `https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLogging.template`                |
   | Launch with an existing VPC | `https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLoggingFromExistingVPC.template` |

   **_OpenID Connect (OIDC)_**

   | Type                                             | Link                                                                                                                    |
   | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
   | Launch with a new VPC in AWS Regions             | `https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLoggingWithOIDC.template`                |
   | Launch with an existing VPC in AWS Regions       | `https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLoggingFromExistingVPCWithOIDC.template` |
   | Launch with a new VPC in AWS China Regions       | `https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLoggingWithOIDC.template`                |
   | Launch with an existing VPC in AWS China Regions | `https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLoggingFromExistingVPCWithOIDC.template` |

4. Under **Parameters**, review the parameters for the template and modify them as necessary.

5. Choose **Next**.

6. On **Configure stack options** page, choose **Next**.

7. On **Review** page, review and confirm the settings. Check the box **I acknowledge that AWS CloudFormation might create IAM resources**.

8. Choose **Update stack** to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive a **UPDATE_COMPLETE** status in approximately 15 minutes.

## Step 2. Refresh the web console

Now you have completed all the upgrade steps. Please click the **refresh** button in your browser.

[github-discussion]: https://github.com/aws-solutions/centralized-logging-with-opensearch/discussions
