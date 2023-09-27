# 日志配置

日志通支持为以下日志格式创建日志配置：

- JSON
- Apache
- Nginx
- Syslog
- Single-line text
- Multi-line text

欲了解更多信息，请参阅 [支持的日志格式和日志来源](./index.md#supported-log-formats-and-log-sources)。

下面介绍如何为每种日志格式创建日志配置。

## 创建一个 JSON 日志配置

1. 登录日志通控制台。
2. 在左侧边栏中的 **资源** 下，选择 **日志配置**。
3. 单击**创建日志配置**按钮。
4. 指定**配置名称**。
5. 指定**日志路径**。 您可以使用 `,` 分隔多个路径。
6. 在日志类型下拉列表中选择**JSON**。
7. 在**示例日志解析**部分，粘贴一个示例 JSON 日志，点击**解析日志**，验证日志解析是否成功。

    如:
    ```json
    {"host":"81.95.250.9", "user-identifier":"-", "time":"08/Mar/2022:06:28:03 +0000", "method": "PATCH", "request": "/clicks-and-mortar/24%2f7", "protocol":"HTTP/2.0", "status":502, "bytes":24337, "referer": "https://www.investorturn-key.net/functionalities/innovative/integrated"}
    ```

8. 检查每个字段类型映射是否正确。 您可以通过选择第二列中的下拉菜单来更改类型。 对于所有支持的类型，请参阅 [数据类型](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/)。

    !!! Note "注意"

        您必须使用键 `time` 指定日志的日期时间。 如果未指定，将添加系统时间。

9. 指定**时间格式**。 格式语法遵循 [strptime](https://linux.die.net/man/3/strptime)。 请参见[详情](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds) 。

10. （可选）在**过滤器**部分，您可以在日志代理端启用并添加一些条件来过滤日志。日志通解决方案将仅收集符合所有指定条件的日志。

11. 选择**创建**。

## 创建一个 Apache HTTP 服务器日志配置

Apache HTTP Server (httpd) 能够将错误和访问日志 文件写入本地目录。 您可以配置日志通摄取 Apache HTTP 服务器日志。

1. 登录日志通控制台。
2. 在左侧边栏中的 **资源** 下，选择 **日志配置**。
3. 单击**创建日志配置**按钮。
4. 指定**配置名称**。
5. 指定**日志路径**。 您可以使用 `, ` 分隔多个路径。
6. 在日志类型下拉菜单中选择**Apache HTTP 服务器**。
7. 在 **Apache Log Format** 部分，粘贴您的 Apache HTTP 服务器日志格式配置。 它的格式为`/etc/httpd/conf/httpd.conf`，以`LogFormat`开头。

    如:
    ```
    LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined
    ```

8. （可选）在 **示例日志解析** 部分，粘贴示例 Apache HTTP 服务器日志以验证日志解析是否成功。

    如:
    ```
    127.0.0.1 - - [22/Dec/2021:06:48:57 +0000] "GET /xxx HTTP/1.1" 404 196 "-" "curl/7.79.1"
    ```

9. 选择**创建**。

## 创建一个 Nginx 日志配置

1. 登录日志通控制台。
2. 在左侧边栏中的 **资源** 下，选择 **日志配置**。
3. 单击**创建日志配置**按钮。
4. 指定**配置名称**。
5. 指定**日志路径**。 您可以使用 `,` 分隔多个路径。
6. 在日志类型下拉菜单中选择**Nginx**。
7. 在**Nginx Log Format**部分，粘贴你的Nginx日志格式配置，格式为`/etc/nginx/nginx.conf`，以`log_format`开头。

    如:
       ```
       log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
       '$status $body_bytes_sent "$http_referer" '
       '"$http_user_agent" "$http_x_forwarded_for"';
       ```

8. （可选）在**示例日志解析**部分，粘贴一个Nginx示例日志以验证日志解析是否成功。

    如:
    ```
    127.0.0.1 - - [24/Dec/2021:01:27:11 +0000] "GET / HTTP/1.1" 200 3520 "-" "curl/7.79.1" "-"
    ```

9. （可选）在**过滤器**部分，您可以在日志代理端启用并添加一些条件来过滤日志。日志通解决方案将仅收集符合所有指定条件的日志。

10. 点击 **创建**。

## 创建一个 Syslog 日志配置

1. 登录日志通控制台。
2. 在左侧边栏中的 **资源** 下，选择 **日志配置**。
3. 单击**创建日志配置**按钮。
4. 指定**配置名称**。
6. 在日志类型下拉菜单中选择**Syslog**。日志通同时也支持JSON格式的或者单行文本格式的 Syslog。

### RFC5424
1. 粘贴示例 RFC5424 日志。 例如：

    ```log
    <35>1 2013-10-11T22:14:15Z client_machine su - - - 'su root' failed for joe on /dev/pts/2
    ```

2. 点击**解析日志**。

3. 检查每个字段类型映射是否正确。 通过选择第二列中的下拉菜单来更改类型。 对于所有支持的类型，请参阅 [数据类型](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/)。

    !!! Note "注意"
        您必须使用键 `time` 指定日志的日期时间。 如果未指定，将添加系统时间。

4. 指定**时间格式**。 格式语法遵循 [strptime](https://linux.die.net/man/3/strptime)。 请参见[详情](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds)。 
例如:

    ```log
    %Y-%m-%dT%H:%M:%SZ
    ```

5. （可选）在 **Filter** 部分，添加一些条件以在日志代理端过滤日志。该解决方案将仅摄入与所有指定条件匹配的日志。

6. 选择**创建**。

### RFC3164
1. 粘贴示例 RFC3164 日志。 例如：

    ```log
    <35>Oct 12 22:14:15 client_machine su: 'su root' failed for joe on /dev/pts/2
    ```

2. 点击**解析日志**。

3. 检查每个字段类型映射是否正确。 通过选择第二列中的下拉菜单来更改类型。 对于所有支持的类型，请参阅 [数据类型](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/)。

    !!! Note "注意"
        您必须使用键 `time` 指定日志的日期时间。 如果未指定，将添加系统时间。

        由于 RFC3164 的时间戳中没有年份，因此无法在 Amazon OpenSearch 的发现界面中显示为时间直方图。

4. 指定**时间格式**。 格式语法遵循 [strptime](https://linux.die.net/man/3/strptime)。 请参见[详情](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds)。 
例如:
    ```log
    %b %m %H:%M:%S
    ```

5. （可选）在 **Filter** 部分，添加一些条件以在日志代理端过滤日志。该解决方案将仅摄入与所有指定条件匹配的日志。

6. 选择**创建**。

### 自定义
1. 在 **Syslog Format** 部分，粘贴您的 Syslog 日志格式配置。 它的格式为`/etc/rsyslog.conf`，以`template`或`$template`开头。 格式语法遵循 [Syslog 消息格式](https://www.rfc-editor.org/rfc/rfc5424?spm=a2c4g.11186623.0.0.21324a0fUixMd5#:~:text=2009%0A%0A%0A6.-,Syslog%20Message%20Format,-The%20syslog%20message).  例如:

    ```
    <%pri%>1 %timestamp:::date-rfc3339% %HOSTNAME% %app-name% %procid% %msgid% %msg%\n
    ```

2. 在 **Sample log parsing** 部分，粘贴示例 Nginx 日志以验证日志解析是否成功。 例如：
    ```
    <35>1 2013-10-11T22:14:15.003Z client_machine su - - 'su root' failed for joe on /dev/pts/2
    ```

3. 检查每个字段类型映射是否正确。 通过选择第二列中的下拉菜单来更改类型。 对于所有支持的类型，请参阅 [数据类型](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/)。

    !!! Note "注意"
        您必须使用键 `time` 指定日志的日期时间。 如果未指定，将添加系统时间。

4. 指定**时间格式**。 格式语法遵循 [strptime](https://linux.die.net/man/3/strptime)。 请参见[详情](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds)。 

5. （可选）在 **Filter** 部分，添加一些条件以在日志代理端过滤日志。该解决方案将仅摄入与所有指定条件匹配的日志。

6. 选择**创建**。

## 创建一个单行文本日志配置

1. 登录日志通控制台。
2. 在左侧边栏中的 **资源** 下，选择 **日志配置**。
3. 单击**创建日志配置**按钮。
4. 指定**配置名称**。
5. 指定**日志路径**。 您可以使用 `,` 分隔多个路径。
6. 在日志类型下拉菜单中选择**单行文本**。
7. 在[Rubular](https://rubular.com/)中写正则表达式先验证并输入值。 例如：

    ```
    (?<remote_addr>\S+)\s*-\s*(?<remote_user>\S+)\s*\[(?<time_local>\d+/\S+/\d+:\d+:\d+:\d+)\s+\S+\]\s*"(?<request_method>\S+)\s+(?<request_uri>\S+)\s+\S+"\s*(?<status>\S+)\s*(?<body_bytes_sent>\S+)\s*"(?<http_referer>[^"]*)"\s*"(?<http_user_agent>[^"]*)"\s*"(?<http_x_forwarded_for>[^"]*)".*
    ```
   
8. 在**示例日志解析**部分，粘贴一个示例的单行文本日志，点击**解析日志**，验证日志解析是否成功。 例如： 

    ```
    127.0.0.1 - - [24/Dec/2021:01:27:11 +0000] "GET / HTTP/1.1" 200 3520 "-" "curl/7.79.1" "-"
    ```

9. 检查每个字段类型映射是否正确。 通过选择第二列中的下拉菜单来更改类型。 对于所有支持的类型，请参阅 [数据类型](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/)。

    !!! Note "说明"
        您必须使用键 `time` 指定日志的日期时间。 如果未指定，将添加系统时间。

10. 指定**时间格式**。 格式语法遵循 [strptime](https://linux.die.net/man/3/strptime)。 请参见[详情](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds)。 
11. （可选）在 **Filter** 部分，添加一些条件以在日志代理端过滤日志。该解决方案将仅摄入与所有指定条件匹配的日志。

12. 选择**创建**。

## 创建一个多行文本日志配置

1. 登录日志通控制台。
2. 在左侧边栏中的 **资源** 下，选择 **日志配置**。
3. 单击**创建日志配置**按钮。
4. 指定**配置名称**。
5. 指定**日志路径**。 您可以使用 `,` 分隔多个路径。
6. 在日志类型下拉菜单中选择**多行文本**。

### Java - Spring Boot

1. 对于Java Spring Boot 日志，您可以提供简单的日志格式。 例如：

    ```
    %d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger : %msg%n
    ```

2. 粘贴示例多行日志。 例如：

    ```log
    2022-02-18 10:32:26.400 ERROR [http-nio-8080-exec-1] org.apache.catalina.core.ContainerBase.[Tomcat].[localhost].[/].[dispatcherServlet] : Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed; nested exception is java.lang.ArithmeticException: / by zero] with root cause
    java.lang.ArithmeticException: / by zero
       at com.springexamples.demo.web.LoggerController.logs(LoggerController.java:22)
       at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
       at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke
    ```

3. 选择 **解析日志**。

4. 检查各个字段类型映射是否正确。 您可以通过选择第二列中的下拉菜单来更改类型。 对于所有支持的类型，请参阅 [数据类型](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/)。

    !!! Note "说明"
        您必须使用键 `time` 指定日志的日期时间。 如果未指定，将添加系统时间。

5. 指定**时间格式**。 格式语法遵循 [strptime](https://linux.die.net/man/3/strptime)。 请参见[详情](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds)。 

6. （可选）在**过滤器**部分，您可以在日志代理端启用并添加一些条件来过滤日志。日志通解决方案将仅收集符合所有指定条件的日志。

7. 选择**创建**。

### 自定义格式

1. 对于其他类型的日志，您可以指定第一行正则表达式模式。 例如：

    ```
    (?<time>\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2}:\d{2}.\d{3})\s*(?<message>goroutine\s*\d\s*\[.+\]:)
    ```

2. 粘贴示例多行日志。 例如：

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

3. 选择 **解析日志**。

4. 检查各个字段类型映射是否正确。 您可以通过选择第二列中的下拉菜单来更改类型。 对于所有支持的类型，请参阅 [数据类型](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/)。

    !!! Note "注意"
        您必须使用键 `time` 指定日志的日期时间。 如果未指定，将添加系统时间。

5. 指定**时间格式**。 格式语法遵循 [strptime](https://linux.die.net/man/3/strptime)。 请参见[详情](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds) 。

6. 选择**创建**。

