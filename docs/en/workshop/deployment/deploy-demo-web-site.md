# Deploy E-Commerce Demo Site & OpenSearch Domain
> Estimated time: 20 minutes

!!! Warning "Warning"

    Please make sure we have at least two vacancies to create new VPCs in your us-east-1 region. This workshop will automatically create two VPCs in your us-east-1 region in total, so lack of VPC limit would cause deployment failure.

#### Launch Stack 

1. Go to the <a href="https://console.aws.amazon.com/console/home?region=us-east-1" target="_blank">AWS Management Console</a> and select the button below to launch the ```WorkshopDemo``` AWS CloudFormation template.
    
    <a href="https://console.aws.amazon.com/cloudformation/home#/stacks/create/template?stackName=WorkshopDemo&templateURL=https://aws-gcr-solutions.s3.amazonaws.com/log-hub-workshop/v1.0.0/LoghubWorkshop.template" target="_blank">![Launch Web Site](../../images/launch-stack.png)</a>

2. We launch this template in **US East (N. Virginia)** Region, please check the region on the right-upper corner and make sure it's correct.

3. On the **Create stack** page, verify that the correct template URL shows in the **Amazon S3 URL** text box and choose **Next**.

4. On the **Specify stack details** page, keep the name unchanged.

5. Choose **Next**.

6. On the **Configure stack options** page, choose *Next*.

7. On the **Review** page, review and confirm the settings. Check the box **I acknowledging that the template creates AWS Identity and Access Management (IAM) resources.**

8. Choose **Create Stack** to deploy the stack. The deployment process will take about 15 mins.

This Cloudformation Stack will help you automatically deploy a complete three-tier web site architecture, which consists of ALB, EC2, S3, Cloudfront, DDB and an OpenSearch inside.

The architecture diagram is shown as follows:
![Workshop Demo](../../images/workshop/workshop-demo.png)

You can now view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive a **CREATE_COMPLETE** status in approximately 20 minutes. 

#### Verify the Demo Site & Import Sample Data

You can now acess the front-end web page through the output of the CloudFormation and import some sample data.

1. Select the CloudFormation Stack, and choose **Outputs.**
2. Find the value of **ALBCNAME** and open the URL in browser.
3. Click the **Import Demo Data** button

The web should look like this:
![Demo web](../../images/workshop/workshop-web.png)

!!! Note "Note"

    If it shows code 502, please wait for 3 more minutes to let EC2 fully booted. Then refresh the web site again. If it doesn’t work, please terminate two EC2, which names are *LoghubWorkshop/workshopASG*, the auto-scaling group will create two new instances for you automatically. 
