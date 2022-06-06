# Multi-line Text

You can configure Log Hub to ingest multi-line text logs. Currently, Log Hub supports [Spring Boot](https://spring.io/projects/spring-boot) 
style logs or customize the log format using [Regular Expression](https://rubular.com/).

## Prerequisites
{%
include-markdown "include-prerequisites.md"
%}

## Step 1: Create a Multi-line text config

1. Sign in to the Log Hub Console.
2. In the left sidebar, under **Resources**, choose **Log Config**.
3. Click the **Create a log config** button.
4. Specify **Config Name**.
5. Specify **Log Path**. You can use `,` to separate multiple paths.
6. Choose **Multi-line Text** in the log type dropdown menu.

### Java - Spring Boot

1. For Java Spring Boot logs, you could provide a simple log format. For example:

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

3. Choose **Parse Log**.

4. Check if each fields type mapping is correct. You can change the type by selecting the dropdown menu in the second column. For all supported types, see [Data Types](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/).

    !!! Note "Note"
        You must specify the datetime of the log using key “time”. If not specified, system time will be added.

5. Specify the **Time format**. The format syntax follows [strptime](https://linux.die.net/man/3/strptime). Check [this](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds) for details.

6. Choose **Create** to finish log config creation.

### Custom

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

3. Choose **Parse Log**.
4. Check if each fields type mapping are correct. You can change the type by selecting the dropdown menu in the second column. For all supported types, see [Data Types](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/).

    !!! Note "Note"
        You must specify the datetime of the log using key “time”. If not specified, system time will be added.

5. Choose **Create** to finish log config creation.

## Step 2: Create an application log ingestion

The steps are similar to creating an application log ingestion for single-line text. Refer to [Single-line Text](./single-line-text.md) for details.

!!! Note "Note"

      Currently, Log Hub does not support collect Multi-line text logs from S3 Bucket as Log Source.


## Step 3: View logs in OpenSearch

1. Open OpenSearch console in your browser.
2. Go to **Discover** section in the left sidebar.
3. Change active index pattern to `<the application pipeline>-*`.





