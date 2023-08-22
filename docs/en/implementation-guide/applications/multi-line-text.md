# Multi-line text

You can configure Centralized Logging with OpenSearch to ingest multi-line text logs. Currently, Centralized Logging with OpenSearch supports [Spring Boot](https://spring.io/projects/spring-boot)
style logs or customize the log format using [Regular Expression](https://rubular.com/).

## Prerequisites
{%
include-markdown "include-prerequisites.md"
%}

## Step 1: Create a Multi-line text config

1. Sign in to the Centralized Logging with OpenSearch Console.
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

6. (Optional) In the **Filter** section, you add some conditions to filter logs at the log agent side. The solution will ingest logs that match ALL the specified conditions only.

7. Select **Create**.

### Custom

1. For other kinds of logs, you could specify the first line regex pattern. For example:

    ```
    (?<time>\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2}:\d{2}.\d{3})\s*(?<message>goroutine\s*\d\s*\[.+\]:)
    ```

2. Paste a sample multi-line log. For example:

    ```log
    2023-07-12 10:32:26.400 goroutine 1 [chan receive]:
    runtime.gopark(0x4739b8, 0xc420024178, 0x46fcd7, 0xc, 0xc420028e17, 0x3)
      /usr/local/go/src/runtime/proc.go:280 +0x12c fp=0xc420053e30 sp=0xc420053e00 pc=0x42503c
    runtime.goparkunlock(0xc420024178, 0x46fcd7, 0xc, 0x1000f010040c217, 0x3)
      /usr/local/go/src/runtime/proc.go:286 +0x5e fp=0xc420053e70 sp=0xc420053e30 pc=0x42512e
    runtime.chanrecv(0xc420024120, 0x0, 0xc420053f01, 0x4512d8)
      /usr/local/go/src/runtime/chan.go:506 +0x304 fp=0xc420053f20 sp=0xc420053e70 pc=0x4046b4
    runtime.chanrecv1(0xc420024120, 0x0)
      /usr/local/go/src/runtime/chan.go:388 +0x2b fp=0xc420053f50 sp=0xc420053f20 pc=0x40439b
    main.main()
      foo.go:9 +0x6f fp=0xc420053f80 sp=0xc420053f50 pc=0x4512ef
    runtime.main()
      /usr/local/go/src/runtime/proc.go:185 +0x20d fp=0xc420053fe0 sp=0xc420053f80 pc=0x424bad
    runtime.goexit()
      /usr/local/go/src/runtime/asm_amd64.s:2337 +0x1 fp=0xc420053fe8 sp=0xc420053fe0 pc=0x44b4d1
    ```

3. Choose **Parse Log**.
4. Check if each field type mapping is correct. You can change the type by selecting the dropdown menu in the second column. For all supported types, see [Data Types](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/).

    !!! Note "Note"
        You must specify the datetime of the log using key “time”. If not specified, system time will be added.

5. (Optional) In the **Filter** section, you add some conditions to filter logs at the log agent side. The solution will ingest logs that match ALL the specified conditions only.

6. Select **Create**.

## Step 2: Create an application log ingestion

The steps are similar to creating an application log ingestion for single-line text. Refer to [Single-line text](./single-line-text.md#step-2-create-an-application-log-ingestion) for details.

!!! Note "Note"

      Currently, Centralized Logging with OpenSearch does not support collecting multi-line text logs from S3 Bucket as Log Source.


## Step 3: View logs in OpenSearch

1. Open OpenSearch console in your browser.
2. Create an Index Pattern
    {%
    include-markdown "../aws-services/include-index-pattern.md"
    %}
3. Go to **Discover** section in the left sidebar.
4. Change active index pattern to `<the application pipeline>-*`.





