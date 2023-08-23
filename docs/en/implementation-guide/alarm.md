There are different types of log alarms: log processor alarms, buffer layer alarms, and source alarms (only for application log pipeline). The alarms will be triggered when the defined condition is met.  

| Log alarm type                    | Log alarm condition                                                               | Description                                                                                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Log processor alarms                         | Error invocation # >= 10 for 5 minutes, 1 consecutive time    | When the number of log processor Lambda error calls is greater than or equal to 10 within 5 minutes (including 5 minutes), an email alarm will be triggered.                                                                                                     |
| Log processor alarms                         | Failed record # >= 1 for 1 minute, 1 consecutive time                                       | When the number of failed records is greater than or equal to 1 within a 1-minute window, an alarm will be triggered.         |
| Log processor alarms                         | Average execution duration in last 5 minutes >= 60000 milliseconds                                       | In the last 5 minutes, when the average execution time of log processor Lambda is greater than or equal to 60 seconds, an email alarm will be triggered.         |
| Buffer layer alarms                         | SQS Oldest Message Age >= 30 minutes                                        | When the age of the oldest SQS message is greater than or equal to 30 minutes, it means that the message has not been consumed for at least 30 minutes, an email alarm will be triggered.         |
| Source alarms (only for application log pipeline)                         | Fluent Bit output_retried_record_total >= 100 for last 5 minutes                                        | When the total number of retry records output by Fluent Bit in the past 5 minutes is greater than or equal to 100, an email alarm will be triggered.        |  

You can choose to enable log alarms or disable them according to your needs.

## Enable log alarms

1. Sign in to the Centralized Logging with OpenSearch console.

2. In the left navigation bar, under **Log Analytics Pipelines**, choose **AWS Service Log** or **Application Log**.

3. Select the log pipeline created and choose **View details**.

4. Select the **Alarm** tab.

5. Switch on **Alarms** if needed and select an exiting SNS topic.

6. If you choose **Create a new SNS topic**, you need to provide email address for the newly-created SNS topic to notify.

## Disable log alarms

1. Sign in to the Centralized Logging with OpenSearch console.

2. In the left navigation bar, under **Log Analytics Pipelines**, choose **AWS Service Log** or **Application Log**.

3. Select the log pipeline created and choose **View details**.

4. Select the **Alarm** tab.

5. Switch off **Alarms**.