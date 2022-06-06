# 多行文本日志

您可以将 Log Hub 配置为摄取多行文本日志。 目前Log Hub支持[Spring Boot](https://spring.io/projects/spring-boot)
使用 [正则表达式](https://rubular.com/) 设置日志样式或自定义日志格式。

## Prerequisites
{%
include-markdown "include-prerequisites.md"
%}

## 步骤 1: 创建一个多行文本日志配置

1. 登录 Log Hub 控制台。
2. 在左侧边栏中的 **资源** 下，选择 **日志配置**。
3. 单击**创建日志配置**按钮。
4. 指定**配置名称**。
5. 指定**日志路径**。 您可以使用 `,` 分隔多个路径。
6. 在日志类型下拉菜单中选择**多行文本**。

### Java - Spring Boot

1. Java Spring Boot 日志，可以提供日志格式。 例如：

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

3. 选择 **解析日志**.

4. 检查各个字段类型映射是否正确。 您可以通过选择第二列中的下拉菜单来更改类型。 对于所有支持的类型，请参阅 [数据类型](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/)。

    !!! Note "Note"
        您必须使用键 `time` 指定日志的日期时间。 如果未指定，将添加系统时间。

5. 指定**时间格式**。 格式语法遵循 [strptime](https://linux.die.net/man/3/strptime)。 请参见[详情](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds)。 

6. 选择**创建**。


### 自定义格式

1. 对于其他类型的日志，您可以指定第一行正则表达式模式。 例如：

    ```
    (?<time>\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2}:\d{2}.\d{3})\s*(?<level>[\S]+)\s*\[(?<thread>.+)\]\s*(?<logger>\S+)\s*:\s*(?<message>[\s\S]+)
    ```

2. 粘贴示例多行日志。 例如：

    ```log
    2022-02-18 10:32:26.400 ERROR [http-nio-8080-exec-1] org.apache.catalina.core.ContainerBase.[Tomcat].[localhost].[/].[dispatcherServlet] : Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed; nested exception is java.lang.ArithmeticException: / by zero] with root cause
    java.lang.ArithmeticException: / by zero
       at com.springexamples.demo.web.LoggerController.logs(LoggerController.java:22)
       at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
       at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke
    ```

3. 选择 **解析日志**.

4. 检查各个字段类型映射是否正确。 您可以通过选择第二列中的下拉菜单来更改类型。 对于所有支持的类型，请参阅 [数据类型](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/)。

    !!! Note "说明"
        您必须使用键 `time` 指定日志的日期时间。 如果未指定，将添加系统时间。

5. 指定**时间格式**。 格式语法遵循 [strptime](https://linux.die.net/man/3/strptime)。 请参见[详情](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds) 。

6. 选择**创建**。

## 步骤 2: 创建一个日志摄入

创建步骤类似于为单行文本创建应用程序日志摄取。 有关详细信息，请参阅 [单行文本](./single-line-text.md)。

!!! Note "Note"

      目前，Log Hub 不支持从 S3 Bucket 收集多行文本日志作为日志源。


## 步骤 3: 在 OpenSearch 中查看您的日志

1. 在浏览器中打开 OpenSearch 控制台。
2. 转到左侧边栏中的**Discover**部分。
3. 将活动索引模式更改为 `<pipeline-index-prefix>-*`。





