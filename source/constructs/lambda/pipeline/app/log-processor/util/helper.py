import io
import csv

from typing import Dict, List, Sequence


def tsv2json(s: str, fieldnames: Sequence[str]) -> List[Dict]:
    """
    Convert a tab-separated-values string to a list of dictionaries.
    """
    return list(csv.DictReader(io.StringIO(s), fieldnames=fieldnames, delimiter="\t"))


def fillna(lst: List[Dict], val=None) -> List[Dict]:
    """
    Fill missing values in a list of dictionaries.
    """
    for each in lst:
        for k, v in each.items():
            if v == "-":
                if isinstance(val, dict):
                    each[k] = val[k]
                else:
                    each[k] = val

    return lst
