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

        var source = buildSource(logEvent.message, logEvent.extractedFields);

        // Parse the RDS Log
        var parsedLog;
        var rdsLogType;
        if (payload.logGroup.indexOf("/audit") != -1) {
            rdsLogType = "audit"
            parsedLog = transform_audit(logEvent.message)
        } else if (payload.logGroup.indexOf("/error") != -1) {
            rdsLogType = "error"
            parsedLog = transform_error(logEvent.message)
        } else if (payload.logGroup.indexOf("/general") != -1) {
            rdsLogType = "general"
            parsedLog = transform_general(logEvent.message)
        } else if (payload.logGroup.indexOf("/slowquery") != -1) {
            rdsLogType = "slowquery"
            parsedLog = transform_slowquery(logEvent.message)
        }
        Object.assign(source, parsedLog)

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
            process.env.INDEX_PREFIX!.toLowerCase() + '-' + process.env.LOG_TYPE!.toLowerCase() + '-' + rdsLogType + '-' 
            + source["@timestamp"].substring(0, 4),    // year
            source["@timestamp"].substring(5, 7),      // month
            source["@timestamp"].substring(8, 10)      // day
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
 * @param message 
 */
function transform_audit(message: string) {
    const regex = /\'/g;
    var updated_str = message.replace(regex, '\"');

    if (updated_str.charAt(8) == ' ') {
        updated_str = updated_str.replace(' ', 'T');
    }

    var arr = updated_str.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    var parseResult;
    if (arr?.length == 9) {
        parseResult = {
            log_timestamp: s3TimeFormateChange(arr![0]),
            serverhost_ip: arr![1],
            username: arr![2],
            host: arr![3],
            connectionid: arr![4],
            queryid: arr![5],
            operation: arr![6],
            database: '',
            object: arr![7],
            retcode: arr![8],
        };
    } else {
        parseResult = {
            log_timestamp: s3TimeFormateChange(arr![0]),
            serverhost_ip: arr![1],
            username: arr![2],
            host: arr![3],
            connectionid: arr![4],
            queryid: arr![5],
            operation: arr![6],
            database: arr![7],
            object: arr![8],
            retcode: arr![9],
        };
    }
    return parseResult;
}

/**
 * @param message 
 */
 function transform_error(message: string) {
    const regex_mysql8 = /^(\d+-\d+-\d+T\d+:\d+:\d+.\d+Z)\s(\d+)\s\[(\w+)\]\s\[(.*?)\]\s\[(.*?)\]\s(.*)/
    const regex_mysql5 = /^(\d+-\d+-\d+T\d+:\d+:\d+.\d+Z)\s(\d+)\s\[(\w+)\]\s(.*)/
    var parseResult = {}
    
    // Check the log format
    var strAry = message.match(regex_mysql5);
    if(strAry != null){
        parseResult = {
            log_timestamp: strAry[1],
            thread: strAry[2],
            label: strAry[3],
            log_detail: strAry[4],
        };
    }
    
    strAry = message.match(regex_mysql8);
    if(strAry != null){
        parseResult = {
            log_timestamp: strAry[1],
            thread: strAry[2],
            label: strAry[3],
            err_code: strAry[4],
            sub_system: strAry[5],
            log_detail: strAry[6],
        };
    }    
    return parseResult;
}

/**
 * @param message 
 */
function transform_general(message: string) {
    var regex = /\s+|,|\t\s/;
    var strAry = message.split(regex);

    const index_1 = message.search(strAry[2])

    const index_2 = index_1 + strAry[2].length + 1
    const query_detail = message.substring(index_2,)

    var parseResult = {
        log_timestamp: strAry[0],
        num: strAry[1],
        action: strAry[2],
        query_detail: query_detail,
    };
    return parseResult;
}

/**
 * @param message 
 */
function transform_slowquery(message: string) {
    const USERNAME = '(\\w*)\\[\\w*\\]';
    const HOSTNAME = '([\\w\\d\\.-]*)';
    const IP = '\\[([\\d\\.]*)\\]';
    const DIGITS_SEQUENCE = '(\\d*)';
    const DECIMAL_NUMBER = '([\\d\\.]*)';
    const TABLE_NAME = '[\\w]*';
    const delimiter = '\\s*';

    const matchers = [
        `User@Host: ${USERNAME} @ ${HOSTNAME}\\s?${IP}`,
        `Id: ${DIGITS_SEQUENCE} #`,
        `Query_time: ${DECIMAL_NUMBER}`,
        `Lock_time: ${DECIMAL_NUMBER}`,
        `Rows_sent: ${DIGITS_SEQUENCE}`,
        `Rows_examined: ${DIGITS_SEQUENCE}`,
        `(?:use )?(${TABLE_NAME})?;?`,
        `SET timestamp=${DIGITS_SEQUENCE};`,
        '(.*);'
    ];

    message = message.replace(/[\n\s]+/g, ' ')
    const pattern = new RegExp(matchers.join(delimiter));
    const match = pattern.exec(message);
    if (match == null) {
        return {}
    }

    const [, _user, _host, _ip, _id, _duration, _lock_wait, _rows_sent, _rows_examined, _table_name, _timestamp, _query] = match[Symbol.iterator]();

    var parseResult = {
        user: _user,
        host: _host,
        ip: _ip,
        id: _id,
        duration: _duration,
        lock_wait: _lock_wait,
        rows_sent: _rows_sent,
        rows_examined: _rows_examined,
        table_name: _table_name,
        timestamp: _timestamp,
        query: _query
    };
    return parseResult;
}

/**
 * 	Transfer "20210630T01:33:25" to "2021-06-30T01:33:25Z"
 * @param inputTime 
 */

function s3TimeFormateChange(inputTime: string) {
    if (inputTime == null) return null;

    var formattedDate = inputTime.substring(0, 4) + '-' + inputTime.substring(4, 6) + '-' + inputTime.substring(6, 8) + inputTime.substring(8,) + 'Z';
    return formattedDate;
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