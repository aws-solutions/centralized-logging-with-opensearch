# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import gzip
from pathlib import Path
from typing import Callable, Iterator, TypeVar


def stream_to_gzip(path: Path, contents: Iterator[bytes]) -> None:
    with gzip.open(path, 'w') as writer:
        for content in contents:
            writer.write(content)


def stream_from_gzip(path: Path) -> Iterator[gzip.GzipFile]:
    with gzip.open(path, 'r') as reader:
        yield reader


T = TypeVar("T")


def merge(items: Iterator, max_size: int, sizer: Callable = sys.getsizeof) -> Iterator[list]:
    """Coalesce items into chunks. Tries to maximize chunk size and not exceed max_size.

    If an item is larger than max_size, we will always exceed max_size, so make a
    best effort and place it in its own chunk.

    You can supply a custom sizer function to determine the size of an item.
    Default is len.
    """
    batch = []
    current_size = 0
    for item in items:
        contents = item.read()
        this_size = sizer(contents)
        if current_size + this_size > max_size:
            yield batch
            batch = []
            current_size = 0
        batch.append(contents)
        current_size += this_size
    if batch:
        yield batch


def stream_from_dir(directory: Path) -> Iterator[gzip.GzipFile]:
    directory = Path(directory)
    for path in directory.glob("*"):
        if os.path.isfile(path) is True:
            yield from stream_from_gzip(path)


def merge_gzip(in_directory: Path, output_path, max_size: int = 20 * 2 ** 20) -> None:
    gz_files = stream_from_dir(in_directory)
    content_groups = merge(gz_files, max_size)
    merge_contents = (b''.join(group) for group in content_groups)
    stream_to_gzip(output_path, merge_contents)
