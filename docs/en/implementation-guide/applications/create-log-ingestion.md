
<!--ig-start-->
### Instance Group as Log Source

1. Sign in to the Log Hub Console.
2. In the left sidebar, under **Log Analytics Pipelines**, choose **Application Log**.
3. Click on the application pipeline that has been created during the **Prerequisites**.
4. Go to **Permission** tab and copy the provided JSON policy.
5. Go to **AWS Console > IAM > Policies** on the left column, and 

    - Click **Create Policy**, choose **JSON** and replace all the content inside the text block. Remember to substitute `<YOUR ACCOUNT ID>` with your account id.
    - Choose **Next**, **Next**, then enter the name for this policy. For example: **`loghub-ec2-policy`**.
    - Attach the policy to your EC2 instance profile to allow the log agent have permissions to send logs to the application log pipeline. If you are using Auto Scaling group, you need to update the IAM instance profile associated with the Auto Scaling Group (depends on your Auto Scaling Group's setup, please follow the AWS documentation to update [Launch Template][launch-template] or [Launch Configuration][launch-configuration]).

6. Click the **Create an Ingestion** dropdown menu, and select **From Instance Group**.
7. Select **Choose exists** and choose **Next**.
8. Select the instance group you have created during the **Prerequisites** and choose **Next**.
9. (Auto Scaling Group only) If your instance group is created based on an Auto Scaling Group, after ingestion status become "Created", then you can find the generated Shell Script in the instance group's detail page. Copy the shell script and update the User Data of the Auto Scaling [Launch configurations](https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-configurations.html) or [Launch template](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-templates.html).
10. Select **Choose exists** and select the log config created in previous setup.
11. Choose **Next**, then choose **Create**.

<!--ig-end-->

<!--eks-start-->
### EKS Cluster as Log Source

1. Sign in to the Log Hub Console.
2. In the left sidebar, under **Log Source**, choose **EKS Clusters**.
3. Click the EKS Cluster that has been imported as Log Source during the **Prerequisites**.
4. Go to **App Log Ingestion** tab and click **Create an Ingestion**.
    - Select **Choose exists** and choose the application pipeline that has been created during the **Prerequisites**. Choose **Next**.
    - Select the log config created in previous setup, and choose **Next**.
    - Add tags as needed, then choose **Create** to finish creating an ingestion.
5. Deploy Fluent-bit log agent following the guide generated by Log Hub. 
    - Select the App Log Ingestion just created.
    - Follow **DaemonSet** or **Sidecar** Guide to deploy the log agent.

<!--eks-end-->

<!--syslog-start-->
### Syslog as Log Source

1. Sign in to the Log Hub Console.
2. In the left sidebar, under **Log Analytics Pipelines**, choose **Application Log**.
3. Click on the application pipeline that has been created during the **Prerequisites**.
4. Click the **Create an Ingestion** dropdown menu, and select **From Syslog**.
5. Fill in all the form fields to specify Syslog Source. You can use both UDP or TCP protocol with custom port number. Choose **Next**.
6. Select the log config created in previous setup, and choose **Next**.
7. Add tags as needed, then choose **Create** to finish creating an ingestion.
<!--syslog-end-->


[launch-template]: https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-launch-template.html#advanced-settings-for-your-launch-template
[launch-configuration]: https://docs.aws.amazon.com/autoscaling/ec2/userguide/change-launch-config.html