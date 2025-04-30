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

import {
  App,
  Aspects,
  CfnCondition,
  Fn,
  IAspect,
  Stack,
  Tags,
} from 'aws-cdk-lib';
import { CfnFunction, Function } from 'aws-cdk-lib/aws-lambda';
import {
  AwsSolutionsChecks,
  NagPackSuppression,
  NagSuppressions,
} from 'cdk-nag';
import { IConstruct } from 'constructs';
import 'source-map-support/register';
import { MainStack } from '../lib/main-stack';
import { MicroBatchMainStack } from '../lib/microbatch/main/microbatch-main-stack';
import { MicroBatchApplicationFluentBitPipelineStack } from '../lib/microbatch/pipeline/application-fluent-bit-stack';
import { MicroBatchApplicationS3PipelineStack } from '../lib/microbatch/pipeline/application-s3-stack';
import { MicroBatchAwsServicesAlbPipelineStack } from '../lib/microbatch/pipeline/aws-services-alb-stack';
import { MicroBatchAwsServicesCloudFrontPipelineStack } from '../lib/microbatch/pipeline/aws-services-cloudfront-stack';
import { MicroBatchAwsServicesCloudTrailPipelineStack } from '../lib/microbatch/pipeline/aws-services-cloudtrail-stack';
import { MicroBatchAwsServicesRDSPipelineStack } from '../lib/microbatch/pipeline/aws-services-rds-stack';
import { MicroBatchAwsServicesS3PipelineStack } from '../lib/microbatch/pipeline/aws-services-s3-stack';
import { MicroBatchAwsServicesSESPipelineStack } from '../lib/microbatch/pipeline/aws-services-ses-stack';
import { MicroBatchAwsServicesVpcFlowPipelineStack } from '../lib/microbatch/pipeline/aws-services-vpcflow-stack';
import { MicroBatchAwsServicesWafPipelineStack } from '../lib/microbatch/pipeline/aws-services-waf-stack';
import { MicroBatchLogIngestionStack } from '../lib/microbatch/pipeline/init-log-ingestion';
import { AlarmForOpenSearchStack } from '../lib/opensearch/alarm-for-opensearch-stack';
import { NginxForOpenSearchStack } from '../lib/opensearch/nginx-for-opensearch-stack';
import { AppPipelineStack } from '../lib/pipeline/application/app-log-pipeline-stack';
import { S3SourceStack } from '../lib/pipeline/application/s3-source-stack';
import { SyslogtoECSStack } from '../lib/pipeline/application/syslog-to-ecs-stack';
import { CloudFrontRealtimeLogStack } from '../lib/pipeline/service/cloudfront-realtime-log-stack';
import { CloudWatchLogStack } from '../lib/pipeline/service/cloudwatch-log-stack';
import { ServiceLogPipelineStack } from '../lib/pipeline/service/service-log-pipeline-stack';
import { CrossAccount } from '../lib/subaccount/cross-account-stack';

process.env.STACK_PREFIX = process.env.STACK_PREFIX || 'CL';

const app = new App();

const solutionName = 'CentralizedLoggingWithOpenSearch';
const solutionDesc = 'Centralized Logging with OpenSearch';
const solutionId = 'SO8025';
const baseProps = {
  solutionName: solutionName,
  solutionDesc: solutionDesc,
  solutionId: solutionId,
};

function stackSuppressions(
  stacks: Stack[],
  suppressions: NagPackSuppression[]
) {
  stacks.forEach((s) =>
    NagSuppressions.addStackSuppressions(s, suppressions, true)
  );
}

stackSuppressions(
  [
    new MainStack(app, 'CentralizedLogging', { ...baseProps }),
    new MainStack(app, 'CentralizedLoggingFromExistingVPC', {
      existingVpc: true,
      ...baseProps,
    }),
    new MainStack(app, 'CentralizedLoggingWithOIDC', {
      authType: 'OPENID_CONNECT',
      ...baseProps,
    }),
    new MainStack(app, 'CentralizedLoggingFromExistingVPCWithOIDC', {
      authType: 'OPENID_CONNECT',
      existingVpc: true,
      ...baseProps,
    }),
  ],
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'some policies need to get dynamic resources',
    },
    {
      id: 'AwsSolutions-IAM4',
      reason: 'these policies is used by CDK Customer Resource lambda',
    },
    { id: 'AwsSolutions-SF2', reason: 'we do not need xray' },
    { id: 'AwsSolutions-S1', reason: 'these buckets do not need access log' },
    { id: 'AwsSolutions-S10', reason: 'these buckets do not need SSL' },
    {
      id: 'AwsSolutions-L1',
      reason: 'not applicable to use the latest lambda runtime version',
    },
  ]
);

