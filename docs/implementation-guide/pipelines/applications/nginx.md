# Collect Nginx logs

Configure Log Hub to gather Nginx logs

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

### 2. Create a Nginx log config

1. Sign in to the Log Hub Console.
2. In the left sidebar, under **Resources**, choose **Log Config**.
3. Click the **Create a log config** button.
4. Specify **Config Name**.
5. Specify **Log Path** (Use ' , ' to separate multiple paths).
6. Choose **Nginx** in the log type dropdown menu.
7. In the **Nginx Log Format** section, paste your Nginx log format configuration. It's usually in `/etc/nginx/nginx.conf` and starts with `log_format`.

   For example:
   ```
   log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
   '$status $body_bytes_sent "$http_referer" '
   '"$http_user_agent" "$http_x_forwarded_for"';
   ```
8. (Optional) In the **Sample log parsing** section, you can paste a sample Nginx log to verify if the log parsing is successful.

   For example:
   ```
   127.0.0.1 - - [24/Dec/2021:01:27:11 +0000] "GET / HTTP/1.1" 200 3520 "-" "curl/7.79.1" "-"
   ```
9.  Click **Create**.

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

### 5. Check built-in Nginx dashboard in OpenSearch

For Nginx logs, Log Hub will create a built-in sample dashboard on behalf of you.

1. Open OpenSearch dashboard in your browser.
2. Go to **Dashboard** section in the left sidebar.
3. Find the dashboard which name starts with `<the application pipeline>`





