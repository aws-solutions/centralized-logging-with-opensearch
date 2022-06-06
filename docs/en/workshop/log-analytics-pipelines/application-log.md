# Ingest Application Logs via Log Hub Console
> Estimated time: 10 minutes

Log Hub supports ingest AWS Service logs and application (e.g. [Nginx][nginx], [Apache HTTP Server][apache]) logs. 
This section will guide you to ingest the access logs of a group of Spring Boot servers which you have deployed in [Deploy Demo Web Site](../deployment/deploy-demo-web-site.md).

In this section, you will learn how to install log agents on selected instances, define log format and ingest logs on a single web console. The following is the architecture diagram.
![](../../images/log%20analytics%20pipeline%20-%20application.png)


## Create application log pipeline

1. Go to **LogHub Web Console**, choose **Application Log** in **Log Analytics Pipelines** section
    ![](../../images/workshop/create-application-log.png)

2. Click **Create a pipeline** and type in the following parameters:
    * Index name: **`app-pipe`**
    * Shard number: **`2`**
    * Enable auto scaling?: **`No`**
    ![APP Log 1](../../images/workshop/app-log-ingest-setting.png)
3. Click **Next**, and choose the AOS domain as **workshop-os**, remain other parameters and select **Next**, then **Create**     
4. Then you can see the pipeline is in **Creating** status.

## Create EC2 policy
If we want to enable servers to be able to stream logs to kinesis, EC2 policies are needed! So let's do some quick steps and create a new EC2 policy for your Demo Website spring servers.

!!! Warning "Warning"
     Please wait until the application pipeline status changes to **`Active`**!

![](../../images/workshop/create-policy.png)

1. On the **Log Hub Console**, select the pipeline name and view the details of that log pipeline

2. Go to **Permission** tab and copy the provided JSON policy
![](../../images/workshop/copy-policy.png)

3. Go to [**AWS Console > IAM > Policies**](https://console.aws.amazon.com/iamv2/home#/policies){target="_blank"} on the left column

5. Click **Create Policy**, choose **JSON** and replace all the content inside the text block.
Remember to substitute `<YOUR ACCOUNT ID>` with your true account id! Please refer to the graph below:
![](../../images/workshop/policy-edit.png)

6. Click **Next**, **Next**, then type in the name for this policy, example name: **`loghub-ec2-policy`** 

7. Choose **Create policy**

8. Go to <a href="https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#Instances:" target="_blank">**AWS Console > EC2**</a>, choose one of the instance which name is **`LoghubWorkshop/workshopASG`**, select **Security** tab and click the **IAM Role** link

9. Click **Add permissions > Attach policies**, and attach that newly created policy to this role

## Create Instance Group
1. Go to **LogHub Web Console**, choose **Instance Group** on the left side of the page

2. Click **Create an instance group**, now you can see two instances on the list:

!!! Note "Note"
     All the instances with ssm agent will come up in this list, if there are non-relevant instances, please search for **Instances ID** in <a href="https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#Instances:" target="_blank">AWS Console</a> first. Choosing the wrong instances might cause no data in dashboard.

![](../../images/workshop/instance-group-install.png)
3. Select both of the instances and click **Install log agent**, the agent installation process will start. We use fluent-bit as log agent in LogHub. Please wait until the installation complete, it will show **Online** in **Pending Status** column:
![](../../images/workshop/instance-group-installed.png)
4. Then we can type in the name for instance group  and click **Create**. 

The instance group is successfully created.

## Create Spring log config

1. Go to **Log Hub Console**, choose **Log Config** on the left most side of the page

2. Click **Create a log config**, type in the **Config Name** like: `spring-config`.

3. Type in the following log path:
```
/tmp/springboot-sf4j-logback.log
```
     And choose the log type as **`Multi-line Text`**.

     Choose the Parser as **`Java-Spring Boot`**.

4. Copy paste the following log format in **Log Format** text box: 
```
%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n
```

5. Copy and paste the following sample log into the **Sample Log** box:
     ```
     2022-02-18 10:32:26.400 ERROR [http-nio-8080-exec-1] org.apache.catalina.core.ContainerBase.[Tomcat].[localhost].[/].[dispatcherServlet] : Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed; nested exception is java.lang.ArithmeticException: / by zero] with root cause
     java.lang.ArithmeticException: / by zero
          at com.springexamples.demo.web.LoggerController.logs(LoggerController.java:22)
          at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
          at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke
     ```
     Click **Parse Log**, you can see the following attributes:
     ![](../../images/workshop/parse-log-2.png)

     This means that your sample logs has been successfully parsed base on input log format.

5. Click **Save**.

We have successfully created a multi-line Spring Boot log config.

## Create log ingestion

!!! Note "Note"

     Please make sure the application log pipeline is in **Active** status, before proceeding this section.

1. Find the application log pipeline you just created, by clicking it's name, we can enter the detailed page:
![](../../images/workshop/create-ingestion.png)

2. Click **Create an Ingestion**, choose **From Instance Group**. Then, select **Choose exists**, click **Next**

3. Select the instance group you have just created and click **Next**

4. Select **Choose exists** and  choose **spring-config**. The rest parameters will be auto filled for you.

5. Click **Next**, then click **Create**

We have successfully created one ingestion for Spring Boot Logs.

[nginx]:https://www.nginx.com/
[apache]:https://httpd.apache.org/

## Create Spring Boot Multi-line Logs

Let's go back to your Workshop Demo Website again, go to the detail page of Funny Moto.
![](../../images/workshop/moto-detail.png)

1. Click **Add To Cart** button.

2. Status Code 500 will show up, that's what we expected:
![](../../images/workshop/500.png)
We are generating Spring Boot exceptions in the back-end server.

You can do these two steps multiple times to create more java multi-line logs.

## View Application Log Dashboard

We have created Spring Boot application log Pipeline, now let's go back to the OpenSearch Dashboard and have a look!

1. Open the Dashboard page in your browser.

2. Create Index Pattern

     Go to the location shown in the graph below and select **Stack Management**:
     ![](../../images/workshop/stack-management.png)

     Select **Index Patterns**:
     ![](../../images/workshop/index-patterns.png)

     Select **Create Index Pattern**:
     ![](../../images/workshop/create-index-pattern.png)

     Type in `app-pipe-*` and click **Next step >**:
     ![](../../images/workshop/define-index-pattern.png)

     Select **time** as time field and click **Create index pattern**:
     ![](../../images/workshop/select-time-field.png)

3. Go to the location shown in the graph below:
     ![](../../images/workshop/discover.png)

     Click **app-pipe** at the location below:
     ![](../../images/workshop/app-pipe.png)

4. You can find the original Spring boot logs:

     ![](../../images/workshop/multi-line.png)


We have completed all the steps of creating an application log pipeline.