# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import sys
from pathlib import Path
from typing import Callable, Iterator, TextIO, Text


def stream_to_text(path: Path, contents: Iterator[Text]) -> None:
    with open(path, "w") as writer:
        for content in contents:
            writer.write(content)


def stream_from_text(path: Path) -> Iterator[TextIO]:
    with path.open("r") as reader:
        yield reader


def merge(
    items: Iterator, max_size: int, sizer: Callable = sys.getsizeof
) -> Iterator[list]:
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


def stream_from_dir(directory: Path) -> Iterator[TextIO]:
    directory = Path(directory)
    for path in directory.glob("*"):
        if path.is_file() is True:
            yield from stream_from_text(path)


def merge_text(in_directory: Path, output_path, max_size: int = 20 * 2**20) -> None:
    files = stream_from_dir(in_directory)
    content_groups = merge(files, max_size)
    merge_contents = ("".join(group) for group in content_groups)
    stream_to_text(output_path, merge_contents)
