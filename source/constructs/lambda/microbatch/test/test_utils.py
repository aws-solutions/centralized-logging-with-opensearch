# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import pytest
from pathlib import Path


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_parser_bytes():
    from utils import parse_bytes
    
    with pytest.raises(ValueError):
        parse_bytes('test')
    assert parse_bytes('10B') == 10
    assert parse_bytes('10kB') == 10000
    assert parse_bytes('10MB') == 10000000
    assert parse_bytes('10GB') == 10000000000
    assert parse_bytes('10TB') == 10000000000000
    assert parse_bytes('10PB') == 10000000000000000
    assert parse_bytes('10kiB') == 10240
    assert parse_bytes('10MiB') == 10485760
    assert parse_bytes('10GiB') == 10737418240
    assert parse_bytes('10TiB') == 10995116277760
    assert parse_bytes('10PiB') == 11258999068426240
    assert parse_bytes(10000) == 10000
    assert parse_bytes("10000") == 10000
    assert parse_bytes(10000.001) == 10000
    assert parse_bytes('10 B') == 10
    assert parse_bytes('10 kB') == 10000
    assert parse_bytes('10 MB') == 10000000
    assert parse_bytes('10 GB') == 10000000000
    assert parse_bytes('10 TB') == 10000000000000
    assert parse_bytes('10 PB') == 10000000000000000
    assert parse_bytes('10 kiB') == 10240
    assert parse_bytes('10 MiB') == 10485760
    assert parse_bytes('10 GiB') == 10737418240
    assert parse_bytes('10 TiB') == 10995116277760
    assert parse_bytes('10 PiB') == 11258999068426240
    with pytest.raises(ValueError):
        assert parse_bytes('f0100')


def test_fleep():
    from utils import fleep
    
    current_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    
    supported_extensions = fleep.supported_types()
    supported_types = fleep.supported_types()
    assert 'archive' in supported_types
    assert 'database' in supported_types
    supported_extensions = fleep.supported_extensions()
    assert 'gz' in supported_extensions
    assert 'parquet' in supported_extensions
    supported_mimes = fleep.supported_mimes()
    assert 'application/gzip' in supported_mimes
    assert 'application/parquet' in supported_mimes
    
    with pytest.raises(TypeError):
        fleep.get('1234567890abcdefg')
    
    info = fleep.Info('archive', 'gz', 'application/gzip')
    assert info.type_matches('archive')
    assert info.extension_matches('gz')
    assert info.mime_matches('application/gzip')
    
    info = fleep.Info('database', 'parquet', 'application/parquet')
    assert info.type_matches('database')
    assert info.extension_matches('parquet')
    assert info.mime_matches('application/parquet')
    
    file_path = current_dir / 'data/apigateway1.gz'
    with file_path.open('rb') as fd:
        file_info = fleep.get(fd.read(128))
    assert file_info.type[0] == 'archive'
    assert file_info.extension[0] == 'gz'
    assert file_info.mime[0] == 'application/gzip'
    
    file_path = current_dir / 'data/apigateway1.parquet'
    with file_path.open('rb') as fd:
        file_info = fleep.get(fd.read(128))
    assert file_info.type[0] == 'database'
    assert file_info.extension[0] == 'parquet'
    assert file_info.mime[0] == 'application/parquet'
    

