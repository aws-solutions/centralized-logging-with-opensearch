# Application Load Balancing (ALB) Logs
[ALB Access logs](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html) provide access logs that capture detailed information about requests sent to your load balancer. ALB publishes a log file for each load 
balancer node every 5 minutes. 

## Create log ingestion
You can create a log ingestion into AOS either by using the Log Hub console or by deploying a standalone CloudFormation stack.

!!! important "Important"

    - The ELB logging bucket must be the same as the Log Hub solution.
    - The AOS index is rotated on a daily basis, and cannot be adjusted.
### Using the Log Hub Console

1. Sign in to the Log Hub Console.
2. In the navigation pane, under **Log Analytics Pipelines**, choose **Service Log**.
3. Choose the **Create a log ingestion** button.
4. In the **AWS Services** section, choose **Elastic Load Balancer**.
5. Choose **Next**.
6. Under **Specify settings**, choose **Automatic** or **Manual**.
   -  For **Automatic** mode, choose an application load balancer in the dropdown list. (If the selected ALB access log is not enabled, click **Enable** to enable the ALB access log.)
   -  For **Manual** mode, enter the **Application Load Balancer identifier** and **Log location**.
7. Choose **Next**.
8. In the **Specify OpenSearch domain** section, select an imported domain for **Amazon OpenSearch domain**.
9. Choose **Yes** for **Sample dashboard** if you want to ingest an associated templated AOS dashboard.
10. You can change the **Index Prefix** of the target AOS index if needed. The default prefix is the `Load Balancer Name`.
11. In the **Log Lifecycle** section, input the number of days to manage the AOS index lifecycle. The Log Hub will create the associated [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) policy automatically for this pipeline.
12. Choose **Next**.
13. Add tags if needed.
14. Choose **Create**.

### Using the CloudFormation Stack
This automated AWS CloudFormation template deploys the *Log Hub - ELB Log Ingestion* solution in the AWS Cloud.

|                      | Launch in AWS Console                                        | Download Template                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS standard regions | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/template?stackName=LogHub-CloudFront&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/ELBLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/ELBLog.template) |
| AWS China regions    | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/create/template?stackName=LogHub-CloudFront&templateURL=https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/ELBLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/ELBLog.template) |

{%
include-markdown "include-cfn-common.md"
%}

## Sample Dashboard
{%
include-markdown "include-dashboard.md"
%}

[![elb-db]][elb-db]

[elb-db]: ../../images/dashboards/elb-db.png

