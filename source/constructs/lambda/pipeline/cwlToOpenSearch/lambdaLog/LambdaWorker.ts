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

import { isValidJson, isNumeric } from '../../common/common'

interface ILogEvent {
    id: string;
    timestamp: number;
    message: string;
    extractedFields: any;
}

function transform(payload: any) {
    var bulkRequestBody = '';

    payload.logEvents.forEach((logEvent: ILogEvent) => {

        const source = buildSource(logEvent.message, logEvent.extractedFields);
        if ("requestParameters" in source)
            source["requestParameters"] = JSON.stringify(source["requestParameters"]);
        if ("responseElements" in source)
            source["responseElements"] = JSON.stringify(source["responseElements"]);
        if ("apiVersion" in source)
            source["apiVersion"] = "" + source["apiVersion"];
        source["@timestamp"] = new Date(1 * logEvent.timestamp).toISOString();
        source["@message"] = logEvent.message;
        source["@owner"] = payload.owner;
        source["@log_group"] = payload.logGroup;
        source["@log_stream"] = payload.logStream;

        var indexName = [
            process.env.INDEX_PREFIX!.toLowerCase() + '-' + process.env.LOG_TYPE!.toLowerCase() + '-' + source["@timestamp"].substring(0, 4),    // year
            source["@timestamp"].substring(5, 7),                                                                                              // month
            source["@timestamp"].substring(8, 10)                                                                                              // day
        ].join('.');

        //Using OpenSearch created _id.
        var action = {
            "index": {
                "_index": indexName,
            }
        };

        bulkRequestBody += [
            JSON.stringify(action),
            JSON.stringify(source),
        ].join('\n') + '\n';
    });
    return bulkRequestBody;
}

/**
 * @description building source for log events
 * @param message - log event
 * @param extractedFields - fields in the log event
 */
function buildSource(message: string, extractedFields: any) {
    if (extractedFields) {
        let source: any = {};
        for (const key in extractedFields) {
            if (Object.prototype.hasOwnProperty.call(extractedFields, key) &&
                extractedFields[key]) {
                const value = extractedFields[key];
                if (isNumeric(value)) {
                    source[key] = 1 * value;
                    continue;
                }
                const jsonSubString = extractJson(value);
                if (jsonSubString !== null) {
                    source["$" + key] = JSON.parse(jsonSubString);
                }
                source[key] = value;
            }
        }
        return source;
    }
    const jsonSubString = extractJson(message);
    if (jsonSubString !== null) {
        return JSON.parse(jsonSubString);
    }
    return {};
}

/**
 * @description extracting json from log event
 * @param {string} message - log event
 */
function extractJson(message: string) {
    const jsonStart = message.indexOf("{");
    if (jsonStart < 0) return null;
    const jsonSubString = message.substring(jsonStart);
    return isValidJson(jsonSubString) ? jsonSubString : null;
}

export { ILogEvent, transform }