# Light Engine

[![arch-light-engine]][arch-light-engine]
_Light Engine architecture_

## Main components

1. Log Processor
    1. Process raw log files stored on S3 in batches, and transform to Apache Parquet
    2. Automatically partition all incoming data by time and region etc.
    3. When the task is executed, only the metrics of the data in the current S3 bucket are calculated
    4. Save data processing logs, and trigger notifications when task execution fails
    5. Each Pipeline/Ingestion corresponds to an Amazon EventBridge rule to periodically trigger log processor, for instance, every 5 minutes rate.

2. Log Merger
    1. Merge small files into files of a specified size, reduce the number of files, and reduce data storage
    2. Optimize the partition granularity and update the Glue Data Catalog to reduce the number of partitions
    3. Logging data processing logs, and send email notifications when task execution fails
    4. Each pipeline corresponds to an Amazon EventBridge rule to periodically trigger log merger, for instance, every day at 1 am.

3. Log Archive
    1. Move the expired data in Centralized to archived until the lifecycle rule deletes the file
    2. Update Glue data catalog and delete expired table partitions
    3. Logging data processing logs, and send email notifications when task execution fails
    4. Each pipeline corresponds to an Amazon EventBridge rule to periodically trigger log archive, for instance, every day at 1 am.

[arch-light-engine]: ../../images/architecture/arch-light-engine.svg