stackSuppressions(
  [
    new ServiceLogPipelineStack(app, 'S3AccessLog', {
      logType: 'S3',
      ...baseProps,
    }),
    new ServiceLogPipelineStack(app, 'CloudTrailLog', {
      logType: 'CloudTrail',
      ...baseProps,
    }),
    new ServiceLogPipelineStack(app, 'CloudTrailLogOSIProcessor', {
      enableOSIProcessor: 'true',
      logType: 'CloudTrail',
      tag: 'ctlosi',
      ...baseProps,
    }),
    new ServiceLogPipelineStack(app, 'CloudFrontLog', {
      logType: 'CloudFront',
      ...baseProps,
    }),
    new ServiceLogPipelineStack(app, 'RDSLog', {
      logType: 'RDS',
      ...baseProps,
    }),
    new ServiceLogPipelineStack(app, 'LambdaLog', {
      logType: 'Lambda',
      ...baseProps,
    }),
    new ServiceLogPipelineStack(app, 'ELBLog', {
      logType: 'ELB',
      ...baseProps,
    }),
    new ServiceLogPipelineStack(app, 'ELBLogOSIProcessor', {
      enableOSIProcessor: 'true',
      logType: 'ELB',
      tag: 'elbosi',
      ...baseProps,
    }),
    new ServiceLogPipelineStack(app, 'WAFLog', {
      logType: 'WAF',
      ...baseProps,
    }),
    new ServiceLogPipelineStack(app, 'WAFLogOSIProcessor', {
      enableOSIProcessor: 'true',
      logType: 'WAF',
      tag: 'wafosi',
      ...baseProps,
    }),
    new ServiceLogPipelineStack(app, 'VPCFlowLog', {
      logType: 'VPCFlow',
      tag: 'vpc',
      ...baseProps,
    }),
    new ServiceLogPipelineStack(app, 'VPCFlowLogOSIProcessor', {
      enableOSIProcessor: 'true',
      logType: 'VPCFlow',
      tag: 'vpcosi',
      ...baseProps,
    }),
    new ServiceLogPipelineStack(app, 'ConfigLog', {
      logType: 'Config',
      tag: 'cfg',
      ...baseProps,
    }),
    new ServiceLogPipelineStack(app, 'WAFSampledLog', {
      logType: 'WAFSampled',
      tag: 'wfs',
      ...baseProps,
    }),
  ],
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'The managed policy needs to use any resources.',
    },
    {
      id: 'AwsSolutions-IAM4',
      reason:
        'The BucketNotificationsHandler lambda is an internal CDK lambda needed to apply bucket notification configurations.',
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'the lambda 3.9 runtime we use is the latest version',
    },
  ]
);

stackSuppressions(
  [new NginxForOpenSearchStack(app, 'NginxForOpenSearch', { ...baseProps })],
  [
    {
      id: 'AwsSolutions-EC23',
      reason: 'will replace 0.0.0.0/0 or ::/0 for inbound access in future',
    },
  ]
);

const alarmForOpenSearch = new AlarmForOpenSearchStack(
  app,
  'AlarmForOpenSearch',
  { ...baseProps }
);

