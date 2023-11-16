# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
from datetime import datetime, timedelta


logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, _):
    logger.info(f'Received request: {json.dumps(event)}')
    if not isinstance(event, dict):
        raise ValueError('The event is not a dict.')
    
    interval_days = event.get('intervalDays')
    if not isinstance(interval_days, int):
        logger.info('Interval Days is not exists or is null, use default value: -30.')
        interval_days = -30

    date = event.get('date')
    if date is None:
        raise ValueError('The parameter date dose not exists.')
    
    date_format = event.get('format')
    if date_format is None:
        raise ValueError('The parameter format dose not exists.')
    
    try:
        datetime.strptime(date, date_format)
    except ValueError as e:
        raise ValueError(e)
    
    results = {'date': (datetime.strptime(date, date_format) + timedelta(days=interval_days)).strftime('%Y%m%d')}
    logger.info(f"The converted time is {date}, and the original time is {results['date']}, IntervalDays is {interval_days}.")
    return results

