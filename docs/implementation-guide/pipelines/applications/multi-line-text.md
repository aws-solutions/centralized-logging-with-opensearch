# Collect Multi-line text logs

Configure Log Hub to gather Multi-line text logs

## Prerequisites

1. Already imported an existing OpenSearch domain

## Setup

### 1. Create an instance group

1. Sign in to the Log Hub Console.
2. In the left sidebar, under **Resources**, choose **Instance Group**.
3. Click the **Create an instance group** button.
4. In the **Settings** section, specify a group name.
5. In the **Instance** section, select the instance from which you want to collect logs.
6. Make sure all the slected instances "Pending Status" is **Online**.
7. (Optional) If the slected instances "Pending Status" are empty. Click the **Install log agent** button and wait for "Pending Status" to be **Online**.
8. Click **Create** button.

### 2. Create a Multi-line text config

1. Sign in to the Log Hub Console.
2. In the left sidebar, under **Resources**, choose **Log Config**.
3. Click the **Create a log config** button.
4. Specify **Config Name**.
5. Specify **Log Path** (Use ' , ' to separate multiple paths).
6. Choose **Multi-line Text** in the log type dropdown menu.
#### 2.1 Java-Spring Boot

1. For Java Spring Boot log, you could simpily provide a log format. For example:

   ```
   %d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n
   ```

2. Paste a sample multi-line log. For example:

   ```log
   2022-02-18 10:32:26.400 ERROR [http-nio-8080-exec-1] org.apache.catalina.core.ContainerBase.[Tomcat].[localhost].[/].[dispatcherServlet] : Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed; nested exception is java.lang.ArithmeticException: / by zero] with root cause
   java.lang.ArithmeticException: / by zero
      at com.springexamples.demo.web.LoggerController.logs(LoggerController.java:22)
      at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
      at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke
   ```

3. Click **Parse Log**.
4. Check if each fields type mapping are correct, you could change the type by selecting the dropdown menu in the 2nd column. (Check all supported types at https://opensearch.org/docs/latest/search-plugins/sql/datatypes/)

!!! Note "Notice"

     You must specify the datetime of the log using key “time”. If not specified, system time will be added.

5. Specify the **Time format**. The format synatx follows [strptime](https://linux.die.net/man/3/strptime). Check [this](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds) for details.

#### 2.2 Custom

1. For other kinds of logs, you could specify the first line regex pattern. For example:

   ```
   (?<time>\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2}:\d{2}.\d{3})\s*(?<level>[\S]+)\s*\[(?<thread>.+)\]\s*(?<logger>\S+)\s*:\s*(?<message>[\s\S]+)
   ```

2. Paste a sample multi-line log. For example:

   ```log
   2022-02-18 10:32:26.400 ERROR [http-nio-8080-exec-1] org.apache.catalina.core.ContainerBase.[Tomcat].[localhost].[/].[dispatcherServlet] : Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed; nested exception is java.lang.ArithmeticException: / by zero] with root cause
   java.lang.ArithmeticException: / by zero
      at com.springexamples.demo.web.LoggerController.logs(LoggerController.java:22)
      at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
      at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke
   ```

3. Click **Parse Log**.
4. Check if each fields type mapping are correct, you could change the type by selecting the dropdown menu in the 2nd column. (Check all supported types at https://opensearch.org/docs/latest/search-plugins/sql/datatypes/)

!!! Note "Notice"

     You must specify the datetime of the log using key “time”. If not specified, system time will be added.

Click **Create** to finish log config creation.

### 3. Create an application pipeline

1. Sign in to the Log Hub Console.
2. In the left sidebar, under **Log Analytics Pipelines**, choose **Application Log**.
3. Click the **Create a pipeline**.
4. Specify **Index name** in lowercase.
5. In the **Buffer(Amazon Kinesis Data Streams)** section, specify the initial shard number.
6. (Optional) You can enable auto scaling of the Kinesis Data Streams shards based on the input logs traffic by selecting **Yes** and specify maximum shard number. If you don't need this function just select **No**.
7. Choose **Next**.
8. In the **Specify OpenSearch domain** section, select an imported domain for **Amazon OpenSearch domain**.
9. In the **Log Lifecycle** section, input the number of days to manage the AOS index lifecycle. The Log Hub will create the associated [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) policy automatically for this pipeline.
10. Choose **Next**.
11. Add tags if needed.
12. Choose **Create**.

### 4. Create an application log ingestion

Once an application pipeline is created.

1. Sign in to the Log Hub Console.
2. In the left sidebar, under **Log Analytics Pipelines**, choose **Application Log**.
3. Click on the application pipeline that has been created in the "Active" state.
4. Go to **Permission** tab and copy the provided JSON policy
   1. Go back to **AWS Console > IAM > Policies** on the left column.
   2. Click **Create Policy**, choose **JSON** and replace all the content inside the text block. Remember to substitute `<YOUR ACCOUNT ID>` with your account id!
   3. Click **Next**, **Next**, then type in the name for this policy. For example: **`loghub-ec2-policy`**.
   4. Attach the policy to your EC2 instances role to allow the log agent have permissions to send logs to the application log pipeline.
5. Click **Create an Ingestion**, select **Choose exists**, click **Next**.
6. Select the instance group you have just created and click **Next**.
7. Select **Choose exists** and  choose **spring-config**. The rest parameters will be auto filled for you.
8. Click **Next**, then click **Create**.

Now we have finished all the configuration.

### 5. Discover your logs in OpenSearch

1. Open OpenSearch console in your browser.
2. Go to **Discover** section in the left sidebar.
3. Change active index pattern to `<the application pipeline>-*`.





