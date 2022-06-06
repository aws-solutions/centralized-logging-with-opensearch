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


import * as zlib from 'zlib';
import * as RDSWorker from './RDSWorker';
import { httpsRequest, buildRequest } from '../../common/common'

const _region = process.env.AWS_REGION;

/**
 * Worker for sending RDS logs to OpenSearch
 * @param records 
 * @param endpoint 
 * @param context 
 * @returns 
 */
async function sendRDS(records: any, endpoint: any, context: any) {
    for (const record of records) {
        // Kinesis data is base64 encoded so decode here
        const buffer = Buffer.from(record.kinesis.data, "base64");
        let decompressed;
        try {
            decompressed = zlib.gunzipSync(buffer).toString('utf8');;
        } catch (e) {
            throw new Error("error in decompressing data");
        }

        const awslogsData = JSON.parse(decompressed);

        // CONTROL_MESSAGE are sent by CWL to check if the subscription is reachable.
        // They do not contain actual data.
        if (awslogsData.messageType === "CONTROL_MESSAGE") {
            return;
        } else if (awslogsData.messageType === "DATA_MESSAGE") {
            var openSearchBulkData = await RDSWorker.transform(awslogsData);

            var requestParams = await buildRequest(endpoint, openSearchBulkData, _region!);
            
            try {
                const cwl_index = awslogsData.logStream;
                await httpsRequest(requestParams, awslogsData, cwl_index);
                context.succeed('Success');
            } catch (err) {
                console.error('POST request failed, error:', err);
                console.log('Failed to send the log file: ', process.env.LOG_GROUP_NAME);
                context.fail(JSON.stringify(err));
            }
            context.succeed('Success');
    
        } else {
            return;
        }
    }
}

export { sendRDS }