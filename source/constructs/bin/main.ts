// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
import { CfnGuardSuppressResourceList } from '../lib/util/add-cfn-guard-suppression';

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
const cfnGuardSuppressionList = new CfnGuardSuppressResourceList({
  "AWS::Lambda::Function": [
    "LAMBDA_INSIDE_VPC",            // Not a valid use case for Lambda's to be deployed inside a VPC
    "LAMBDA_CONCURRENCY_CHECK"      // Lambda ReservedConcurrentExecutions not needed
  ]
});

function stackSuppressions(
  stacks: Stack[],
  suppressions: NagPackSuppression[]
) {
  stacks.forEach((s) => {  
      NagSuppressions.addStackSuppressions(s, suppressions, true)
      Aspects.of(s).add(cfnGuardSuppressionList);
    }
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

const bufferStackList : Stack[] = [
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
  new AppPipelineStack(app, 'AppLog', {
    buffer: 'None',
    tag: 'aos',
    ...baseProps,
  }),
  new S3SourceStack(app, 'S3SourceStack', { tag: 's3s', ...baseProps }),
  new CrossAccount(app, 'CrossAccount', { ...baseProps }),
];

stackSuppressions(
  bufferStackList,
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

// Explicit stream and CW Alarm names required due to code references.
bufferStackList.forEach((stack: Stack) => {
  Aspects.of(stack).add(new CfnGuardSuppressResourceList({
    "AWS::CloudWatch::Alarm": ["CFN_NO_EXPLICIT_RESOURCE_NAMES"],
    "AWS::Kinesis::Stream": ["CFN_NO_EXPLICIT_RESOURCE_NAMES"]
  }))
});



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

const cfn_nag_template = [
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
];

const microBatchStacksWithSpecialSupressions = [
  new MicroBatchMainStack(app, 'MicroBatch', {
    stackPrefix: process.env.STACK_PREFIX,
    ...baseProps,
  }),
  new MicroBatchMainStack(
    app,
    'MicroBatchFromExistingVPC',
    {
      stackPrefix: process.env.STACK_PREFIX,
      existingVPC: true,
      ...baseProps,
    }
  )
]

microBatchStacksWithSpecialSupressions.forEach((stack) => {
  // Add cfn-nag supressions
  NagSuppressions.addResourceSuppressions(
    stack,
    [
      ...cfn_nag_template,
      { id: 'AwsSolutions-SF2', reason: 'we do not need xray' },
      { id: 'AwsSolutions-S1', reason: 'these buckets do not need access log' },
      { id: 'AwsSolutions-S10', reason: 'these buckets do not need SSL' }
    ],
    true
  );

  // Add App tag
  Tags.of(stack).add('Application', `${solutionName}`);

  // Add Cfn-guard rule supression
  Aspects.of(stack).add(cfnGuardSuppressionList);
})

const microBatchStacks = [
  new MicroBatchLogIngestionStack(
    app,
    'MicroBatchLogIngestion',
    {
      ...baseProps,
    }
  ),
  new MicroBatchAwsServicesWafPipelineStack(
    app,
    'MicroBatchAwsServicesWafPipeline',
    {
      ...baseProps,
    }
  ),
  new MicroBatchAwsServicesAlbPipelineStack(
    app,
    'MicroBatchAwsServicesAlbPipeline',
    {
      ...baseProps,
    }
  ),
  new MicroBatchAwsServicesCloudFrontPipelineStack(
    app,
    'MicroBatchAwsServicesCloudFrontPipeline',
    {
      ...baseProps,
    }
  ),
  new MicroBatchAwsServicesCloudTrailPipelineStack(
    app,
    'MicroBatchAwsServicesCloudTrailPipeline',
    {
      ...baseProps,
    }
  ),
  new MicroBatchAwsServicesVpcFlowPipelineStack(
    app,
    'MicroBatchAwsServicesVpcFlowPipeline',
    {
      ...baseProps,
    }
  ),
  new MicroBatchAwsServicesRDSPipelineStack(
    app,
    'MicroBatchAwsServicesRDSPipeline',
    {
      ...baseProps,
    }
  ),
  new MicroBatchAwsServicesS3PipelineStack(
    app,
    'MicroBatchAwsServicesS3Pipeline',
    {
      ...baseProps,
    }
  ),
  new MicroBatchAwsServicesSESPipelineStack(
    app,
    'MicroBatchAwsServicesSESPipeline',
    {
      ...baseProps,
    }
  ),
  new MicroBatchApplicationFluentBitPipelineStack(
    app,
    'MicroBatchApplicationFluentBitPipeline',
    {
      ...baseProps,
    }
  ),
  new MicroBatchApplicationS3PipelineStack(
    app,
    'MicroBatchApplicationS3Pipeline',
    {
      ...baseProps,
    }
  )
];

microBatchStacks.forEach((stack) => {
  // Add cfn-nag supressions
  NagSuppressions.addResourceSuppressions(
    stack,
    cfn_nag_template,
    true
  );
  
  // Add App tag
  Tags.of(stack).add('Application', `${solutionName}`);

  // Add Cfn-guard rule supression
  Aspects.of(stack).add(cfnGuardSuppressionList);
});


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
