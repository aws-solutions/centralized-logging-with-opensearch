/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { aws_logs as logs } from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface CWLMetricProps {
  logGroup: logs.LogGroup;
  metricSourceType: string;
  stackPrefix: string;
}

export const enum MetricSourceType {
  FLUENT_BIT = 'FLUENT_BIT',
  LOG_PROCESSOR_SVC = 'LOG_PROCESSOR_SVC',
  LOG_PROCESSOR_WAF_SAMPLE = 'LOG_PROCESSOR_WAF_SAMPLE',
  LOG_PROCESSOR_APP = 'LOG_PROCESSOR_APP',
}

/**
 * Stack to handle OpenSearch related ops such as import dashboard, create index template and policy etc when stack started.
 */
export class CWLMetricStack extends Construct {
  constructor(scope: Construct, id: string, props: CWLMetricProps) {
    super(scope, id);

    // Create the CloudWatch Metrics for Service Log Processor
    if (props.metricSourceType == MetricSourceType.FLUENT_BIT) {
      // Create the CloudWatch Metrics for Fluent-bit Agent
      props.logGroup.addMetricFilter('FluentBitInputBytes', {
        metricNamespace: `Solution/${props.stackPrefix}/FluentBit`,
        metricName: 'InputBytes',
        metricValue: '$.value',
        filterPattern: logs.FilterPattern.stringValue(
          '$.metric',
          '=',
          'fluentbit_input_bytes_total'
        ),
        dimensions: { IngestionId: '$.plugin' },
      });

      props.logGroup.addMetricFilter('FluentBitInputRecords', {
        metricNamespace: `Solution/${props.stackPrefix}/FluentBit`,
        metricName: 'InputRecords',
        metricValue: '$.value',
        filterPattern: logs.FilterPattern.stringValue(
          '$.metric',
          '=',
          'fluentbit_input_records_total'
        ),
        dimensions: { IngestionId: '$.plugin' },
      });

      props.logGroup.addMetricFilter('FluentBitOutputProcBytes', {
        metricNamespace: `Solution/${props.stackPrefix}/FluentBit`,
        metricName: 'OutputProcBytes',
        metricValue: '$.value',
        filterPattern: logs.FilterPattern.stringValue(
          '$.metric',
          '=',
          'fluentbit_output_proc_bytes_total'
        ),
        dimensions: { IngestionId: '$.plugin' },
      });

      props.logGroup.addMetricFilter('FluentBitOutputProcRecords', {
        metricNamespace: `Solution/${props.stackPrefix}/FluentBit`,
        metricName: 'OutputProcRecords',
        metricValue: '$.value',
        filterPattern: logs.FilterPattern.stringValue(
          '$.metric',
          '=',
          'fluentbit_output_proc_records_total'
        ),
        dimensions: { IngestionId: '$.plugin' },
      });

      props.logGroup.addMetricFilter('FluentBitOutputDroppedRecords', {
        metricNamespace: `Solution/${props.stackPrefix}/FluentBit`,
        metricName: 'OutputDroppedRecords',
        metricValue: '$.value',
        filterPattern: logs.FilterPattern.stringValue(
          '$.metric',
          '=',
          'fluentbit_output_dropped_records_total'
        ),
        dimensions: { IngestionId: '$.plugin' },
      });

      props.logGroup.addMetricFilter('FluentBitOutputErrors', {
        metricNamespace: `Solution/${props.stackPrefix}/FluentBit`,
        metricName: 'OutputErrors',
        metricValue: '$.value',
        filterPattern: logs.FilterPattern.stringValue(
          '$.metric',
          '=',
          'fluentbit_output_errors_total'
        ),
        dimensions: { IngestionId: '$.plugin' },
      });

      props.logGroup.addMetricFilter('FluentBitOutputRetriedRecords', {
        metricNamespace: `Solution/${props.stackPrefix}/FluentBit`,
        metricName: 'OutputRetriedRecords',
        metricValue: '$.value',
        filterPattern: logs.FilterPattern.stringValue(
          '$.metric',
          '=',
          'fluentbit_output_retried_records_total'
        ),
        dimensions: { IngestionId: '$.plugin' },
      });

      props.logGroup.addMetricFilter('FluentBitOutputRetriesFailed', {
        metricNamespace: `Solution/${props.stackPrefix}/FluentBit`,
        metricName: 'OutputRetriesFailed',
        metricValue: '$.value',
        filterPattern: logs.FilterPattern.stringValue(
          '$.metric',
          '=',
          'fluentbit_output_retries_failed_total'
        ),
        dimensions: { IngestionId: '$.plugin' },
      });

      props.logGroup.addMetricFilter('FluentBitOutputRetries', {
        metricNamespace: `Solution/${props.stackPrefix}/FluentBit`,
        metricName: 'OutputRetries',
        metricValue: '$.value',
        filterPattern: logs.FilterPattern.stringValue(
          '$.metric',
          '=',
          'fluentbit_output_retries_total'
        ),
        dimensions: { IngestionId: '$.plugin' },
      });
    }
  }
}
