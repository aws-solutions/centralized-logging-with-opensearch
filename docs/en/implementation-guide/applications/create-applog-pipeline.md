
1. Sign in to the Log Hub Console.
2. In the left sidebar, under **Log Analytics Pipelines**, choose **Application Log**.
3. Click the **Create a pipeline**.
4. Specify **Index name** in lowercase.
5. In the **Buffer(Amazon Kinesis Data Streams)** section, specify the initial shard number.

    !!! important "Important"
        You may observe duplicated logs in OpenSearch if there is threshold error occurs in Kinesis Data Streams (KDS). This is because the Fluent Bit log agent uploads logs in [chunk](https://docs.fluentbit.io/manual/administration/buffering-and-storage#chunks-memory-filesystem-and-backpressure) (contains multiple records), and will retry the chunk if upload failed. Each
        KDS shard can support up to 1,000 records per second for writes, up to a maximum total data write rate of 1 MB per second. Please estimate your log volume and choose an appropriate shard number.

7. (Optional) Select **Yes** to enable auto scaling of the Kinesis Data Streams shards based on the input logs traffic by and specify maximum shard number. 
8. Choose **Next**.
9. In the **Specify OpenSearch domain** section, select an imported domain for **Amazon OpenSearch domain**.
10. In the **Log Lifecycle** section, input the number of days to manage the AOS index lifecycle. The Log Hub will create the associated [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) policy automatically for this pipeline.
11. Choose **Next**.
12. Add tags if needed.
13. Choose **Create**.
14. Wait for the application pipeline turning to "Active" state.