# Log Config

Centralized Logging with OpenSearch solution supports creating log configs for the following log formats:

- [JSON](#create-a-json-config)
- [Apache](#create-an-apache-http-server-log-config)
- [Nginx](#create-an-nginx-log-config)
- [Syslog](#create-a-syslog-config)
- [Single-ine text](#create-a-single-line-text-config)
- [Multi-line text](#create-a-multi-line-text-config)

For more information, refer to [supported log formats and log sources](./index.md#supported-log-formats-and-log-sources).

The following describes how to create log config for each log format.

## Create a JSON config

1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the left sidebar, under **Resources**, choose **Log Config**.
3. Choose **Create a log config**.
4. Specify **Config Name**.
5. Specify **Log Path**. You can use `,` to separate multiple paths.
6. Choose **JSON** in the log type dropdown list.
7. In the **Sample log parsing** section, paste a sample JSON log and click **Parse log** to verify if the log parsing is successful.

    For example:
    ```json
    {"host":"81.95.250.9", "user-identifier":"-", "time":"08/Mar/2022:06:28:03 +0000", "method": "PATCH", "request": "/clicks-and-mortar/24%2f7", "protocol":"HTTP/2.0", "status":502, "bytes":24337, "referer": "https://www.investorturn-key.net/functionalities/innovative/integrated"}
    ```

8. Check if each fields type mapping is correct. You can change the type by selecting the dropdown menu in the second column. For all supported types, see [Data Types](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/).

    !!! Note "Note"

        You must specify the datetime of the log using key “time”. If not specified, system time will be added.

9. Specify the **Time format**. The format syntax follows [strptime](https://linux.die.net/man/3/strptime). Check [this](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds) for details.

10. (Optional) In the **Filter** section, you add some conditions to filter logs at the log agent side. The solution will ingest logs that match ALL the specified conditions only.

11. Select **Create**.

## Create an Apache HTTP server log config

Apache HTTP Server (httpd) is capable of writing error and access log files to a local directory. You can configure Centralized Logging with OpenSearch to ingest Apache HTTP server logs. 

1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the left sidebar, under **Resources**, choose **Log Config**.
3. Click the **Create a log config** button.
4. Specify **Config Name**.
5. Specify **Log Path**. You can use `, ` to separate multiple paths.
6. Choose **Apache HTTP server** in the log type dropdown menu.
7. In the **Apache Log Format** section, paste your Apache HTTP server log format configuration. It is in the format of `/etc/httpd/conf/httpd.conf` and starts with `LogFormat`.

    For example:
    ```
    LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined
    ```

8. (Optional) In the **Sample log parsing** section, paste a sample Apache HTTP server log to verify if the log parsing is successful.

    For example:
    ```
    127.0.0.1 - - [22/Dec/2021:06:48:57 +0000] "GET /xxx HTTP/1.1" 404 196 "-" "curl/7.79.1"
    ```

9. Choose **Create**.

## Create an Nginx log config

1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the left sidebar, under **Resources**, choose **Log Config**.
3. Click the **Create a log config** button.
4. Specify **Config Name**.
5. Specify **Log Path**. You can use `, ` to separate multiple paths.
6. Choose **Nginx** in the log type dropdown menu.
7. In the **Nginx Log Format** section, paste your Nginx log format configuration. It is in the format of `/etc/nginx/nginx.conf` and starts with `log_format`.

    For example:
       ```
       log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
       '$status $body_bytes_sent "$http_referer" '
       '"$http_user_agent" "$http_x_forwarded_for"';
       ```

8. (Optional) In the **Sample log parsing** section, paste a sample Nginx log to verify if the log parsing is successful.

    For example:
       ```
       127.0.0.1 - - [24/Dec/2021:01:27:11 +0000] "GET / HTTP/1.1" 200 3520 "-" "curl/7.79.1" "-"
       ```

9. (Optional) In the **Filter** section, you add some conditions to filter logs at the log agent side. The solution will ingest logs that match ALL the specified conditions only. 

10. Select **Create**.

## Create a Syslog config

1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the left sidebar, under **Resources**, choose **Log Config**.
3. Click the **Create a log config** button.
4. Specify **Config Name**.
5. Choose **Syslog** in the log type dropdown menu. Note that Centralized Logging with OpenSearch also supports Syslog with JSON format and single-line text format.

### RFC5424
1. Paste a sample RFC5424 log. For example:

    ```log
    <35>1 2013-10-11T22:14:15Z client_machine su - - - 'su root' failed for joe on /dev/pts/2
    ```

2. Choose **Parse Log**.

3. Check if each fields type mapping is correct. You can change the type by selecting the dropdown menu in the second column. For all supported types, see [Data Types](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/).

    !!! Note "Note"
        You must specify the datetime of the log using key “time”. If not specified, system time will be added.

4. Specify the **Time format**. The format syntax follows [strptime](https://linux.die.net/man/3/strptime). Check [this manual](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds) for details. For example:

    ```log
    %Y-%m-%dT%H:%M:%SZ
    ```

5. (Optional) In the **Filter** section, you add some conditions to filter logs at the log agent side. The solution will ingest logs that match ALL the specified conditions only.

6. Select **Create**.

### RFC3164
1. Paste a sample RFC3164 log. For example:

    ```log
    <35>Oct 12 22:14:15 client_machine su: 'su root' failed for joe on /dev/pts/2
    ```

2. Choose **Parse Log**.

3. Check if each fields type mapping is correct. You can change the type by selecting the dropdown menu in the second column. For all supported types, see [Data Types](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/).

    !!! Note "Note"
        You must specify the datetime of the log using key “time”. If not specified, system time will be added.

        Since there is no year in the timestamp of RFC3164, it cannot be displayed as a time histogram in the Discover interface of Amazon OpenSearch.

4. Specify the **Time format**. The format syntax follows [strptime](https://linux.die.net/man/3/strptime). Check [this](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds) for details. For example:

    ```log
    %b %m %H:%M:%S
    ```

5. (Optional) In the **Filter** section, you add some conditions to filter logs at the log agent side. The solution will ingest logs that match ALL the specified conditions only.

6. Select **Create**.

### Custom
1. In the **Syslog Format** section, paste your Syslog log format configuration. It is in the format of `/etc/rsyslog.conf` and starts with `template` or `$template`. The format syntax follows [Syslog Message Format](https://www.rfc-editor.org/rfc/rfc5424?spm=a2c4g.11186623.0.0.21324a0fUixMd5#:~:text=2009%0A%0A%0A6.-,Syslog%20Message%20Format,-The%20syslog%20message).  For example:

    ```
    <%pri%>1 %timestamp:::date-rfc3339% %HOSTNAME% %app-name% %procid% %msgid% %msg%\n
    ```

2. In the **Sample log parsing** section, paste a sample Nginx log to verify if the log parsing is successful. For example:
    ```
    <35>1 2013-10-11T22:14:15.003Z client_machine su - - 'su root' failed for joe on /dev/pts/2
    ```

3. Check if each fields type mapping is correct. Change the type by selecting the dropdown menu in the second column. For all supported types, see [Data Types](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/).

    !!! Note "Note"

        You must specify the datetime of the log using key “time”. If not specified, system time will be added.

4. Specify the **Time format**. The format syntax follows [strptime](https://linux.die.net/man/3/strptime). Check [this manual](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds) for details.

5. (Optional) In the **Filter** section, you add some conditions to filter logs at the log agent side. The solution will ingest logs that match ALL the specified conditions only.

6. Select **Create**.

## Create a single-line text config

1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the left sidebar, under **Resources**, choose **Log Config**.
3. Click the **Create a log config** button.
4. Specify **Config Name**.
5. Specify **Log Path**. You can use `,` to separate multiple paths.
6. Choose **Single-line Text** in the log type dropdown menu.
7. Write the regular expression in [Rubular](https://rubular.com/) to validate first and enter the value. For example:

    ```
    (?<remote_addr>\S+)\s*-\s*(?<remote_user>\S+)\s*\[(?<time_local>\d+/\S+/\d+:\d+:\d+:\d+)\s+\S+\]\s*"(?<request_method>\S+)\s+(?<request_uri>\S+)\s+\S+"\s*(?<status>\S+)\s*(?<body_bytes_sent>\S+)\s*"(?<http_referer>[^"]*)"\s*"(?<http_user_agent>[^"]*)"\s*"(?<http_x_forwarded_for>[^"]*)".*
    ```
   
8. In the **Sample log parsing** section, paste a sample Single-line text log and click **Parse log** to verify if the log parsing is successful. For example:
   
    ```
    127.0.0.1 - - [24/Dec/2021:01:27:11 +0000] "GET / HTTP/1.1" 200 3520 "-" "curl/7.79.1" "-"
    ```

9. Check if each fields type mapping is correct. Change the type by selecting the dropdown menu in the second column. For all supported types, see [Data Types](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/). 

    !!! Note "Note"

        You must specify the datetime of the log using key “time”. If not specified, system time will be added.

10. Specify the **Time format**. The format syntax follows [strptime](https://linux.die.net/man/3/strptime). Check [this manual](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds) for details.

11. (Optional) In the **Filter** section, you add some conditions to filter logs at the log agent side. The solution will ingest logs that match ALL the specified conditions only.

12. Select **Create**.

## Create a multi-line text config

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