stackSuppressions(
  [
    // Note: A new tag SO8025-kds is used to replace the old SO8025-app-pipeline
    new AppPipelineStack(app, 'AppLogKDSBuffer', {
      buffer: 'KDS',
      enableAutoScaling: true,
      ...baseProps,
    }),
    new AppPipelineStack(app, 'AppLogKDSBufferNoAutoScaling', {
      buffer: 'KDS',
      enableAutoScaling: false,
      ...baseProps,
    }),
    new AppPipelineStack(app, 'AppLogS3Buffer', {
      buffer: 'S3',
      tag: 's3b',
      ...baseProps,
    }),
    new AppPipelineStack(app, 'AppLogS3BufferOSIProcessor', {
      buffer: 'S3',
      enableOSIProcessor: 'true',
      tag: 's3bosi',
      ...baseProps,
    }),
    new AppPipelineStack(app, 'AppLogMSKBuffer', {
      buffer: 'MSK',
      ...baseProps,
    }),

    new CloudFrontRealtimeLogStack(app, 'CloudFrontRealtimeLogKDSBuffer', {
      enableAutoScaling: true,
      ...baseProps,
    }),
    new CloudFrontRealtimeLogStack(
      app,
      'CloudFrontRealtimeLogKDSBufferNoAutoScaling',
      {
        enableAutoScaling: false,
        ...baseProps,
      }
    ),

    new CloudWatchLogStack(app, 'CloudWatchLogKDSBuffer', {
      enableAutoScaling: true,
      ...baseProps,
    }),

    new CloudWatchLogStack(app, 'CloudWatchLogKDSBufferNoAutoScaling', {
      enableAutoScaling: false,
      ...baseProps,
    }),

    // The existing OpenSearch Admin Stack
    new AppPipelineStack(app, 'AppLog', {
      buffer: 'None',
      tag: 'aos',
      ...baseProps,
    }),
    new S3SourceStack(app, 'S3SourceStack', { tag: 's3s', ...baseProps }),
    new CrossAccount(app, 'CrossAccount', { ...baseProps }),
  ],
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'The managed policy needs to use any resources.',
    },
    {
      id: 'AwsSolutions-IAM4',
      reason: 'Code of CDK custom resource, can not be modified',
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'the lambda 3.9 runtime we use is the latest version',
    },
    {
      id: 'AwsSolutions-ECS2',
      reason:
        'The ECS Task Definition includes a container definition that directly specifies environment variables.',
    },
  ]
);

stackSuppressions(
  [new SyslogtoECSStack(app, 'SyslogtoECSStack', { ...baseProps })],
  [
    {
      id: 'AwsSolutions-ECS2',
      reason: 'We need to create a dynamic ECS Service',
    },
    {
      id: 'AwsSolutions-IAM5',
      reason: 'The managed policy needs to use any resources.',
    },
  ]
);

Aspects.of(app).add(new AwsSolutionsChecks());

// Athena version

const MicroBatch = new MicroBatchMainStack(app, 'MicroBatch', {
  stackPrefix: process.env.STACK_PREFIX,
  ...baseProps,
});

NagSuppressions.addResourceSuppressions(
  MicroBatch,
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'some policies need to get dynamic resources',
    },
    {
      id: 'AwsSolutions-IAM4',
      reason: 'these policies is used by CDK Customer Resource lambda',
    },
    { id: 'AwsSolutions-SF2', reason: 'we do not need xray' },
    { id: 'AwsSolutions-S1', reason: 'these buckets do not need access log' },
    { id: 'AwsSolutions-S10', reason: 'these buckets do not need SSL' },
    {
      id: 'AwsSolutions-L1',
      reason: 'not applicable to use the latest lambda runtime version',
    },
  ],
  true
);

const MicroBatchFromExistingVPC = new MicroBatchMainStack(
  app,
  'MicroBatchFromExistingVPC',
  {
    stackPrefix: process.env.STACK_PREFIX,
    existingVPC: true,
    ...baseProps,
  }
);

NagSuppressions.addResourceSuppressions(
  MicroBatchFromExistingVPC,
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'some policies need to get dynamic resources',
    },
    {
      id: 'AwsSolutions-IAM4',
      reason: 'these policies is used by CDK Customer Resource lambda',
    },
    { id: 'AwsSolutions-SF2', reason: 'we do not need xray' },
    { id: 'AwsSolutions-S1', reason: 'these buckets do not need access log' },
    { id: 'AwsSolutions-S10', reason: 'these buckets do not need SSL' },
    {
      id: 'AwsSolutions-L1',
      reason: 'not applicable to use the latest lambda runtime version',
    },
  ],
  true
);

Tags.of(MicroBatch).add('Application', `${solutionName}`);
Tags.of(MicroBatchFromExistingVPC).add('Application', `${solutionName}`);

const MicroBatchLogIngestion = new MicroBatchLogIngestionStack(
  app,
  'MicroBatchLogIngestion',
  {
    ...baseProps,
  }
);

NagSuppressions.addResourceSuppressions(
  MicroBatchLogIngestion,
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'some policies need to get dynamic resources',
    },
    {
      id: 'AwsSolutions-IAM4',
      reason: 'these policies is used by CDK Customer Resource lambda',
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'not applicable to use the latest lambda runtime version',
    },
  ],
  true
);

