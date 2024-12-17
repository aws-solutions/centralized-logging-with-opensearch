/* eslint-disable */
/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import {
  aws_appsync as appsync,
  aws_ssm as ssm,
} from "aws-cdk-lib";


import { Construct, } from "constructs";

export interface FluentBitConfigStackProps {
  /**
   * Default Appsync GraphQL API for FluentBit configuration REST API Handler
   *
   * @default - None.
   */
  readonly graphqlApi: appsync.GraphqlApi;
  readonly solutionId: string;
  readonly stackPrefix: string;
}

/**
 * Stack to create FluentBit configuration.
 */
export class FluentBitConfigStack extends Construct {

  constructor(scope: Construct, id: string, props: FluentBitConfigStackProps) {
    super(scope, id);

    new ssm.StringParameter(this, "FlbLogLevelParameter", { //NOSONAR
      parameterName: `/${props.stackPrefix}/FLB/log_level`,
      description: "Set the logging verbosity level. Allowed values are: off, error, warn, info, debug and trace. Values are accumulative, e.g: if 'debug' is set, it will include error, warning, info and debug. Note that trace mode is only available if Fluent Bit was built with the WITH_TRACE option enabled.",
      stringValue: "Info",
    });
    new ssm.StringParameter(this, "FlbFlushParameter", { //NOSONAR
      parameterName: `/${props.stackPrefix}/FLB/flush`,
      description: "The engine loop uses a Flush timeout to define when is required to flush the records ingested by input plugins through the defined output plugins.",
      stringValue: "5",
      allowedPattern: '[1-9]+',
    });
    new ssm.StringParameter(this, "FlbMemBufLimitParameter", { //NOSONAR
      parameterName: `/${props.stackPrefix}/FLB/mem_buf_limit`,
      description: "This option is disabled by default and can be applied to all input plugins.",
      stringValue: "30M",
    });
    new ssm.StringParameter(this, "FlbBufferChunkSizeParameter", { //NOSONAR
      parameterName: `/${props.stackPrefix}/FLB/buffer_chunk_size`,
      description: "Set the initial buffer size to read files data. This value is used to increase buffer size.",
      stringValue: "512k",
    });
    new ssm.StringParameter(this, "FlbBufferMaxSizeParameter", { //NOSONAR
      parameterName: `/${props.stackPrefix}/FLB/buffer_max_size`,
      description: "Set the maximum size of buffer.",
      stringValue: "5M",
    });
    new ssm.StringParameter(this, "FlbBufferSizeParameter", { //NOSONAR
      parameterName: `/${props.stackPrefix}/FLB/buffer_size`,
      description: "Set the buffer size for HTTP client when reading responses from Kubernetes API server and the buffer size to read data in INPUT plugin. A value of 0 results in no limit, and the buffer will expand as-needed.",
      stringValue: "0",
    });
    new ssm.StringParameter(this, "FlbRetryLimitParameter", { //NOSONAR
      parameterName: `/${props.stackPrefix}/FLB/retry_limit`,
      description: "Integer value to set the maximum number of retries allowed. When Retry_Limit is set to False, means that there is not limit for the number of retries that the Scheduler can do.",
      stringValue: "3",
    });
    new ssm.StringParameter(this, "FlbStoreDirLimitSizeParameter", { //NOSONAR
      parameterName: `/${props.stackPrefix}/FLB/store_dir_limit_size`,
      description: "This parameter is only for using S3 bucket as data buffering. The size of the limitation for disk usage in S3. Limit the amount of s3 buffers in the store_dir to limit disk usage. 0, which means unlimited. Note: Use store_dir_limit_size instead of storage.total_limit_size which can be used to other plugins, because S3 has its own buffering system.",
      stringValue: "500M",
    });
    new ssm.StringParameter(this, "FlbStorageTypeParameter", { //NOSONAR
      parameterName: `/${props.stackPrefix}/FLB/storage_type`,
      description: "This parameter is to specifies the buffering mechanism to use. It can be memory or filesystem.",
      stringValue: "filesystem",
    });
    new ssm.StringParameter(this, "FlbStorePauseOnChunksOverlimitParameter", { //NOSONAR
      parameterName: `/${props.stackPrefix}/FLB/storage_pause_on_chunks_overlimit`,
      description: "This parameter is to specifies if file storage is to be paused when reaching the chunk limit. Default is off",
      stringValue: "off",
    });
    new ssm.StringParameter(this, "FlbStorageTotalLimitSizeParameter", { //NOSONAR
      parameterName: `/${props.stackPrefix}/FLB/storage_total_limit_size`,
      description: "This parameter is to limit the maximum number of Chunks in the filesystem for the current output logical destination. Default is 500M",
      stringValue: "500M",
    });




  }
}

