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
import { MetricSourceType } from "../common/cwl-metric-stack";
import {
    aws_lambda as lambda,
} from "aws-cdk-lib";
export interface S3toOpenSearchStackProps {


    /**
     * Log Type
     *
     * @default - None.
     */
    readonly logType: string;
    readonly logBucketName: string;
    readonly logBucketPrefix: string;
    readonly logBucketSuffix?: string;

    /**
     * The Account Id of log source
     * @default - None.
     */
    readonly logSourceAccountId: string;
    /**
     * The region of log source
     * @default - None.
     */
    readonly logSourceRegion: string;
    /**
     * The assume role of log source account
     * @default - None.
     */
    readonly logSourceAccountAssumeRole: string;
    /**
     * Default KMS-CMK Arn
     *
     * @default - None.
     */
    readonly defaultCmkArn?: string;
    
    readonly solutionId: string;
    readonly stackPrefix: string;
    readonly metricSourceType?: MetricSourceType;
    readonly enableConfigJsonParam?: boolean;
    readonly logProcessorFn: lambda.Function;
}