Tags.of(MicroBatchLogIngestion).add('Application', `${solutionName}`);

const MicroBatchAwsServicesWafPipeline =
  new MicroBatchAwsServicesWafPipelineStack(
    app,
    'MicroBatchAwsServicesWafPipeline',
    {
      ...baseProps,
    }
  );

NagSuppressions.addResourceSuppressions(
  MicroBatchAwsServicesWafPipeline,
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'some policies need to get dynamic resources',
    },
    {
      id: 'AwsSolutions-IAM4',
      reason: 'these policies is used by CDK Customer Resource lambda',
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'not applicable to use the latest lambda runtime version',
    },
  ],
  true
);

Tags.of(MicroBatchAwsServicesWafPipeline).add('Application', `${solutionName}`);

const MicroBatchAwsServicesAlbPipeline =
  new MicroBatchAwsServicesAlbPipelineStack(
    app,
    'MicroBatchAwsServicesAlbPipeline',
    {
      ...baseProps,
    }
  );

NagSuppressions.addResourceSuppressions(
  MicroBatchAwsServicesAlbPipeline,
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'some policies need to get dynamic resources',
    },
    {
      id: 'AwsSolutions-IAM4',
      reason: 'these policies is used by CDK Customer Resource lambda',
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'not applicable to use the latest lambda runtime version',
    },
  ],
  true
);

Tags.of(MicroBatchAwsServicesAlbPipeline).add('Application', `${solutionName}`);

const MicroBatchAwsServicesCloudFrontPipeline =
  new MicroBatchAwsServicesCloudFrontPipelineStack(
    app,
    'MicroBatchAwsServicesCloudFrontPipeline',
    {
      ...baseProps,
    }
  );

NagSuppressions.addResourceSuppressions(
  MicroBatchAwsServicesCloudFrontPipeline,
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'some policies need to get dynamic resources',
    },
    {
      id: 'AwsSolutions-IAM4',
      reason: 'these policies is used by CDK Customer Resource lambda',
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'not applicable to use the latest lambda runtime version',
    },
  ],
  true
);

Tags.of(MicroBatchAwsServicesCloudFrontPipeline).add(
  'Application',
  `${solutionName}`
);

const MicroBatchAwsServicesCloudTrailPipeline =
  new MicroBatchAwsServicesCloudTrailPipelineStack(
    app,
    'MicroBatchAwsServicesCloudTrailPipeline',
    {
      ...baseProps,
    }
  );

NagSuppressions.addResourceSuppressions(
  MicroBatchAwsServicesCloudTrailPipeline,
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'some policies need to get dynamic resources',
    },
    {
      id: 'AwsSolutions-IAM4',
      reason: 'these policies is used by CDK Customer Resource lambda',
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'not applicable to use the latest lambda runtime version',
    },
  ],
  true
);

Tags.of(MicroBatchAwsServicesCloudTrailPipeline).add(
  'Application',
  `${solutionName}`
);

const MicroBatchAwsServicesVpcFlowPipeline =
  new MicroBatchAwsServicesVpcFlowPipelineStack(
    app,
    'MicroBatchAwsServicesVpcFlowPipeline',
    {
      ...baseProps,
    }
  );

NagSuppressions.addResourceSuppressions(
  MicroBatchAwsServicesVpcFlowPipeline,
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'some policies need to get dynamic resources',
    },
    {
      id: 'AwsSolutions-IAM4',
      reason: 'these policies is used by CDK Customer Resource lambda',
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'not applicable to use the latest lambda runtime version',
    },
  ],
  true
);

Tags.of(MicroBatchAwsServicesVpcFlowPipeline).add(
  'Application',
  `${solutionName}`
);

const MicroBatchAwsServicesRDSPipeline =
  new MicroBatchAwsServicesRDSPipelineStack(
    app,
    'MicroBatchAwsServicesRDSPipeline',
    {
      ...baseProps,
    }
  );

NagSuppressions.addResourceSuppressions(
  MicroBatchAwsServicesRDSPipeline,
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'some policies need to get dynamic resources',
    },
    {
      id: 'AwsSolutions-IAM4',
      reason: 'these policies is used by CDK Customer Resource lambda',
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'not applicable to use the latest lambda runtime version',
    },
  ],
  true
);

Tags.of(MicroBatchAwsServicesRDSPipeline).add('Application', `${solutionName}`);

