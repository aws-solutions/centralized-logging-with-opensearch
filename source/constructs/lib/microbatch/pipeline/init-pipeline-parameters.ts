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

import { CfnParameter, ITemplateOptions } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface InitLogPipelineCfnParametersProps {
  readonly sourceType: string;
  readonly templateOptions: ITemplateOptions;
  readonly addEnrichmentPlugins?: boolean;
}

export class InitLogPipelineCfnParameters extends Construct {
  readonly sourceType: string;
  readonly pipelineId: string;
  readonly stagingBucketPrefix: string;
  readonly sourceSchema: string;
  readonly sourceDataFormat: string;
  readonly sourceTableProperties: string;
  readonly sourceSerializationProperties: string;
  readonly centralizedTableName: string;
  readonly centralizedBucketName: string;
  readonly centralizedBucketPrefix: string;
  readonly centralizedTableSchema: string;
  readonly centralizedMetricsTableName: string;
  readonly centralizedMetricsTableSchema: string;
  readonly enrichmentPlugins: string;
  readonly logProcessorSchedule: string;
  readonly logMergerSchedule: string;
  readonly logArchiveSchedule: string;
  readonly logMergerAge: number;
  readonly logArchiveAge: number;
  readonly notificationService: string;
  readonly recipients: string;
  readonly memberAccountRoleArn: string;
  readonly importDashboards: string;
  readonly grafanaUrl: string;
  readonly grafanaToken: string;

  readonly paramGroups: any[] = [];
  readonly paramLabels: any = {};

