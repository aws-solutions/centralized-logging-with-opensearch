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

/**
 * This SenderSelector function will be triggered by an S3 event and will find a specific lambda Sender to process the log.
 */
import AWS = require('aws-sdk');
import { sendRDS } from '../rdsLog/index'
import { sendLambda } from '../lambdaLog/index'

const handler = async function (event: any, context: any) {
    const endpoint = process.env.ENDPOINT;
    const workType = process.env.LOG_TYPE;
    const logGroupName = process.env.LOG_GROUP_NAME;

    var result = {
        LogGroupName: logGroupName,
        WoekerType: 'UNKNOWN'
    };
    switch (workType) {
        case 'RDS': {
            result.WoekerType = 'RDS';
            await sendRDS(event.Records, endpoint, context);
            return { "Payload": result };
        }
        case 'Lambda': {
            result.WoekerType = 'Lambda';
            await sendLambda(event.Records, endpoint, context);
            return { "Payload": result };
        }
        default:
            console.log("Cannot find the specific lambda worker!");
            return { "Payload": result };
    }
};

export { handler }