const MicroBatchAwsServicesS3Pipeline =
  new MicroBatchAwsServicesS3PipelineStack(
    app,
    'MicroBatchAwsServicesS3Pipeline',
    {
      ...baseProps,
    }
  );

NagSuppressions.addResourceSuppressions(
  MicroBatchAwsServicesS3Pipeline,
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'some policies need to get dynamic resources',
    },
    {
      id: 'AwsSolutions-IAM4',
      reason: 'these policies is used by CDK Customer Resource lambda',
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'not applicable to use the latest lambda runtime version',
    },
  ],
  true
);

Tags.of(MicroBatchAwsServicesS3Pipeline).add('Application', `${solutionName}`);

const MicroBatchAwsServicesSESPipeline =
  new MicroBatchAwsServicesSESPipelineStack(
    app,
    'MicroBatchAwsServicesSESPipeline',
    {
      ...baseProps,
    }
  );

NagSuppressions.addResourceSuppressions(
  MicroBatchAwsServicesSESPipeline,
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'some policies need to get dynamic resources',
    },
    {
      id: 'AwsSolutions-IAM4',
      reason: 'these policies is used by CDK Customer Resource lambda',
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'not applicable to use the latest lambda runtime version',
    },
  ],
  true
);

Tags.of(MicroBatchAwsServicesSESPipeline).add('Application', `${solutionName}`);

const MicroBatchApplicationFluentBitPipeline =
  new MicroBatchApplicationFluentBitPipelineStack(
    app,
    'MicroBatchApplicationFluentBitPipeline',
    {
      ...baseProps,
    }
  );

NagSuppressions.addResourceSuppressions(
  MicroBatchApplicationFluentBitPipeline,
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'some policies need to get dynamic resources',
    },
    {
      id: 'AwsSolutions-IAM4',
      reason: 'these policies is used by CDK Customer Resource lambda',
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'not applicable to use the latest lambda runtime version',
    },
  ],
  true
);

Tags.of(MicroBatchApplicationFluentBitPipeline).add(
  'Application',
  `${solutionName}`
);

const MicroBatchApplicationS3Pipeline =
  new MicroBatchApplicationS3PipelineStack(
    app,
    'MicroBatchApplicationS3Pipeline',
    {
      ...baseProps,
    }
  );

NagSuppressions.addResourceSuppressions(
  MicroBatchApplicationS3Pipeline,
  [
    {
      id: 'AwsSolutions-IAM5',
      reason: 'some policies need to get dynamic resources',
    },
    {
      id: 'AwsSolutions-IAM4',
      reason: 'these policies is used by CDK Customer Resource lambda',
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'not applicable to use the latest lambda runtime version',
    },
  ],
  true
);

Tags.of(MicroBatchApplicationS3Pipeline).add('Application', `${solutionName}`);

class CNLambdaFunctionAspect implements IAspect {
  private conditionCache: { [key: string]: CfnCondition } = {};

  public visit(node: IConstruct): void {
    if (node instanceof Function) {
      const func = node.node.defaultChild as CfnFunction;
      if (func.loggingConfig) {
        func.addPropertyOverride(
          'LoggingConfig',
          Fn.conditionIf(
            this.awsChinaCondition(Stack.of(node)).logicalId,
            Fn.ref('AWS::NoValue'),
            {
              LogFormat: (
                func.loggingConfig as CfnFunction.LoggingConfigProperty
              ).logFormat,
              ApplicationLogLevel: (
                func.loggingConfig as CfnFunction.LoggingConfigProperty
              ).applicationLogLevel,
              LogGroup: (
                func.loggingConfig as CfnFunction.LoggingConfigProperty
              ).logGroup,
              SystemLogLevel: (
                func.loggingConfig as CfnFunction.LoggingConfigProperty
              ).systemLogLevel,
            }
          )
        );
      }
    }
  }

  private awsChinaCondition(stack: Stack): CfnCondition {
    const conditionName = 'AWSCNCondition';
    // Check if the resource already exists
    const existingResource = this.conditionCache[stack.artifactId];

    if (existingResource) {
      return existingResource;
    } else {
      const awsCNCondition = new CfnCondition(stack, conditionName, {
        expression: Fn.conditionEquals('aws-cn', stack.partition),
      });
      this.conditionCache[stack.artifactId] = awsCNCondition;
      return awsCNCondition;
    }
  }
}
Aspects.of(app).add(new CNLambdaFunctionAspect());