  constructor(
    scope: Construct,
    id: string,
    props: InitLogPipelineCfnParametersProps
  ) {
    super(scope, id);
    const { addEnrichmentPlugins = false, templateOptions, sourceType } = props;
    let stagingBucketPrefixDefaultValue: string = 'Logs';
    let centralizedTableNameDefaultValue: string = 'Logs';
    this.pipelineId = '151fec73-193b-4866-8b9c-ac9fc6cea3e7';

    switch (sourceType) {
      case 'waf': {
        this.pipelineId = 'bf412f36-d95b-4b80-bcc6-29e775208d2a';
        stagingBucketPrefixDefaultValue = 'AWSLogs/Waf';
        centralizedTableNameDefaultValue = 'waf';
        break;
      }
      case 'alb': {
        this.pipelineId = '2b3c5732-e267-418e-83c9-1c6095e8818c';
        stagingBucketPrefixDefaultValue = 'ALBLogs';
        centralizedTableNameDefaultValue = 'alb';
        break;
      }
      case 'cloudfront': {
        this.pipelineId = 'e41275c0-258f-4f82-994f-ef4c65760e67';
        stagingBucketPrefixDefaultValue = 'AWSLogs/CloudFront';
        centralizedTableNameDefaultValue = 'cloudfront';
        break;
      }
      case 'cloudtrail': {
        this.pipelineId = '3ec3a8db-56c0-421b-9cd6-b7199b763800';
        stagingBucketPrefixDefaultValue = 'AWSLogs/CloudTrail';
        centralizedTableNameDefaultValue = 'cloudtrail';
        break;
      }
      case 'vpcflow': {
        this.pipelineId = '9734ea3f-64ba-4427-a0bf-9cfa90d5f50f';
        stagingBucketPrefixDefaultValue = 'VPCFlowLogs';
        centralizedTableNameDefaultValue = 'vpcflow';
        break;
      }
      case 'rds': {
        this.pipelineId = '2e981437-574e-4995-b27c-c61c11927232';
        stagingBucketPrefixDefaultValue = 'AWSLogs/RDS';
        centralizedTableNameDefaultValue = 'rds';
        break;
      }
      case 's3a': {
        this.pipelineId = '8dc71f7e-2317-45e7-8881-08e342f8f1de';
        stagingBucketPrefixDefaultValue = 'AWSLogs/S3AccessLogs';
        centralizedTableNameDefaultValue = 's3';
        break;
      }
      case 'ses': {
        this.pipelineId = 'ab3d8adc-be9d-4356-9fcc-aec4752c9947';
        stagingBucketPrefixDefaultValue = 'AWSLogs/SESLogs';
        centralizedTableNameDefaultValue = 'ses';
        break;
      }
      case 'fluent-bit': {
        this.pipelineId = '423a6ac4-86f5-4420-9329-5aebc9c71756';
        stagingBucketPrefixDefaultValue = `ApplicationLogs/fluent-bit/${this.pipelineId}`;
        centralizedTableNameDefaultValue = 'application';
        break;
      }
      case 's3': {
        this.pipelineId = 'ed8db3be-22c9-422f-8b40-b278675ab840';
        stagingBucketPrefixDefaultValue = `ApplicationLogs/s3/${this.pipelineId}`;
        centralizedTableNameDefaultValue = 'application';
        break;
      }
    }

    const pipelineIdParameter = new CfnParameter(this, 'pipelineId', {
      type: 'String',
      default: this.pipelineId,
      minLength: 1,
      description: 'A unique identifier for the pipeline.',
    });

    pipelineIdParameter.overrideLogicalId('pipelineId');
    this.paramLabels[pipelineIdParameter.logicalId] = {
      default: 'Pipeline Id',
    };

    const stagingBucketPrefixParameter = new CfnParameter(
      this,
      'stagingBucketPrefix',
      {
        type: 'String',
        default: stagingBucketPrefixDefaultValue,
        minLength: 1,
        description:
          'You can specify a custom prefix that raw logs delivers to staging Bucket, e.g. AWSLogs/123456789012/WAFLogs/.',
      }
    );

    stagingBucketPrefixParameter.overrideLogicalId('stagingBucketPrefix');
    this.paramLabels[stagingBucketPrefixParameter.logicalId] = {
      default: 'Staging Bucket Prefix',
    };

    this.paramGroups.push({
      Label: { default: 'Pipeline settings' },
      Parameters: [
        pipelineIdParameter.logicalId,
        stagingBucketPrefixParameter.logicalId,
      ],
    });

    // Source Settings
    let sourceSchemaParameter: CfnParameter | undefined;
    let sourceDataFormatParameter: CfnParameter | undefined;
    let sourceTablePropertiesParameter: CfnParameter | undefined;
    let sourceSerializationPropertiesParameter: CfnParameter | undefined;

    if (['fluent-bit', 's3'].includes(sourceType)) {
      sourceSchemaParameter = new CfnParameter(this, 'sourceSchema', {
        type: 'String',
        description:
          'A JSON Schema used to validate the structure of JSON data. e.g. {"type": "object", "properties": {"host": {"type": "string"}}}, for more information, you can see http://json-schema.org/understanding-json-schema/.',
      });

      sourceSchemaParameter.overrideLogicalId('sourceSchema');
      this.paramLabels[sourceSchemaParameter.logicalId] = {
        default: 'Source Schema',
      };

      if (sourceType == 's3') {
        sourceDataFormatParameter = new CfnParameter(this, 'sourceDataFormat', {
          type: 'String',
          default: 'Json',
          allowedValues: [
            'Avro',
            'CloudTrailLogs',
            'CSV',
            'Json',
            'ORC',
            'Parquet',
            'TSV',
            'Regex',
          ],
          description: 'The data format of raw log.',
        });

        sourceDataFormatParameter.overrideLogicalId('sourceDataFormat');
        this.paramLabels[sourceDataFormatParameter.logicalId] = {
          default: 'Source Data Format',
        };
      }

      sourceTablePropertiesParameter = new CfnParameter(
        this,
        'sourceTableProperties',
        {
          type: 'String',
          default: '{}',
          minLength: 2,
          description:
            'The TBLPROPERTIES of raw log table in json format. Defaults to {}. e.g. {"skip.header.line.count":"2"}. For more information, you can see https://docs.aws.amazon.com/athena/latest/ug/alter-table-set-tblproperties.html.',
        }
      );

      sourceTablePropertiesParameter.overrideLogicalId('sourceTableProperties');
      this.paramLabels[sourceTablePropertiesParameter.logicalId] = {
        default: 'Source Table Properties',
      };

      sourceSerializationPropertiesParameter = new CfnParameter(
        this,
        'sourceSerializationProperties',
        {
          type: 'String',
          default: '{}',
          minLength: 2,
          description:
            'The SERDEPROPERTIE of raw log table in json format. Defaults to {}. e.g. {"input.regex":"([^ ]*) ([^ ]*) ([^ ]*)"}. For more information, you can see https://docs.aws.amazon.com/athena/latest/ug/serde-about.html.',
        }
      );

      sourceSerializationPropertiesParameter.overrideLogicalId(
        'sourceSerializationProperties'
      );
      this.paramLabels[sourceSerializationPropertiesParameter.logicalId] = {
        default: 'Source Serialization Properties',
      };

      this.paramGroups.push({
        Label: { default: 'Source settings' },
        Parameters: [
          sourceSchemaParameter.logicalId,
          sourceDataFormatParameter?.logicalId,
          sourceTablePropertiesParameter.logicalId,
          sourceSerializationPropertiesParameter.logicalId,
        ].filter((item) => item !== undefined),
      });
    }

    // Destination Settings
    const centralizedBucketNameParameter = new CfnParameter(
      this,
      'CentralizedBucketName',
      {
        type: 'String',
        minLength: 1,
        description: 'The name of the S3 bucket where the data is stored.',
      }
    );

    centralizedBucketNameParameter.overrideLogicalId('centralizedBucketName');
    this.paramLabels[centralizedBucketNameParameter.logicalId] = {
      default: 'Centralized Bucket Name',
    };

    const centralizedBucketPrefixParameter = new CfnParameter(
      this,
      'centralizedBucketPrefix',
      {
        type: 'String',
        default: 'datalake',
        minLength: 1,
        description:
          'You can specify an S3 bucket prefix as prefix for database location, e.g. datalake, the database location is datalake/{databae name}.',
      }
    );

    centralizedBucketPrefixParameter.overrideLogicalId(
      'centralizedBucketPrefix'
    );
    this.paramLabels[centralizedBucketPrefixParameter.logicalId] = {
      default: 'Centralized Bucket Prefix',
    };

    const centralizedTableNameParameter = new CfnParameter(
      this,
      'centralizedTableName',
      {
        type: 'String',
        default: centralizedTableNameDefaultValue,
        minLength: 1,
        description:
          'The name of the table used to store data in centralized database.',
      }
    );

    centralizedTableNameParameter.overrideLogicalId('centralizedTableName');
    this.paramLabels[centralizedTableNameParameter.logicalId] = {
      default: 'Centralized Table Name',
    };

    let enrichmentPluginsParameter: CfnParameter | undefined;

    if (addEnrichmentPlugins) {
      enrichmentPluginsParameter = new CfnParameter(this, 'enrichmentPlugins', {
        type: 'String',
        default: '',
        allowedValues: ['', 'geo_ip', 'user_agent', 'geo_ip,user_agent'],
        description:
          'Enrich the logs with additional information. For example, geo_ip will appended country, city, longitude, latitude, user_agent will appended browser, os and etc.',
      });

      enrichmentPluginsParameter.overrideLogicalId('enrichmentPlugins');
      this.paramLabels[enrichmentPluginsParameter.logicalId] = {
        default: 'Enrichment Plugins',
      };
    }

    let centralizedTableSchemaParameter: CfnParameter | undefined;
    let centralizedMetricsTableNameParameter: CfnParameter | undefined;
    let centralizedMetricsTableSchemaParameter: CfnParameter | undefined;

    if (['fluent-bit', 's3'].includes(sourceType)) {
      centralizedTableSchemaParameter = new CfnParameter(
        this,
        'centralizedTableSchema',
        {
          type: 'String',
          default: '{}',
          minLength: 2,
          description:
            'A JSON Schema used to describe the structure of centralized table. e.g. {"type": "object", "properties": {"host": {"type": "string"}}}, for more information, you can see http://json-schema.org/understanding-json-schema/.',
        }
      );

      centralizedTableSchemaParameter.overrideLogicalId(
        'centralizedTableSchema'
      );
      this.paramLabels[centralizedTableSchemaParameter.logicalId] = {
        default: 'Centralized Table Schema',
      };

      centralizedMetricsTableNameParameter = new CfnParameter(
        this,
        'centralizedMetricsTableName',
        {
          type: 'String',
          default: '',
          description:
            'The name of the table used to store metrics data in centralized database.',
        }
      );

      centralizedMetricsTableNameParameter.overrideLogicalId(
        'centralizedMetricsTableName'
      );
      this.paramLabels[centralizedMetricsTableNameParameter.logicalId] = {
        default: 'Centralized Metrics Table Name',
      };

      centralizedMetricsTableSchemaParameter = new CfnParameter(
        this,
        'centralizedMetricsTableSchema',
        {
          type: 'String',
          default: '{}',
          minLength: 2,
          description:
            'A JSON Schema used to describe the structure of metrics table in centralized database. e.g. {"type": "object", "properties": {"host": {"type": "string"}}}, for more information, you can see http://json-schema.org/understanding-json-schema/.',
        }
      );

      centralizedMetricsTableSchemaParameter.overrideLogicalId(
        'centralizedMetricsTableSchema'
      );
      this.paramLabels[centralizedMetricsTableSchemaParameter.logicalId] = {
        default: 'Centralized Metrics Table Schema',
      };
    }

    this.paramGroups.push({
      Label: { default: 'Destination settings' },
      Parameters: [
        centralizedBucketNameParameter.logicalId,
        centralizedBucketPrefixParameter.logicalId,
        centralizedTableNameParameter.logicalId,
        enrichmentPluginsParameter?.logicalId,
        centralizedTableSchemaParameter?.logicalId,
        centralizedMetricsTableNameParameter?.logicalId,
        centralizedMetricsTableSchemaParameter?.logicalId,
      ].filter((item) => item !== undefined),
    });

    // Schedule Settings
    const logProcessorSchedule = new CfnParameter(
      this,
      'logProcessorSchedule',
      {
        type: 'String',
        default: 'rate(5 minutes)',
        minLength: 6,
        description:
          'The expression that defines when the LogProcessor runs, default: rate(5 minutes). For more information and examples, see https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html',
      }
    );

    logProcessorSchedule.overrideLogicalId('logProcessorSchedule');
    this.paramLabels[logProcessorSchedule.logicalId] = {
      default: 'LogProcessor Schedule Expression',
    };

    const logMergerSchedule = new CfnParameter(this, 'logMergerSchedule', {
      type: 'String',
      default: 'cron(0 1 * * ? *)',
      minLength: 6,
      description:
        'The expression that defines when the LogMerger runs, default: cron(0 1 * * ? *). For more information and examples, see https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html',
    });

    logMergerSchedule.overrideLogicalId('logMergerSchedule');
    this.paramLabels[logMergerSchedule.logicalId] = {
      default: 'LogMerger Schedule Expression',
    };

    const logArchiveSchedule = new CfnParameter(this, 'logArchiveSchedule', {
      type: 'String',
      default: 'cron(0 2 * * ? *)',
      minLength: 6,
      description:
        'The expression that defines when the logArchive runs, default: cron(0 2 * * ? *). For more information and examples, see https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html',
    });

    logArchiveSchedule.overrideLogicalId('logArchiveSchedule');
    this.paramLabels[logArchiveSchedule.logicalId] = {
      default: 'LogArchive Schedule Expression',
    };

    const logMergerAgeParameter = new CfnParameter(this, 'logMergerAge', {
      type: 'Number',
      default: '7',
      minValue: 1,
      description:
        'The number of days to merge objects in centralized bucket, default: 7.',
    });

    logMergerAgeParameter.overrideLogicalId('logMergerAge');
    this.paramLabels[logMergerAgeParameter.logicalId] = {
      default: 'Age to Merge',
    };

    const logArchiveAgeParameter = new CfnParameter(this, 'logArchiveAge', {
      type: 'Number',
      default: '30',
      minValue: 1,
      description:
        'The number of days to archive objects in centralized bucket, default: 30.',
    });

    logArchiveAgeParameter.overrideLogicalId('logArchiveAge');
    this.paramLabels[logArchiveAgeParameter.logicalId] = {
      default: 'Age to Archive',
    };

    this.paramGroups.push({
      Label: { default: 'Scheduler settings' },
      Parameters: [
        logProcessorSchedule.logicalId,
        logMergerSchedule.logicalId,
        logArchiveSchedule.logicalId,
        logMergerAgeParameter.logicalId,
        logArchiveAgeParameter.logicalId,
      ],
    });

    // Notification Settings
    const notificationServiceParameter = new CfnParameter(
      this,
      'notificationService',
      {
        type: 'String',
        default: 'SNS',
        allowedValues: ['SNS', 'SES'],
        description: 'Choose which service to use for notifications.',
      }
    );

    notificationServiceParameter.overrideLogicalId('notificationService');
    this.paramLabels[notificationServiceParameter.logicalId] = {
      default: 'Notification Service',
    };

    const recipientsParameter = new CfnParameter(this, 'recipients', {
      type: 'String',
      default: '',
      description: `If the notification service is SNS, enter arn of the topic, if the notification service is SES, enter the multiple email addresses using a "," separator.`,
    });

    recipientsParameter.overrideLogicalId('recipients');
    this.paramLabels[recipientsParameter.logicalId] = { default: 'Recipients' };

    this.paramGroups.push({
      Label: { default: 'Notification settings' },
      Parameters: [
        notificationServiceParameter.logicalId,
        recipientsParameter.logicalId,
      ],
    });

    // Dashboards Settings
    const importDashboardsParameter = new CfnParameter(
      this,
      'importDashboards',
      {
        type: 'String',
        default: 'false',
        allowedValues: ['true', 'false'],
        description: 'Whether to create dashboards in grafana, default: false.',
      }
    );

    importDashboardsParameter.overrideLogicalId('importDashboards');
    this.paramLabels[importDashboardsParameter.logicalId] = {
      default: 'Import Dashboards',
    };

    const grafanaUrlParameter = new CfnParameter(this, 'grafanaUrl', {
      type: 'String',
      default: '',
      description: "Grafana's http access address. e.g. https://{host}:{port}.",
    });

    grafanaUrlParameter.overrideLogicalId('grafanaUrl');
    this.paramLabels[grafanaUrlParameter.logicalId] = {
      default: 'Grafana URL',
    };

    const grafanaTokenParameter = new CfnParameter(this, 'grafanaToken', {
      type: 'String',
      default: '',
      noEcho: true,
      description:
        'Service account token created in Grafana. e.g. glsa_oSS1v9Hs3A3ho67uuLuq4VbzZyy.',
    });

    grafanaTokenParameter.overrideLogicalId('grafanaToken');
    this.paramLabels[grafanaTokenParameter.logicalId] = {
      default: 'Grafana Service Account Token',
    };

    this.paramGroups.push({
      Label: { default: 'Dashboards settings' },
      Parameters: [
        importDashboardsParameter.logicalId,
        grafanaUrlParameter.logicalId,
        grafanaTokenParameter.logicalId,
      ],
    });

    templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: this.paramGroups,
        ParameterLabels: this.paramLabels,
      },
    };

    // init parameter
    this.sourceType = sourceType;
    this.pipelineId = pipelineIdParameter.valueAsString;
    this.stagingBucketPrefix = stagingBucketPrefixParameter.valueAsString;
    this.sourceSchema = sourceSchemaParameter?.valueAsString ?? '{}';
    this.sourceDataFormat = sourceDataFormatParameter?.valueAsString ?? 'json';
    this.sourceTableProperties =
      sourceTablePropertiesParameter?.valueAsString ?? '{}';
    this.sourceSerializationProperties =
      sourceSerializationPropertiesParameter?.valueAsString ?? '{}';
    this.centralizedTableName = centralizedTableNameParameter.valueAsString;
    this.centralizedBucketName = centralizedBucketNameParameter.valueAsString;
    this.centralizedBucketPrefix =
      centralizedBucketPrefixParameter.valueAsString;
    this.centralizedTableSchema =
      centralizedTableSchemaParameter?.valueAsString ?? '{}';
    this.centralizedMetricsTableName =
      centralizedMetricsTableNameParameter?.valueAsString ?? '';
    this.centralizedMetricsTableSchema =
      centralizedMetricsTableSchemaParameter?.valueAsString ?? '{}';
    this.enrichmentPlugins = enrichmentPluginsParameter?.valueAsString ?? '';
    this.logProcessorSchedule = logProcessorSchedule.valueAsString;
    this.logMergerSchedule = logMergerSchedule.valueAsString;
    this.logArchiveSchedule = logArchiveSchedule.valueAsString;
    this.logMergerAge = logMergerAgeParameter.valueAsNumber;
    this.logArchiveAge = logArchiveAgeParameter.valueAsNumber;
    this.notificationService = notificationServiceParameter.valueAsString;
    this.recipients = recipientsParameter.valueAsString;
    this.importDashboards = importDashboardsParameter.valueAsString;
    this.grafanaUrl = grafanaUrlParameter.valueAsString;
    this.grafanaToken = grafanaTokenParameter.valueAsString;
  }
}
