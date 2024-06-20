# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from utils.helpers import logger, ValidateParameters
from utils.models.meta import MetaTable
from sink.base import Status


AWS_DDB_META = MetaTable()


class Parameters(ValidateParameters):
    """This class is used to parse ,validate and store all incoming parameters.
       
       !!!Case sensitive!!! 
       
       :param parameters (dict): e.g.  {
                                            "metaName": "848be54a-ae2c-414c-9ae3-f0b3d11089ab",
                                            "source": {
                                                "type": "rds",
                                                "context": {
                                                    "DBIdentifiers": ["aurora-mysql", "aurora-postgres"], 
                                                    "LastWritten": 1704357600484,
                                                    "FilenameContains": ["audit", "slowquery", "error", "general"]
                                                    "LogFileMarker": {}, 
                                                    "LogFileMarkerExpireDays": 3,
                                                    "role": "",
                                                },
                                            },
                                            "sink": {
                                                "type": "s3",
                                                "context": {
                                                    "bucket": "logging-bucket",
                                                    "prefix": "AWSLogs/RDS/",
                                                    "role": "",
                                                },
                                            }
                                        }
    """
        
    def _required_parameter_check(self, parameters) -> None:
        """Required parameter verification, when the parameter does not exist, an exception message will be returned."""
        self._child_parameter_lookup_check(parameters, keys=('metaName',))
        
        self.meta_name = parameters['metaName']
        metadata = AWS_DDB_META.get(meta_name=self.meta_name) or {}
        context = metadata.get('context', {})
        
        self.source = self._init_name_space()
        self.source.type = parameters['source']['type']
        source_context = context.get('source', {})
        source_context.update(parameters['source']['context'])
        self.source.cls = getattr(__import__('source'), self.source.type)(context=source_context)

        self.sink = self._init_name_space()
        self.sink.type = parameters['sink']['type']
        sink_context = context.get('sink', {})
        sink_context.update(parameters['sink']['context'])
        self.sink.cls = getattr(__import__('sink'), self.sink.type)(context=sink_context)


def lambda_handler(event, _) -> Status:
    logger.info(f'Received request: {json.dumps(event)}')
    
    param = Parameters(event)

    status = param.sink.cls.process(source=param.source.cls)
    
    if status == Status.SUCCEEDED:
        logger.info(f'Sink process succeeded.')
        AWS_DDB_META.update(meta_name=param.meta_name, item={
            'context': {
                'source': param.source.cls.context, 
                'sink': param.sink.cls.context,
                }
            })
    elif status == Status.FAILED:
        logger.info(f'Sink process failed.')
    
    return status

