# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
gist of how to merge small row groups into larger row groups.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Callable, Iterator, TypeVar

import pyarrow as pa
import pyarrow.parquet as pq


def stream_to_parquet(path: Path, tables: Iterator[pa.Table], compression: str = 'ZSTD', use_deprecated_int96_timestamps: bool = True) -> None:
    try:
        first = next(tables)
    except StopIteration:
        return
    schema = first.schema

    with pq.ParquetWriter(path, schema, compression=compression, use_deprecated_int96_timestamps=use_deprecated_int96_timestamps) as writer:
        writer.write_table(first)
        for table in tables:
            table = table.cast(schema)
            writer.write_table(table)


def stream_from_parquet(path: Path) -> Iterator[pa.Table]:
    reader = pq.ParquetFile(path)
    for batch in reader.iter_batches(batch_size=1024):
        yield pa.Table.from_batches([batch])


T = TypeVar("T")


def merge(items: Iterator[T], max_size: int, sizer: Callable[[T], int] = sys.getsizeof) -> Iterator[list[T]]:
    """Coalesce items into chunks. Tries to maximize chunk size and not exceed max_size.

    If an item is larger than max_size, we will always exceed max_size, so make a
    best effort and place it in its own chunk.

    You can supply a custom sizer function to determine the size of an item.
    Default is len.

    # >>> list(coalesce([1, 2, 11, 4, 4, 1, 2], 10, lambda x: x))
    [[1, 2], [11], [4, 4, 1], [2]]
    """
    batch = []
    current_size = 0
    for item in items:
        this_size = sizer(item)
        if current_size + this_size > max_size and batch:
            yield batch
            batch = []
            current_size = 0
        batch.append(item)
        current_size += this_size
    if batch:
        yield batch


def stream_from_dir(directory: Path) -> Iterator[pa.Table]:
    directory = Path(directory)
    for path in directory.glob("*"):
        if os.path.isfile(path) is True:
            yield from stream_from_parquet(path)


def merge_parquets(in_directory: Path, output_path, max_size: int = 2 ** 20, compression: str = 'ZSTD') -> None:
    tables = stream_from_dir(in_directory)
    # Instead of merge using number of rows as your metric, you could
    # use pa.Table.nbytes or something.
    # table_groups = merge(tables, max_size, sizer=lambda t: t.nbytes)
    table_groups = merge(tables, max_size)
    merge_tables = (pa.concat_tables(group) for group in table_groups)
    stream_to_parquet(output_path, merge_tables, compression=compression)
